/* =========================================================
   JobReady SG — shared script
   Handles: nav active state, mobile menu,
   scroll-triggered fade-ins, demo conversation animation,
   and the architecture diagram simulation.
   Cross-page transitions are handled natively by the browser's
   View Transitions API (see @view-transition in style.css).
   The Botpress chat on chat.html is a plain iframe embed, no JS needed.
   ========================================================= */

// Mark JS as available immediately so CSS only hides reveal-target
// elements when it knows the observer below will actually run.
document.documentElement.classList.add('js-ready');

/* ---------- shared auth session helpers ----------
   Used here to render nav login state, and by signup.html/login.html
   after a successful webhook call. Session is just {name, email, token} -
   there's no protected data behind it yet, so trusting localStorage is
   fine for now; a real protected endpoint would need to validate the
   token server-side, not just check that it's present client-side. */
window.jrAuth = {
  KEY: 'jobready_session',
  getSession: function () {
    try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; }
  },
  setSession: function (session) {
    localStorage.setItem(this.KEY, JSON.stringify(session));
  },
  clearSession: function () {
    localStorage.removeItem(this.KEY);
  }
};

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- auth state in nav (desktop + mobile) ---------- */
  (function () {
    var session = window.jrAuth.getSession();
    [document.getElementById('authArea'), document.getElementById('authAreaMobile')].forEach((el) => {
      if (!el) return;
      if (session && session.name) {
        var firstName = String(session.name).split(' ')[0]
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        el.innerHTML = '<span class="auth-chip"><span class="auth-chip__name">Hi, ' + firstName + '</span>' +
          '<button class="auth-chip__logout" type="button">Log Out</button></span>';
        el.querySelector('.auth-chip__logout').addEventListener('click', () => {
          window.jrAuth.clearSession();
          window.location.reload();
        });
      } else {
        el.innerHTML = '<a href="login.html" class="auth-login-link">Log In</a>';
      }
    });
  })();

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

  /* ---------- dark/light theme toggle ----------
     Initial theme is already applied by an inline script in <head>
     (before first paint, to avoid a flash of the wrong theme). This
     just wires up the button to flip it and remember the choice. */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  /* ---------- nav: solid background + shadow once the page scrolls ---------- */
  (function () {
    const nav = document.querySelector('nav.site-nav');
    if (!nav) return;
    const update = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
  })();

  /* ---------- hero: rotating outcome word ----------
     Purely cosmetic; only present on pages with #heroWord (home). */
  (function () {
    const el = document.getElementById('heroWord');
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const words = ['confidence', 'clarity', 'a real plan', 'zero guesswork'];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      el.classList.remove('word-swap');
      void el.offsetWidth; // restart the CSS animation
      el.textContent = words[i];
      el.classList.add('word-swap');
    }, 2600);
  })();

  /* ---------- hero: count-up stat numbers ---------- */
  (function () {
    const targets = document.querySelectorAll('[data-count]');
    if (!targets.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    targets.forEach((el) => {
      const end = parseInt(el.dataset.count, 10);
      if (Number.isNaN(end)) return;
      if (reduceMotion) { el.textContent = end; return; }
      const duration = 900;
      const start = performance.now();
      (function tick(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * end);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    });
  })();

  /* ---------- hero background: cursor-tracked spotlight ---------- */
  (function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.hero').forEach((hero) => {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  })();

  /* ---------- card hover glow: follow the cursor via CSS vars ---------- */
  (function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.agent-card, .coach-card, .path-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  })();

  /* ---------- scroll-triggered fade-in for cards and blocks ---------- */
  const revealSelectors = [
    '.agent-card', '.jstep', '.team-card', '.tech-badge', '.faq-item', '.step', '.coach-card',
    '.video-shell', '.arch-shell', '.chat-frame', '.convo-shell', '.block-title'
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
