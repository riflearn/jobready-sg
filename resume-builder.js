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

  var printBtn = document.getElementById('rbPrint');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      document.body.setAttribute('data-print-target', 'build');
      window.print();
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

  var uploadInput = document.getElementById('rbResumeUpload');
  var uploadHint = document.getElementById('rbUploadHint');
  var uploadHintDefault = uploadHint ? uploadHint.textContent : '';

  if (uploadInput) {
    uploadInput.addEventListener('change', function () {
      var file = uploadInput.files[0];
      if (!file) return;
      uploadHint.textContent = 'Reading ' + file.name + '…';
      extractTextFromFile(file)
        .then(function (text) {
          text = (text || '').trim();
          if (!text) {
            uploadHint.textContent = 'Could not find any text in that file - it may be a scanned image. Try pasting your resume text instead.';
            return;
          }
          document.getElementById('rbPasteResume').value = text;
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

  function renderFeedbackResult(data) {
    var feedback = data.feedback || [];
    var feedbackHtml = feedback.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('');

    feedbackResult.innerHTML =
      '<div class="form-section">' +
        '<h3 class="form-section__title">Feedback</h3>' +
        '<ul class="rb-feedback-list">' + feedbackHtml + '</ul>' +
      '</div>' +
      '<div class="builder-preview-wrap" style="margin-top:1.5rem;">' +
        '<div class="resume-preview" id="rbImprovedPreview"></div>' +
        '<button type="button" class="btn btn-primary" id="rbPrintImproved" style="width:100%;justify-content:center;margin-top:1rem;">Print / Save as PDF</button>' +
      '</div>';

    renderPreviewFromData(normalizeImprovedResume(data.improvedResume), document.getElementById('rbImprovedPreview'));

    document.getElementById('rbPrintImproved').addEventListener('click', function () {
      document.body.setAttribute('data-print-target', 'improve');
      window.print();
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function () {
      var text = document.getElementById('rbPasteResume').value.trim();
      if (!text) {
        feedbackResult.innerHTML = '<p class="career-error">Upload or paste your resume first.</p>';
        return;
      }

      feedbackResult.innerHTML =
        '<div class="skeleton" style="height:20px;width:60%;margin-bottom:10px;"></div>' +
        '<div class="skeleton" style="height:200px;"></div>';

      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 45000);

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
          renderFeedbackResult(data);
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
