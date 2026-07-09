/* =========================================================
   JobReady SG — Resume Builder page
   Handles: dynamic Education/Experience entries, live resume
   preview, print/PDF export, and the paste-and-copy helper
   for the "Improve My Resume" path.
   ========================================================= */
(function () {
  var eduList = document.getElementById('rbEduList');
  var expList = document.getElementById('rbExpList');
  var preview = document.getElementById('resumePreview');
  if (!eduList || !expList || !preview) return; // not on this page

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

  function renderPreview() {
    var name = document.getElementById('rbName').value.trim();
    var email = document.getElementById('rbEmail').value.trim();
    var phone = document.getElementById('rbPhone').value.trim();
    var links = document.getElementById('rbLinks').value.trim();
    var summary = document.getElementById('rbSummary').value.trim();
    var skills = document.getElementById('rbSkills').value.trim();
    var contactParts = [email, phone, links].filter(Boolean);

    var eduHtml = [].slice.call(eduList.querySelectorAll('.entry-card')).map(function (row) {
      var school = row.querySelector('.rb-edu-school').value.trim();
      var course = row.querySelector('.rb-edu-course').value.trim();
      var year = row.querySelector('.rb-edu-year').value.trim();
      if (!school && !course) return '';
      return '<div class="rp-entry"><div class="rp-entry-head"><span>' + escapeHtml(course || 'Course') + '</span><span>' + escapeHtml(year) + '</span></div>' +
        '<div class="rp-entry-sub">' + escapeHtml(school) + '</div></div>';
    }).filter(Boolean).join('');

    var expHtml = [].slice.call(expList.querySelectorAll('.entry-card')).map(function (row) {
      var title = row.querySelector('.rb-exp-title').value.trim();
      var org = row.querySelector('.rb-exp-org').value.trim();
      var dates = row.querySelector('.rb-exp-dates').value.trim();
      var desc = row.querySelector('.rb-exp-desc').value.trim();
      if (!title && !org) return '';
      return '<div class="rp-entry"><div class="rp-entry-head"><span>' + escapeHtml(title || 'Role') + '</span><span>' + escapeHtml(dates) + '</span></div>' +
        '<div class="rp-entry-sub">' + escapeHtml(org) + '</div>' +
        (desc ? '<div class="rp-entry-body">' + escapeHtml(desc) + '</div>' : '') + '</div>';
    }).filter(Boolean).join('');

    var skillsHtml = skills
      ? '<div class="rp-skills">' + skills.split(',').map(function (s) {
          s = s.trim();
          return s ? '<span class="rp-skill">' + escapeHtml(s) + '</span>' : '';
        }).filter(Boolean).join('') + '</div>'
      : '';

    var hasContent = name || email || phone || summary || eduHtml || expHtml || skills;

    if (!hasContent) {
      preview.className = 'resume-preview is-empty';
      preview.innerHTML = 'Fill in the form to see your resume take shape here.';
      return;
    }

    preview.className = 'resume-preview';
    preview.innerHTML =
      '<div class="rp-name">' + escapeHtml(name || 'Your Name') + '</div>' +
      (contactParts.length ? '<div class="rp-contact">' + contactParts.map(escapeHtml).join(' &middot; ') + '</div>' : '') +
      (summary ? '<div class="rp-section"><div class="rp-section-title">Summary</div><div class="rp-summary">' + escapeHtml(summary) + '</div></div>' : '') +
      (eduHtml ? '<div class="rp-section"><div class="rp-section-title">Education</div>' + eduHtml + '</div>' : '') +
      (expHtml ? '<div class="rp-section"><div class="rp-section-title">Experience &amp; Projects</div>' + expHtml + '</div>' : '') +
      (skillsHtml ? '<div class="rp-section"><div class="rp-section-title">Skills</div>' + skillsHtml + '</div>' : '');
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
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  var copyBtn = document.getElementById('rbCopyResume');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var textarea = document.getElementById('rbPasteResume');
      var hint = document.getElementById('rbCopyHint');
      if (!textarea.value.trim()) return;
      navigator.clipboard.writeText(textarea.value).then(function () {
        var original = hint.textContent;
        hint.textContent = 'Copied! Now click "Get AI Feedback" and paste it into the chat.';
        setTimeout(function () { hint.textContent = original; }, 3500);
      });
    });
  }
})();
