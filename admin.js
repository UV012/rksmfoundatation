// ============================================
//  RAM KINKAR SHAHI MEMORIAL FOUNDATION
//  admin.js — Legal & Registration admin panel
//  Talks to the Node/Express + MSSQL backend
//  via legal-api.js. Real auth (bcrypt + JWT)
//  on the server side.
// ============================================

let adminRecords = [];

async function attemptLogin() {
  const username = document.getElementById('username').value.trim();
  const pw = document.getElementById('pw').value;
  const err = document.getElementById('loginError');
  err.textContent = '';

  if (!username || !pw) {
    err.textContent = 'Please enter both username and password.';
    return;
  }

  try {
    await legalLogin(username, pw);
    await showPanel();
  } catch (e) {
    err.textContent = e.message || 'Login failed.';
  }
}

function logout() {
  legalLogout();
  document.getElementById('panel').style.display = 'none';
  document.getElementById('loginBox').style.display = 'block';
  document.getElementById('pw').value = '';
}

async function showPanel() {
  document.getElementById('loginBox').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  await loadAndRenderCards();
  await loadAndRenderGallery();
  await loadAndRenderPeople();
}

async function loadAndRenderCards() {
  const container = document.getElementById('cardsContainer');
  try {
    adminRecords = await legalFetchAdminRegistrations();
    renderAdminCards();
  } catch (e) {
    container.innerHTML = `<p class="legal-empty">Could not load registration details: ${e.message}</p>`;
    if (e.message && e.message.toLowerCase().includes('login')) {
      logout();
    }
  }
}

function renderAdminCards() {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = adminRecords.map((r) => `
    <div class="admin-card" data-id="${r.id}">
      <h2>${r.icon || '📄'} ${r.title}</h2>

      <div class="admin-row">
        <div class="form-group">
          <label>Registration Number</label>
          <input type="text" data-field="regNumber" value="${escapeAttr(r.regNumber)}" placeholder="e.g. AABTR1234C..."/>
        </div>
        <div class="form-group">
          <label>Registration Date</label>
          <input type="date" data-field="regDate" value="${r.regDate ? r.regDate.substring(0,10) : ''}"/>
        </div>
      </div>

      <div class="form-group">
        <label>Validity</label>
        <input type="text" data-field="validity" value="${escapeAttr(r.validity)}" placeholder="e.g. Valid till AY 2030-31, or 'No expiry'"/>
      </div>

      <div class="form-group">
        <label>Short Description (shown to visitors)</label>
        <textarea rows="3" data-field="description">${escapeHtml(r.description)}</textarea>
      </div>

      <div class="admin-file-row">
        <input type="file" accept="application/pdf" data-role="fileInput"/>
        <button type="button" class="btn btn-ghost" style="padding:8px 16px;font-size:0.75rem;" data-role="uploadBtn">Upload / Replace</button>
        <span class="admin-file-status" data-role="fileStatus">
          ${r.hasFile ? `Current file: ${r.fileName || 'certificate.pdf'} — <a href="${legalAdminFileUrl(r.id)}" target="_blank" rel="noopener">view</a>` : 'No certificate uploaded yet'}
        </span>
        ${r.hasFile ? `<button type="button" class="btn btn-ghost" style="color:#C0392B;border-color:#C0392B;padding:6px 14px;font-size:0.72rem;" data-role="removeBtn">Remove</button>` : ''}
      </div>

      <label class="admin-toggle">
        <input type="checkbox" data-field="isPublic" ${r.isPublic ? 'checked' : ''}/>
        Publicly visible on website
      </label>

      <div style="display:flex; justify-content:flex-end; gap:10px; align-items:center;">
        <span class="admin-saved-msg" data-role="cardSavedMsg"></span>
        <button type="button" class="btn btn-primary" data-role="saveBtn" style="padding:10px 22px;font-size:0.78rem;">Save This Record</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.admin-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-role="saveBtn"]').addEventListener('click', () => saveRecord(id, card));
    card.querySelector('[data-role="uploadBtn"]').addEventListener('click', () => uploadFile(id, card));
    const removeBtn = card.querySelector('[data-role="removeBtn"]');
    if (removeBtn) removeBtn.addEventListener('click', () => removeFile(id, card));
  });
}

async function saveRecord(id, card) {
  const fields = {
    regNumber: card.querySelector('[data-field="regNumber"]').value.trim(),
    regDate: card.querySelector('[data-field="regDate"]').value || null,
    validity: card.querySelector('[data-field="validity"]').value.trim(),
    description: card.querySelector('[data-field="description"]').value.trim(),
    isPublic: card.querySelector('[data-field="isPublic"]').checked
  };
  const msg = card.querySelector('[data-role="cardSavedMsg"]');
  const btn = card.querySelector('[data-role="saveBtn"]');

  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    await legalUpdateRegistration(id, fields);
    msg.style.color = '#2E7D32';
    msg.textContent = 'Saved ✓';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } catch (e) {
    msg.style.color = '#C0392B';
    msg.textContent = e.message || 'Save failed.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save This Record';
  }
}

async function uploadFile(id, card) {
  const input = card.querySelector('[data-role="fileInput"]');
  const status = card.querySelector('[data-role="fileStatus"]');
  const file = input.files[0];

  if (!file) {
    alert('Please choose a PDF file first.');
    return;
  }
  if (file.type !== 'application/pdf') {
    alert('Please upload a PDF file.');
    return;
  }

  status.textContent = 'Uploading...';
  try {
    await legalUploadCertificate(id, file);
    await loadAndRenderCards();
  } catch (e) {
    status.textContent = `Upload failed: ${e.message}`;
  }
}

async function removeFile(id, card) {
  if (!confirm('Remove the uploaded certificate for this record?')) return;
  try {
    await legalRemoveCertificate(id);
    await loadAndRenderCards();
  } catch (e) {
    alert(`Could not remove file: ${e.message}`);
  }
}

function escapeAttr(str) {
  return (str || '').toString().replace(/"/g, '&quot;');
}
function escapeHtml(str) {
  return (str || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Restore session if a token already exists (page refresh)
if (legalGetToken()) {
  showPanel().catch(() => logout());
}

// ============================
// GALLERY MANAGEMENT
// ============================
async function loadAndRenderGallery() {
  const grid = document.getElementById('galleryAdminGrid');
  if (!grid) return;
  try {
    const images = await galleryFetchAdmin();
    if (images.length === 0) {
      grid.innerHTML = `<p class="legal-empty">No photos uploaded yet.</p>`;
      return;
    }
    grid.innerHTML = images.map(img => `
      <div style="border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;">
        <img src="${legalResolveUploadUrl(img.url)}" alt="${img.caption || ''}" style="width:100%; height:110px; object-fit:cover; display:block;"/>
        <div style="padding:8px; font-size:0.72rem;">
          <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
            <input type="checkbox" ${img.isPublic ? 'checked' : ''} onchange="toggleGalleryVisibility(${img.id}, this.checked)"/> Public
          </label>
          <button type="button" class="btn btn-ghost" style="color:#C0392B;border-color:#C0392B;padding:4px 10px;font-size:0.68rem;width:100%;" onclick="deleteGalleryImage(${img.id})">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = `<p class="legal-empty">Could not load gallery: ${e.message}</p>`;
  }
}

