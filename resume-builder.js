/* =========================================================
   JobReady SG — Resume Builder page
   Handles: dynamic Education/Experience entries, live resume
   preview (shared by both the manual builder and the AI-improved
   result), print/PDF export, file upload text extraction, and
   the AI feedback flow for the "Improve My Resume" path.
   ========================================================= */
(function () {
  var eduList = document.getElementById('rbEduList');
  var expList = document.getElementById('rbExpList');
  var preview = document.getElementById('resumePreview');
  if (!eduList || !expList || !preview) return; // not on this page

  var RESUME_FEEDBACK_WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/resume-feedback';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function addEduRow() {
    var row = document.createElement('div');
    row.className = 'entry-card';
    row.innerHTML =
      '<button type="button" class="entry-remove" aria-label="Remove this entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' +
      '<div class="form-row"><input type="text" class="form-input rb-edu-school" placeholder="School / institution"></div>' +
      '<div class="form-row"><input type="text" class="form-input rb-edu-course" placeholder="Course / diploma"></div>' +
      '<div class="form-row"><input type="text" class="form-input rb-edu-year" placeholder="Expected graduation year"></div>';
    eduList.appendChild(row);
    row.querySelector('.entry-remove').addEventListener('click', function () { row.remove(); renderPreview(); });
    row.querySelectorAll('input').forEach(function (input) { input.addEventListener('input', renderPreview); });
  }

  function addExpRow() {
    var row = document.createElement('div');
    row.className = 'entry-card';
    row.innerHTML =
      '<button type="button" class="entry-remove" aria-label="Remove this entry"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' +
      '<div class="form-row"><input type="text" class="form-input rb-exp-title" placeholder="Role / project title"></div>' +
      '<div class="form-row"><input type="text" class="form-input rb-exp-org" placeholder="Organisation"></div>' +
      '<div class="form-row"><input type="text" class="form-input rb-exp-dates" placeholder="Dates (e.g. Jan 2025 - Present)"></div>' +
      '<div class="form-row"><textarea class="form-input rb-exp-desc" rows="3" placeholder="What did you do? One point per line."></textarea></div>';
    expList.appendChild(row);
    row.querySelector('.entry-remove').addEventListener('click', function () { row.remove(); renderPreview(); });
    row.querySelectorAll('input, textarea').forEach(function (input) { input.addEventListener('input', renderPreview); });
  }

  // Data shape shared by both the manual form and the AI-improved
  // result, so both paths can render through the same function:
  // { name, email, phone, links, summary,
  //   education: [{school, course, year}],
  //   experience: [{role, org, dates, desc}], skills: [string] }

  function getFormData() {
    return {
      name: document.getElementById('rbName').value.trim(),
      email: document.getElementById('rbEmail').value.trim(),
      phone: document.getElementById('rbPhone').value.trim(),
      links: document.getElementById('rbLinks').value.trim(),
      summary: document.getElementById('rbSummary').value.trim(),
      education: [].slice.call(eduList.querySelectorAll('.entry-card')).map(function (row) {
        return {
          school: row.querySelector('.rb-edu-school').value.trim(),
          course: row.querySelector('.rb-edu-course').value.trim(),
          year: row.querySelector('.rb-edu-year').value.trim()
        };
      }),
      experience: [].slice.call(expList.querySelectorAll('.entry-card')).map(function (row) {
        return {
          role: row.querySelector('.rb-exp-title').value.trim(),
          org: row.querySelector('.rb-exp-org').value.trim(),
          dates: row.querySelector('.rb-exp-dates').value.trim(),
          desc: row.querySelector('.rb-exp-desc').value.trim()
        };
      }),
      skills: document.getElementById('rbSkills').value.trim().split(',').map(function (s) { return s.trim(); }).filter(Boolean)
    };
  }

  function renderPreviewFromData(data, targetEl) {
    var contactParts = [data.email, data.phone, data.links].filter(Boolean);

    var eduHtml = (data.education || []).map(function (e) {
      if (!e.school && !e.course) return '';
      return '<div class="rp-entry"><div class="rp-entry-head"><span>' + escapeHtml(e.course || 'Course') + '</span><span>' + escapeHtml(e.year) + '</span></div>' +
        '<div class="rp-entry-sub">' + escapeHtml(e.school) + '</div></div>';
    }).filter(Boolean).join('');

    var expHtml = (data.experience || []).map(function (e) {
      if (!e.role && !e.org) return '';
      return '<div class="rp-entry"><div class="rp-entry-head"><span>' + escapeHtml(e.role || 'Role') + '</span><span>' + escapeHtml(e.dates) + '</span></div>' +
        '<div class="rp-entry-sub">' + escapeHtml(e.org) + '</div>' +
        (e.desc ? '<div class="rp-entry-body">' + escapeHtml(e.desc) + '</div>' : '') + '</div>';
    }).filter(Boolean).join('');

    var skillsHtml = (data.skills && data.skills.length)
      ? '<div class="rp-skills">' + data.skills.map(function (s) {
          s = (s || '').trim();
          return s ? '<span class="rp-skill">' + escapeHtml(s) + '</span>' : '';
        }).filter(Boolean).join('') + '</div>'
      : '';

    var hasContent = data.name || data.email || data.phone || data.summary || eduHtml || expHtml || (data.skills && data.skills.length);

    if (!hasContent) {
      targetEl.className = 'resume-preview is-empty';
      targetEl.innerHTML = 'Fill in the form to see your resume take shape here.';
      return;
    }

    targetEl.className = 'resume-preview';
    targetEl.innerHTML =
      '<div class="rp-name">' + escapeHtml(data.name || 'Your Name') + '</div>' +
      (contactParts.length ? '<div class="rp-contact">' + contactParts.map(escapeHtml).join(' &middot; ') + '</div>' : '') +
      (data.summary ? '<div class="rp-section"><div class="rp-section-title">Summary</div><div class="rp-summary">' + escapeHtml(data.summary) + '</div></div>' : '') +
      (eduHtml ? '<div class="rp-section"><div class="rp-section-title">Education</div>' + eduHtml + '</div>' : '') +
      (expHtml ? '<div class="rp-section"><div class="rp-section-title">Experience &amp; Projects</div>' + expHtml + '</div>' : '') +
      (skillsHtml ? '<div class="rp-section"><div class="rp-section-title">Skills</div>' + skillsHtml + '</div>' : '');
  }

  function renderPreview() {
    renderPreviewFromData(getFormData(), preview);
  }

  ['rbName', 'rbEmail', 'rbPhone', 'rbLinks', 'rbSummary', 'rbSkills'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', renderPreview);
  });

  document.getElementById('rbAddEdu').addEventListener('click', function () { addEduRow(); renderPreview(); });
  document.getElementById('rbAddExp').addEventListener('click', function () { addExpRow(); renderPreview(); });

  addEduRow();
  addExpRow();
  renderPreview();

  /* ---------- path selector: gate Build From Scratch vs Improve My Resume ----------
     Only one path renders at a time. Switching paths doesn't clear
     whatever was already typed in either one - just toggles visibility,
     so going back and forth doesn't lose work. */
  var pathChoice = document.getElementById('pathChoice');
  var buildSection = document.getElementById('build');
  var improveSection = document.getElementById('improve');

  function showPath(which) {
    if (pathChoice) pathChoice.hidden = true;
    if (buildSection) buildSection.hidden = which !== 'build';
    if (improveSection) improveSection.hidden = which !== 'improve';
    var target = which === 'build' ? buildSection : improveSection;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showPathChoice() {
    if (pathChoice) pathChoice.hidden = false;
    if (buildSection) buildSection.hidden = true;
    if (improveSection) improveSection.hidden = true;
    if (pathChoice) pathChoice.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelectorAll('.path-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      showPath(card.getAttribute('data-path') === 'improve' ? 'improve' : 'build');
    });
  });

  document.querySelectorAll('[data-back-to-paths]').forEach(function (btn) {
    btn.addEventListener('click', showPathChoice);
  });

  /* ---------- Build From Scratch: step wizard ----------
     Personal Info -> Education -> Experience -> Skills -> Preview.
     Steps are shown/hidden via the .is-active class; the wizard nav
     buttons are the same markup on desktop and mobile, CSS repositions
     them into a sticky bottom bar on narrow viewports. Reaching the
     final step scrolls to the live preview instead of showing a 6th
     form step, since the preview panel already exists as its own
     element (.builder-preview-wrap). */
  var TOTAL_STEPS = 5;
  var currentStep = 1;
  var stepEls = document.querySelectorAll('.rb-step');
  var stepNumEl = document.getElementById('rbStepNum');
  var progressFill = document.getElementById('rbProgressFill');
  var stepBackBtn = document.getElementById('rbStepBack');
  var stepContinueBtn = document.getElementById('rbStepContinue');
  var builderFormEl = document.querySelector('.builder-form');
  var previewWrap = document.querySelector('.builder-preview-wrap');

  function showStep(n) {
    currentStep = n;
    stepEls.forEach(function (el) {
      el.classList.toggle('is-active', parseInt(el.getAttribute('data-step'), 10) === n);
    });
    if (stepNumEl) stepNumEl.textContent = n;
    if (progressFill) progressFill.style.width = (n / TOTAL_STEPS * 100) + '%';
    if (stepBackBtn) stepBackBtn.hidden = n === 1;
    if (stepContinueBtn) stepContinueBtn.hidden = n === TOTAL_STEPS;
    var scrollTarget = (n === TOTAL_STEPS && previewWrap) ? previewWrap : builderFormEl;
    if (scrollTarget) scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', function () { if (currentStep > 1) showStep(currentStep - 1); });
  }
  if (stepContinueBtn) {
    stepContinueBtn.addEventListener('click', function () { if (currentStep < TOTAL_STEPS) showStep(currentStep + 1); });
  }
  if (stepEls.length) showStep(1);

  /* ---------- download the resume as a real, text-based PDF ----------
     Built directly from the same structured data object that drives the
     live preview (getFormData() / normalizeImprovedResume()) - not a
     screenshot of the DOM. That matters: rendering via html2canvas would
     rasterize the page into an image, producing a PDF with no selectable
     text at all (unreadable by copy-paste or by an ATS resume parser).
     Drawing real text with jsPDF avoids that, and also means page chrome
     (logo, wizard nav, progress bar) can never leak in, since none of
     that exists in the plain data object being read from. */
  function buildResumePdf(data, filenameBase) {
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) return;
    var doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    var pageWidth = doc.internal.pageSize.getWidth();
    var pageHeight = doc.internal.pageSize.getHeight();
    var marginX = 18;
    var marginBottom = 18;
    var maxWidth = pageWidth - marginX * 2;
    var y = 20;

    function ensureSpace(neededHeight) {
      if (y + neededHeight > pageHeight - marginBottom) {
        doc.addPage();
        y = 20;
      }
    }

    function addWrapped(text, fontSize, style, lineHeight, color) {
      doc.setFont('helvetica', style || 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(color || '#1C2B45');
      doc.splitTextToSize(text, maxWidth).forEach(function (line) {
        ensureSpace(lineHeight);
        doc.text(line, marginX, y);
        y += lineHeight;
      });
    }

    function addSectionTitle(title) {
      y += 3;
      ensureSpace(9);
      doc.setDrawColor(211, 220, 213);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor('#1C2B45');
      doc.text(title.toUpperCase(), marginX, y);
      y += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor('#1C2B45');
    doc.text(data.name || 'Your Name', marginX, y);
    y += 8;

    var contactParts = [data.email, data.phone, data.links].filter(Boolean);
    if (contactParts.length) {
      addWrapped(contactParts.join('   |   '), 10, 'normal', 5, '#4A5A72');
      y += 2;
    }

    if (data.summary) {
      addSectionTitle('Summary');
      addWrapped(data.summary, 10.5, 'normal', 5.2, '#1C2B45');
    }

    var education = (data.education || []).filter(function (e) { return e.school || e.course; });
    if (education.length) {
      addSectionTitle('Education');
      education.forEach(function (e) {
        ensureSpace(6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor('#1C2B45');
        doc.text(e.course || 'Course', marginX, y);
        if (e.year) {
          doc.setFont('helvetica', 'normal');
          doc.text(e.year, pageWidth - marginX, y, { align: 'right' });
        }
        y += 5;
        if (e.school) addWrapped(e.school, 9.5, 'normal', 4.8, '#4A5A72');
        y += 2;
      });
    }

    var experience = (data.experience || []).filter(function (e) { return e.role || e.org; });
    if (experience.length) {
      addSectionTitle('Experience & Projects');
      experience.forEach(function (e) {
        ensureSpace(6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor('#1C2B45');
        doc.text(e.role || 'Role', marginX, y);
        if (e.dates) {
          doc.setFont('helvetica', 'normal');
          doc.text(e.dates, pageWidth - marginX, y, { align: 'right' });
        }
        y += 5;
        if (e.org) addWrapped(e.org, 9.5, 'normal', 4.8, '#4A5A72');
        if (e.desc) addWrapped(e.desc, 9.5, 'normal', 4.8, '#1C2B45');
        y += 2;
      });
    }

    if (data.skills && data.skills.length) {
      addSectionTitle('Skills');
      addWrapped(data.skills.join('  •  '), 10, 'normal', 5, '#1C2B45');
    }

    var safeName = (filenameBase || 'resume').trim().replace(/[^a-z0-9\-_ ]+/gi, '').trim().replace(/\s+/g, '-') || 'resume';
    doc.save(safeName + '.pdf');
  }

  var printBtn = document.getElementById('rbPrint');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      var data = getFormData();
      buildResumePdf(data, data.name || 'resume');
    });
  }

  var copyBtn = document.getElementById('rbCopyResume');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var textarea = document.getElementById('rbPasteResume');
      var hint = document.getElementById('rbCopyHint');
      if (!textarea.value.trim()) return;
      navigator.clipboard.writeText(textarea.value).then(function () {
        var original = hint.textContent;
        hint.textContent = 'Copied to clipboard.';
        setTimeout(function () { hint.textContent = original; }, 3500);
      });
    });
  }

  /* ---------- Build From Scratch: start from a template ----------
     Pre-fills the same form fields a student would otherwise type
     themselves - everything stays fully editable afterward. Presets
     are hardcoded example content per school; "Generate with AI"
     asks the resume-template webhook for content tailored to the
     exact diploma chosen, reusing the same shape. */

  var RESUME_TEMPLATE_WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/resume-template';

  var PRESET_TEMPLATES = {
    applied_science: {
      summary: 'Detail-oriented science student with hands-on laboratory experience, seeking an internship to apply analytical and research skills in a real-world setting.',
      experience: [{ role: 'Laboratory Assistant (Attachment)', org: '', dates: '', desc: 'Assisted in preparing samples and running standard laboratory tests under supervision.\nMaintained accurate records of experiment results and lab equipment logs.\nFollowed safety protocols and quality control procedures consistently.' }],
      skills: ['Laboratory Techniques', 'Data Recording', 'Attention to Detail', 'Microsoft Excel']
    },
    business: {
      summary: 'Motivated business student with strong communication and analytical skills, looking to gain hands-on experience in a fast-paced business environment.',
      experience: [{ role: 'Marketing Intern', org: '', dates: '', desc: 'Assisted in planning and executing social media campaigns to boost brand engagement.\nAnalysed customer feedback data to identify trends and improvement areas.\nSupported the team in preparing presentation decks for client meetings.' }],
      skills: ['Microsoft Excel', 'Communication', 'Market Research', 'Project Coordination']
    },
    engineering: {
      summary: 'Engineering student with a strong foundation in technical problem-solving, seeking an internship to apply design and analytical skills to real projects.',
      experience: [{ role: 'Engineering Intern', org: '', dates: '', desc: 'Assisted in designing and testing components using CAD software.\nSupported troubleshooting of technical issues during project development.\nDocumented test results and contributed to project reports.' }],
      skills: ['CAD Software', 'Problem Solving', 'Technical Documentation', 'Teamwork']
    },
    hospitality: {
      summary: 'Friendly and service-oriented hospitality student with experience in fast-paced customer service settings, eager to deliver excellent guest experiences.',
      experience: [{ role: 'Guest Service Attachment', org: '', dates: '', desc: 'Provided front-line customer service, handling guest enquiries and requests promptly.\nAssisted in coordinating event logistics for functions of up to 100 guests.\nMaintained high standards of service quality under time pressure.' }],
      skills: ['Customer Service', 'Communication', 'Event Coordination', 'Problem Solving']
    },
    infocomm: {
      summary: 'Tech-savvy Infocomm student with a passion for building practical solutions, seeking an internship to apply programming and analytical skills.',
      experience: [{ role: 'IT / Software Intern', org: '', dates: '', desc: 'Built and tested small features for an internal web application under mentorship.\nDebugged and resolved reported issues, improving app reliability.\nCollaborated with the team using version control for code changes.' }],
      skills: ['Python', 'SQL', 'Git', 'Problem Solving']
    },
    sports_health: {
      summary: 'Caring and active student in the sports and health field, seeking an internship to support community wellness and health programmes.',
      experience: [{ role: 'Community Health Volunteer', org: '', dates: '', desc: 'Assisted in organising fitness and wellness activities for community participants.\nSupported basic health screenings and record-keeping under supervision.\nEncouraged participant engagement through positive coaching.' }],
      skills: ['Communication', 'First Aid Awareness', 'Teamwork', 'Event Support']
    },
    design: {
      summary: 'Creative design student with a strong eye for visual storytelling, seeking an opportunity to contribute fresh ideas to real client projects.',
      experience: [{ role: 'Design Intern', org: '', dates: '', desc: 'Created visual assets for social media and marketing campaigns.\nCollaborated with the team to develop concepts aligned with brand guidelines.\nRevised designs based on feedback within tight deadlines.' }],
      skills: ['Adobe Creative Suite', 'Visual Design', 'Creativity', 'Time Management']
    }
  };

  function formHasContent() {
    var d = getFormData();
    return !!(d.name || d.email || d.phone || d.summary ||
      d.education.some(function (e) { return e.school || e.course; }) ||
      d.experience.some(function (e) { return e.role || e.org || e.desc; }) ||
      d.skills.length);
  }

  function populateForm(data) {
    document.getElementById('rbSummary').value = data.summary || '';

    eduList.innerHTML = '';
    var eduEntries = (data.education && data.education.length) ? data.education : [{}];
    eduEntries.forEach(function (e) {
      addEduRow();
      var row = eduList.lastElementChild;
      row.querySelector('.rb-edu-school').value = e.school || '';
      row.querySelector('.rb-edu-course').value = e.course || '';
      row.querySelector('.rb-edu-year').value = e.year || '';
    });

    expList.innerHTML = '';
    var expEntries = (data.experience && data.experience.length) ? data.experience : [{}];
    expEntries.forEach(function (e) {
      addExpRow();
      var row = expList.lastElementChild;
      row.querySelector('.rb-exp-title').value = e.role || '';
      row.querySelector('.rb-exp-org').value = e.org || '';
      row.querySelector('.rb-exp-dates').value = e.dates || '';
      row.querySelector('.rb-exp-desc').value = e.desc || (e.points ? e.points.join('\n') : '');
    });

    document.getElementById('rbSkills').value = (data.skills || []).join(', ');

    renderPreview();
  }

  document.querySelectorAll('.rb-template-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (formHasContent() && !confirm('This will replace what you\'ve already entered in the form below. Continue?')) return;
      var preset = PRESET_TEMPLATES[btn.getAttribute('data-template')];
      if (!preset) return;
      populateForm(preset);
      document.querySelectorAll('.rb-template-btn').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      document.getElementById('rbTemplateHint').textContent = 'Template applied - edit anything below to make it yours.';
    });
  });

  var generateTemplateBtn = document.getElementById('rbGenerateTemplate');
  if (generateTemplateBtn) {
    generateTemplateBtn.addEventListener('click', function () {
      var diploma = document.getElementById('rbAiTemplateDiploma').value;
      var hint = document.getElementById('rbTemplateHint');
      if (!diploma) {
        hint.textContent = 'Choose your diploma first.';
        return;
      }
      if (formHasContent() && !confirm('This will replace what you\'ve already entered in the form below. Continue?')) return;

      var originalBtnHtml = generateTemplateBtn.innerHTML;
      hint.textContent = 'Generating a template for ' + diploma + '…';
      generateTemplateBtn.disabled = true;
      generateTemplateBtn.innerHTML = '<span class="btn-spinner"></span> Generating…';

      var controller = new AbortController();
      // LLM calls have been observed taking 30-45s depending on resume
      // length/model load; a 45s abort was killing legitimate in-flight
      // requests, so this needs real headroom above that observed range.
      var timeout = setTimeout(function () { controller.abort(); }, 90000);

      fetch(RESUME_TEMPLATE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diploma: diploma }),
        signal: controller.signal
      })
        .then(function (res) { return res.text(); })
        .then(function (rawText) {
          clearTimeout(timeout);
          var cleaned = rawText.replace(/```json|```/g, '').trim();
          var data = JSON.parse(cleaned);
          populateForm(data);
          document.querySelectorAll('.rb-template-btn').forEach(function (b) { b.classList.remove('is-active'); });
          hint.textContent = 'AI template applied - edit anything below to make it yours.';
        })
        .catch(function () {
          clearTimeout(timeout);
          hint.textContent = 'Could not generate a template right now. Try again, or pick one of the presets above.';
        })
        .finally(function () {
          generateTemplateBtn.disabled = false;
          generateTemplateBtn.innerHTML = originalBtnHtml;
        });
    });
  }

  /* ---------- file upload: extract text from PDF / DOCX / TXT ----------
     pdf.js is loaded as an ES module in <head> (window.pdfjsLib), fully
     configured with its worker before this classic script ever runs -
     see the <script type="module"> block in resume-builder.html. */

  function extractTextFromFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      return file.text();
    }

    if (ext === 'pdf') {
      return file.arrayBuffer().then(function (buf) {
        return pdfjsLib.getDocument({ data: buf }).promise;
      }).then(function (pdf) {
        var pagePromises = [];
        for (var i = 1; i <= pdf.numPages; i++) {
          pagePromises.push((function (pageNum) {
            return pdf.getPage(pageNum).then(function (page) {
              return page.getTextContent();
            }).then(function (content) {
              return content.items.map(function (item) { return item.str; }).join(' ');
            });
          })(i));
        }
        return Promise.all(pagePromises).then(function (pages) { return pages.join('\n'); });
      });
    }

    if (ext === 'docx') {
      return file.arrayBuffer().then(function (buf) {
        return mammoth.extractRawText({ arrayBuffer: buf });
      }).then(function (result) { return result.value; });
    }

    return Promise.reject(new Error('Unsupported file type'));
  }

  /* ---------- auto-expand the paste-resume textarea ----------
     Grows to fit its content instead of staying at a fixed height with
     a scrollbar / manual drag-handle. Resets height to 0 (not 'auto' -
     textareas don't reliably shrink-to-fit on 'auto' the way normal
     elements do) before reading scrollHeight, so it shrinks back down
     correctly too (e.g. after clearing pasted text), not just grows.
     Deliberately NOT called at page load: #improve starts hidden behind
     the path-choice gate, and scrollHeight reads as ~0 on a hidden
     element, which would bake in a wrong height before the user ever
     sees it - CSS min-height covers the empty/initial appearance instead,
     and this only ever runs while the field is genuinely visible. */
  var pasteResumeEl = document.getElementById('rbPasteResume');
  function autoExpandTextarea(el) {
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }
  if (pasteResumeEl) {
    pasteResumeEl.addEventListener('input', function () { autoExpandTextarea(pasteResumeEl); });
  }

  var uploadInput = document.getElementById('rbResumeUpload');
  var uploadHint = document.getElementById('rbUploadHint');
  var uploadHintDefault = uploadHint ? uploadHint.textContent : '';

  if (uploadInput) {
    uploadInput.addEventListener('change', function () {
      var file = uploadInput.files[0];
      if (!file) return;
      var labelText = document.getElementById('rbFileUploadLabelText');
      if (labelText) labelText.textContent = file.name;
      uploadHint.textContent = 'Reading ' + file.name + '…';
      extractTextFromFile(file)
        .then(function (text) {
          text = (text || '').trim();
          if (!text) {
            uploadHint.textContent = 'Could not find any text in that file - it may be a scanned image. Try pasting your resume text instead.';
            return;
          }
          document.getElementById('rbPasteResume').value = text;
          autoExpandTextarea(pasteResumeEl);
          uploadHint.textContent = 'Extracted text from ' + file.name + '.';
        })
        .catch(function () {
          uploadHint.textContent = 'Could not read that file (' + file.name + '). Try pasting your resume text instead.';
        });
    });
  }

  /* ---------- Get AI Feedback: call resume-feedback webhook ---------- */

  var feedbackBtn = document.getElementById('rbGetFeedback');
  var feedbackResult = document.getElementById('rbFeedbackResult');

  function normalizeImprovedResume(improved) {
    improved = improved || {};
    return {
      name: improved.name || '',
      email: improved.email || '',
      phone: improved.phone || '',
      links: improved.links || '',
      summary: improved.summary || '',
      education: (improved.education || []).map(function (e) {
        return { school: e.school || '', course: e.course || '', year: e.year || '' };
      }),
      experience: (improved.experience || []).map(function (e) {
        return { role: e.role || '', org: e.org || '', dates: e.dates || '', desc: (e.points || []).join('\n') };
      }),
      skills: improved.skills || []
    };
  }

  /* Flattens the improved-resume data back into plain text so a user can
     copy it and, e.g., re-run it through "Get AI Feedback" to see how much
     the score moved, or paste it into a job application form. Mirrors the
     resumeText format the feedback webhook itself expects. */
  function resumeTextFromData(data) {
    var lines = [];
    if (data.name) lines.push(data.name);
    var contactBits = [data.email, data.phone, data.links].filter(Boolean);
    if (contactBits.length) lines.push(contactBits.join(' | '));
    if (data.summary) lines.push('', 'SUMMARY', data.summary);

    if (data.education && data.education.length) {
      lines.push('', 'EDUCATION');
      data.education.forEach(function (e) {
        lines.push([e.course, e.school, e.year].filter(Boolean).join(' — '));
      });
    }

    if (data.experience && data.experience.length) {
      lines.push('', 'EXPERIENCE');
      data.experience.forEach(function (e) {
        lines.push([e.role, e.org, e.dates].filter(Boolean).join(' — '));
        (e.desc || '').split('\n').forEach(function (point) {
          if (point.trim()) lines.push('- ' + point.trim());
        });
      });
    }

    if (data.skills && data.skills.length) {
      lines.push('', 'SKILLS', data.skills.join(', '));
    }

    return lines.join('\n').trim();
  }

  /* ---------- categorized feedback bubbles + ATS score ring ----------
     Matches the resume-feedback n8n prompt's current response shape:
     strengths[], weakActionVerbs[{original,suggestion}], grammarIssues[],
     atsCompatibility{score,feedback[]}, missingSkills[], suggestions[]. */
  var FB_ICONS = {
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
    alert: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
    zap: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
  };

  function fbBubbleList(items, modifier, wrap) {
    if (!items || !items.length) return '';
    return '<div class="fb-bubbles' + (wrap ? ' fb-bubbles--wrap' : '') + '">' + items.map(function (t) {
      return '<div class="fb-bubble' + (modifier ? ' fb-bubble--' + modifier : '') + '">' + escapeHtml(t) + '</div>';
    }).join('') + '</div>';
  }

  function fbSection(title, icon, bodyHtml) {
    if (!bodyHtml) return '';
    return '<div class="fb-section">' +
      '<div class="fb-section__title">' + icon + '<span>' + escapeHtml(title) + '</span></div>' +
      bodyHtml +
    '</div>';
  }

  function renderFeedbackResult(data, originalText) {
    var strengths = data.strengths || [];
    var weakVerbs = data.weakActionVerbs || [];
    var grammarIssues = data.grammarIssues || [];
    var ats = data.atsCompatibility || {};
    var atsScore = Math.max(0, Math.min(100, Math.round(Number(ats.score) || 0)));
    var atsFeedback = ats.feedback || [];
    var missingSkills = data.missingSkills || [];
    var suggestions = data.suggestions || [];

    var scoreTier = atsScore >= 75 ? 'good' : (atsScore >= 50 ? 'fair' : 'poor');
    var scoreLabel = atsScore >= 75 ? 'Strong' : (atsScore >= 50 ? 'Needs work' : 'Weak');
    var circumference = 2 * Math.PI * 52;
    var dashOffset = circumference * (1 - atsScore / 100);

    var weakVerbsHtml = weakVerbs.length
      ? '<div class="fb-bubbles">' + weakVerbs.map(function (v) {
          return '<div class="fb-verb-pair">' +
            '<span class="fb-verb-pair__old">' + escapeHtml(v.original || '') + '</span>' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>' +
            '<span class="fb-verb-pair__new">' + escapeHtml(v.suggestion || '') + '</span>' +
          '</div>';
        }).join('') + '</div>'
      : '';

    feedbackResult.innerHTML =
      '<div class="fb-score-card">' +
        '<div class="fb-score-ring fb-score-ring--' + scoreTier + '">' +
          '<svg width="120" height="120" viewBox="0 0 120 120">' +
            '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" stroke-width="10"></circle>' +
            '<circle cx="60" cy="60" r="52" fill="none" class="fb-score-ring__fill" stroke-width="10" ' +
              'stroke-dasharray="' + circumference.toFixed(1) + '" stroke-dashoffset="' + dashOffset.toFixed(1) + '" ' +
              'stroke-linecap="round" transform="rotate(-90 60 60)"></circle>' +
          '</svg>' +
          '<div class="fb-score-ring__num">' + atsScore + '</div>' +
        '</div>' +
        '<div class="fb-score-card__body">' +
          '<div class="fb-score-card__title">ATS Compatibility &mdash; ' + scoreLabel + '</div>' +
          (atsFeedback.length ? '<ul class="fb-score-card__list">' + atsFeedback.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>' : '') +
        '</div>' +
      '</div>' +
      fbSection('Strengths', FB_ICONS.check, fbBubbleList(strengths, 'good')) +
      fbSection('Weak Action Verbs', FB_ICONS.edit, weakVerbsHtml) +
      fbSection('Grammar Issues', FB_ICONS.alert, fbBubbleList(grammarIssues, 'warn')) +
      fbSection('Missing Skills', FB_ICONS.plus, fbBubbleList(missingSkills, 'skill', true)) +
      fbSection('Suggestions', FB_ICONS.zap, fbBubbleList(suggestions, 'suggest')) +
      '<div class="builder-preview-wrap" style="margin-top:1.5rem;">' +
        '<div class="fb-compare">' +
          '<div>' +
            '<div class="fb-compare__label">Original</div>' +
            '<div class="resume-preview fb-compare__original">' + escapeHtml(originalText || '') + '</div>' +
          '</div>' +
          '<div>' +
            '<div class="fb-compare__label">Improved</div>' +
            '<div class="resume-preview" id="rbImprovedPreview"></div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1rem;">' +
          '<button type="button" class="btn btn-ghost" id="rbCopyImproved" style="flex:1;justify-content:center;min-width:180px;">Copy Improved Text</button>' +
          '<button type="button" class="btn btn-primary" id="rbPrintImproved" style="flex:1;justify-content:center;min-width:180px;">Download as PDF</button>' +
        '</div>' +
        '<p class="form-hint" id="rbCopyImprovedHint" style="margin-top:.6rem;">Copy this to re-check your score, or paste it into a job application.</p>' +
      '</div>';

    var improvedResumeData = normalizeImprovedResume(data.improvedResume);
    renderPreviewFromData(improvedResumeData, document.getElementById('rbImprovedPreview'));

    document.getElementById('rbPrintImproved').addEventListener('click', function () {
      buildResumePdf(improvedResumeData, improvedResumeData.name || 'resume');
    });

    document.getElementById('rbCopyImproved').addEventListener('click', function () {
      var hint = document.getElementById('rbCopyImprovedHint');
      var original = hint.textContent;
      navigator.clipboard.writeText(resumeTextFromData(improvedResumeData)).then(function () {
        hint.textContent = 'Copied to clipboard.';
        setTimeout(function () { hint.textContent = original; }, 3500);
      });
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function () {
      var text = document.getElementById('rbPasteResume').value.trim();
      if (!text) {
        feedbackResult.innerHTML = '<p class="career-error">Upload or paste your resume first.</p>';
        return;
      }

      window.jrAiLoading(feedbackResult, [
        'Reading your resume…',
        'Checking formatting and structure…',
        'Evaluating ATS compatibility…',
        'Polishing suggestions…',
        'Almost done…'
      ]);

      var controller = new AbortController();
      // LLM calls have been observed taking 30-45s depending on resume
      // length/model load; a 45s abort was killing legitimate in-flight
      // requests, so this needs real headroom above that observed range.
      var timeout = setTimeout(function () { controller.abort(); }, 90000);

      fetch(RESUME_FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
        signal: controller.signal
      })
        .then(function (res) { return res.text(); })
        .then(function (rawText) {
          clearTimeout(timeout);
          var cleaned = rawText.replace(/```json|```/g, '').trim();
          var data = JSON.parse(cleaned);
          renderFeedbackResult(data, text);
        })
        .catch(function () {
          clearTimeout(timeout);
          feedbackResult.innerHTML =
            '<div class="career-error">Could not get feedback right now. Check your connection or try again. ' +
            '<button class="btn btn-ghost btn-sm" id="rbFeedbackRetry">Retry</button></div>';
          document.getElementById('rbFeedbackRetry').addEventListener('click', function () { feedbackBtn.click(); });
        });
    });
  }
})();
