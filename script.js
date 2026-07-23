// ============================================
//  RAM KINKAR SHAHI MEMORIAL FOUNDATION
//  script.js — page content interactions
//  (navbar/footer behavior now lives in include.js,
//  since header/footer are loaded dynamically)
// ============================================

// ---- INTERSECTION OBSERVER: Mission cards ----
const missionCards = document.querySelectorAll('.mission-card');
const missionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay || 0);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      missionObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

missionCards.forEach(card => missionObserver.observe(card));

// ---- INTERSECTION OBSERVER: General fade-ins ----
const fadeEls = document.querySelectorAll('.fade-in');
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

fadeEls.forEach(el => fadeObserver.observe(el));

// Add fade-in to section titles/intros automatically
document.querySelectorAll('.section-title, .section-eyebrow, .section-intro, .about-text, .about-logo-wrap, .legacy-grid, .team-card, .contact-details, .contact-form-wrap').forEach(el => {
  el.classList.add('fade-in');
  fadeObserver.observe(el);
});

// ---- CONTACT FORM ----
function handleFormSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('formNote');
  const btn = e.target.querySelector('button[type=submit]');
  const name = document.getElementById('name').value.trim();

  btn.textContent = 'Sending...';
  btn.disabled = true;

  // Simulate form submission (static site — replace with actual API call when dynamic)
  setTimeout(() => {
    note.textContent = `Thank you, ${name}! We've received your message and will get back to you shortly.`;
    note.style.color = '#2E7D32';
    e.target.reset();
    btn.textContent = 'Send Message';
    btn.disabled = false;
  }, 1200);
}

// ---- LEGAL & REGISTRATION: render public certificate cards ----
async function renderLegalCards() {
  const grid = document.getElementById('legalGrid');
  const emptyMsg = document.getElementById('legalEmpty');
  if (!grid || typeof legalFetchPublicRegistrations !== 'function') return;

  let records;
  try {
    records = await legalFetchPublicRegistrations();
  } catch (err) {
    console.error('Could not load registration details:', err);
    if (emptyMsg) emptyMsg.textContent = 'Registration details could not be loaded right now. Please try again later.';
    return;
  }

  if (!records || records.length === 0) {
    if (emptyMsg) emptyMsg.textContent = 'Registration details will be published here shortly.';
    return;
  }
  if (emptyMsg) emptyMsg.remove();

  grid.innerHTML = records.map(r => {
    const actionBtn = r.hasFile
      ? `<a class="btn btn-primary" href="${legalPublicFileUrl(r.id)}" target="_blank" rel="noopener">View / Download</a>`
      : `<button class="btn btn-primary" disabled>Certificate Coming Soon</button>`;

    return `
      <div class="legal-card">
        <div class="legal-card-head">
          <span class="legal-card-icon">${r.icon || '📄'}</span>
          <h3>${r.title}</h3>
        </div>
        <p class="legal-desc">${r.description || ''}</p>
        <div class="legal-meta">
          <span><strong>Registration No.:</strong> ${r.regNumber || 'Not specified'}</span>
          <span><strong>Registration Date:</strong> ${legalFormatDate(r.regDate)}</span>
          <span><strong>Validity:</strong> ${r.validity || 'Not specified'}</span>
        </div>
        ${actionBtn}
      </div>
    `;
  }).join('');
}

renderLegalCards();