async function addGalleryImage() {
  const fileInput = document.getElementById('galleryFileInput');
  const captionInput = document.getElementById('galleryCaptionInput');
  const file = fileInput.files[0];
  if (!file) { alert('Please choose an image first.'); return; }

  try {
    await galleryUpload(file, captionInput.value.trim());
    fileInput.value = '';
    captionInput.value = '';
    await loadAndRenderGallery();
  } catch (e) {
    alert(`Upload failed: ${e.message}`);
  }
}

async function toggleGalleryVisibility(id, isPublic) {
  try {
    await galleryUpdate(id, { isPublic, caption: '', sortOrder: 0 });
    await loadAndRenderGallery();
  } catch (e) {
    alert(`Could not update: ${e.message}`);
  }
}

async function deleteGalleryImage(id) {
  if (!confirm('Delete this photo?')) return;
  try {
    await galleryDelete(id);
    await loadAndRenderGallery();
  } catch (e) {
    alert(`Could not delete: ${e.message}`);
  }
}

// ============================
// PEOPLE MANAGEMENT (Advisory Council / Volunteers / Brand Ambassadors)
// ============================
const CATEGORY_LABELS = {
  advisory_council: 'Advisory Council',
  volunteer: 'Volunteer',
  brand_ambassador: 'Brand Ambassador'
};

async function loadAndRenderPeople() {
  const list = document.getElementById('peopleAdminList');
  if (!list) return;
  try {
    const people = await peopleFetchAdmin();
    if (people.length === 0) {
      list.innerHTML = `<p class="legal-empty">No members added yet.</p>`;
      return;
    }
    list.innerHTML = people.map(p => `
      <div style="display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid var(--border);">
        ${p.photoUrl
          ? `<img src="${legalResolveUploadUrl(p.photoUrl)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;"/>`
          : `<div style="width:48px;height:48px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">${(p.name||'').slice(0,2).toUpperCase()}</div>`}
        <div style="flex:1;">
          <strong>${p.name}</strong> <span style="color:var(--text-light); font-size:0.78rem;">— ${CATEGORY_LABELS[p.category] || p.category}</span><br/>
          <span style="font-size:0.8rem; color:var(--text-mid);">${p.role || ''}</span>
        </div>
        <label style="display:flex; align-items:center; gap:6px; font-size:0.78rem;">
          <input type="checkbox" ${p.isPublic ? 'checked' : ''} onchange="togglePersonVisibility(${p.id}, this.checked, '${(p.name||'').replace(/'/g,"\\'")}', '${(p.role||'').replace(/'/g,"\\'")}', '${(p.bio||'').replace(/'/g,"\\'")}')"/> Public
        </label>
        <button type="button" class="btn btn-ghost" style="color:#C0392B;border-color:#C0392B;padding:6px 12px;font-size:0.72rem;" onclick="deletePerson(${p.id})">Delete</button>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `<p class="legal-empty">Could not load list: ${e.message}</p>`;
  }
}

async function addPerson() {
  const category = document.getElementById('personCategory').value;
  const name = document.getElementById('personName').value.trim();
  const role = document.getElementById('personRole').value.trim();
  const bio = document.getElementById('personBio').value.trim();
  const photoFile = document.getElementById('personPhotoInput').files[0];

  if (!name) { alert('Please enter a name.'); return; }

  try {
    await peopleAdd({ category, name, role, bio, isPublic: true }, photoFile);
    document.getElementById('personName').value = '';
    document.getElementById('personRole').value = '';
    document.getElementById('personBio').value = '';
    document.getElementById('personPhotoInput').value = '';
    await loadAndRenderPeople();
  } catch (e) {
    alert(`Could not add member: ${e.message}`);
  }
}

async function togglePersonVisibility(id, isPublic, name, role, bio) {
  try {
    await peopleUpdate(id, { name, role, bio, isPublic, sortOrder: 0 });
    await loadAndRenderPeople();
  } catch (e) {
    alert(`Could not update: ${e.message}`);
  }
}

async function deletePerson(id) {
  if (!confirm('Remove this member?')) return;
  try {
    await peopleDelete(id);
    await loadAndRenderPeople();
  } catch (e) {
    alert(`Could not delete: ${e.message}`);
  }
}
