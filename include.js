// ============================================
//  RAM KINKAR SHAHI MEMORIAL FOUNDATION
//  include.js — loads header.html/footer.html
//  into every page (so nav/footer are edited in
//  ONE place), then wires up navbar behavior.
//
//  Every page needs:
//    <div id="site-header"></div>  ...body content...  <div id="site-footer"></div>
//    <script src="include.js"></script>
// ============================================

async function loadPartial(url, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error(`Could not load ${url}:`, err);
  }
}

async function loadSiteChrome() {
  await Promise.all([
    loadPartial('header.html', 'site-header'),
    loadPartial('footer.html', 'site-footer')
  ]);
  initNavbar();
  initFooterCounter();
}

function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) mobileMenu.classList.remove('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // Dropdown (desktop: hover via CSS; also support tap on mobile trigger)
  const trigger = navbar.querySelector('.nav-dropdown-trigger');
  const dropdown = navbar.querySelector('.nav-dropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }
}

async function initFooterCounter() {
  const el = document.getElementById('footerCounter');
  if (!el || typeof legalApiRequest !== 'function') return;
  try {
    const data = await legalApiRequest('/stats/visit', { method: 'POST' });
    el.textContent = `Visitors: ${data.count.toLocaleString('en-IN')}`;
  } catch (err) {
    el.textContent = '';
  }
}

loadSiteChrome();
