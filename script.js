/* =========================================================
   JobReady SG — shared script
   Handles: nav active state, mobile menu,
   scroll-triggered fade-ins, demo conversation animation,
   architecture diagram simulation, and the Botpress chat helper.
   Cross-page transitions are handled natively by the browser's
   View Transitions API (see @view-transition in style.css).
   ========================================================= */

// Mark JS as available immediately so CSS only hides reveal-target
// elements when it knows the observer below will actually run.
document.documentElement.classList.add('js-ready');

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- highlight the active nav link ---------- */
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-links a, .mobile-panel a').forEach(link => {
    if (link.dataset.page === page) link.classList.add('active');
  });

  /* ---------- mobile menu toggle ---------- */
  const toggle = document.getElementById('navToggle');
  const panel = document.getElementById('mobilePanel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => panel.classList.toggle('open'));
    panel.querySelectorAll('a').forEach(a => a.addEventListener('click', () => panel.classList.remove('open')));
  }

  /* ---------- scroll-triggered fade-in for cards and blocks ---------- */
  const revealSelectors = [
    '.agent-card', '.jstep', '.team-card', '.tech-badge', '.faq-item',
    '.video-shell', '.arch-shell', '.chat-launch', '.convo-shell', '.block-title'
  ].join(',');
  const revealEls = document.querySelectorAll(revealSelectors);
  if (revealEls.length) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('in-view');
          // once the entrance animation finishes, drop it so it stops
          // overriding hover/transform interactions permanently
          el.addEventListener('animationend', () => el.classList.add('reveal-done'), { once: true });
          revealIO.unobserve(el);
        }
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => {
      el.classList.add('reveal-target');
      revealIO.observe(el);
    });
  }

});

/* =========================================================
   DEMO PAGE: animated example conversation
   Reveals the existing static .convo-msg elements one at a
   time rather than building new markup.
   ========================================================= */
let demoTimer = null;
function playDemo() {
  const body = document.getElementById('demoBody');
  if (!body) return;
  const messages = body.querySelectorAll('.convo-msg');
  messages.forEach(m => m.classList.remove('shown'));
  clearTimeout(demoTimer);
  let i = 0;
  (function step() {
    if (i >= messages.length) return;
    messages[i].classList.add('shown');
    i++;
    demoTimer = setTimeout(step, 1100);
  })();
}
document.addEventListener('DOMContentLoaded', () => {
  const demoBody = document.getElementById('demoBody');
  if (!demoBody) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { playDemo(); io.disconnect(); } });
  }, { threshold: .4 });
  io.observe(demoBody);
});

/* =========================================================
   DEMO PAGE: architecture pipeline simulation
   ========================================================= */
function runArchDemo() {
  const order = ['1','2','3','4','4a','4b','4c','5','6'];
  const connOrder = ['1','2','3','4','5'];
  document.querySelectorAll('.arch-node, .arch-connector').forEach(n => n.classList.remove('active'));
  order.forEach((n, idx) => {
    setTimeout(() => {
      const node = document.querySelector('[data-n="' + n + '"]');
      if (node) node.classList.add('active');
      setTimeout(() => node && node.classList.remove('active'), 900);
    }, idx * 350);
  });
  connOrder.forEach((c, idx) => {
    setTimeout(() => {
      const conn = document.querySelector('[data-c="' + c + '"]');
      if (conn) conn.classList.add('active');
      setTimeout(() => conn && conn.classList.remove('active'), 900);
    }, idx * 700 + 175);
  });
}

/* =========================================================
   CHAT PAGE: open / auto-open the existing Botpress webchat
   These functions only do anything on pages where the Botpress
   embed scripts are actually present (chat.html).
   ========================================================= */
function openChat() {
  if (window.botpressWebChat) {
    window.botpressWebChat.sendEvent({ type: 'show' });
  } else {
    const note = document.getElementById('fallbackNote');
    if (note) {
      note.classList.add('show');
      setTimeout(() => note.classList.remove('show'), 3500);
    }
  }
}

// Auto-open the chat panel as soon as Botpress finishes loading on chat.html
window.addEventListener('load', () => {
  const launch = document.getElementById('chatLaunch');
  if (!launch) return; // not on the chat page
  const tryOpen = setInterval(() => {
    if (window.botpressWebChat) {
      clearInterval(tryOpen);
      window.botpressWebChat.sendEvent({ type: 'show' });
    }
  }, 400);
  // stop trying after ~8s and show the fallback note instead
  setTimeout(() => {
    clearInterval(tryOpen);
    if (!window.botpressWebChat) {
      const note = document.getElementById('fallbackNote');
      if (note) note.classList.add('show');
    }
  }, 8000);
});
