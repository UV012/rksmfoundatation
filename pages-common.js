// ============================================
//  RAM KINKAR SHAHI MEMORIAL FOUNDATION
//  pages-common.js — shared rendering logic used
//  by gallery.html, advisory-council.html,
//  volunteers.html, brand-ambassador.html
// ============================================

// ---- GALLERY ----
async function renderGalleryPage() {
  const grid = document.getElementById('galleryGrid');
  const emptyMsg = document.getElementById('galleryEmpty');
  if (!grid) return;

  let images;
  try {
    images = await galleryFetchPublic();
  } catch (err) {
    console.error('Could not load gallery:', err);
    if (emptyMsg) emptyMsg.textContent = 'Gallery could not be loaded right now.';
    return;
  }

  if (!images || images.length === 0) {
    if (emptyMsg) emptyMsg.textContent = 'No photos added yet. Check back soon.';
    return;
  }
  if (emptyMsg) emptyMsg.remove();

  grid.innerHTML = images.map(img => `
    <div class="gallery-item">
      <img src="${legalResolveUploadUrl(img.url)}" alt="${img.caption || 'Gallery photo'}" loading="lazy"/>
      ${img.caption ? `<span class="gallery-caption">${img.caption}</span>` : ''}
    </div>
  `).join('');
}

// ---- PEOPLE (Advisory Council / Volunteers / Brand Ambassadors) ----
function peopleInitials(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

async function renderPeoplePage(category) {
  const grid = document.getElementById('peopleGrid');
  const emptyMsg = document.getElementById('peopleEmpty');
  if (!grid) return;

  let members;
  try {
    members = await peopleFetchPublic(category);
  } catch (err) {
    console.error(`Could not load ${category}:`, err);
    if (emptyMsg) emptyMsg.textContent = 'Could not be loaded right now.';
    return;
  }

  if (!members || members.length === 0) {
    if (emptyMsg) emptyMsg.textContent = 'No data found.';
    return;
  }
  if (emptyMsg) emptyMsg.remove();

  grid.innerHTML = members.map(m => `
    <div class="people-card">
      ${m.photoUrl
        ? `<img class="people-photo" src="${legalResolveUploadUrl(m.photoUrl)}" alt="${m.name}"/>`
        : `<div class="people-photo-fallback">${peopleInitials(m.name)}</div>`}
      <div class="people-name">${m.name}</div>
      ${m.role ? `<span class="people-role">${m.role}</span>` : ''}
      ${m.bio ? `<p class="people-bio">${m.bio}</p>` : ''}
    </div>
  `).join('');
}
