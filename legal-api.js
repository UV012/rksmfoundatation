// ============================================
//  RAM KINKAR SHAHI MEMORIAL FOUNDATION
//  legal-api.js — talks to the Node/Express +
//  MSSQL backend for Legal & Registration data.
//  Used by index.html (public) and admin.html.
// ============================================

// Set this to wherever backend/server.js is running.
// e.g. same-domain reverse proxy: '/api'
// or a separate subdomain: 'https://api.rkshahifoundation.org/api'
const LEGAL_API_BASE = 'http://localhost:4000/api';
// Uploaded images (gallery/team photos) are served from the same host,
// just without the /api prefix — derive that root once here.
const LEGAL_UPLOADS_ORIGIN = LEGAL_API_BASE.replace(/\/api\/?$/, '');

function legalResolveUploadUrl(relativeUrl) {
  if (!relativeUrl) return '';
  return `${LEGAL_UPLOADS_ORIGIN}${relativeUrl}`;
}

const LEGAL_TOKEN_KEY = 'rksf_admin_token';

function legalGetToken() {
  return localStorage.getItem(LEGAL_TOKEN_KEY);
}
function legalSetToken(token) {
  localStorage.setItem(LEGAL_TOKEN_KEY, token);
}
function legalClearToken() {
  localStorage.removeItem(LEGAL_TOKEN_KEY);
}

async function legalApiRequest(path, options = {}) {
  const headers = Object.assign({}, options.headers);
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = legalGetToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${LEGAL_API_BASE}${path}`, Object.assign({}, options, { headers }));

  if (res.status === 401) {
    legalClearToken();
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* no JSON body (e.g. file download) */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---- Public (no auth) ----
async function legalFetchPublicRegistrations() {
  return legalApiRequest('/legal/public');
}
function legalPublicFileUrl(id) {
  return `${LEGAL_API_BASE}/legal/public/${id}/file`;
}

// ---- Admin (auth required) ----
async function legalLogin(username, password) {
  const data = await legalApiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  legalSetToken(data.token);
  return data;
}
function legalLogout() {
  legalClearToken();
}
async function legalFetchAdminRegistrations() {
  return legalApiRequest('/legal/admin');
}
async function legalUpdateRegistration(id, fields) {
  return legalApiRequest(`/legal/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields)
  });
}
async function legalUploadCertificate(id, file) {
  const formData = new FormData();
  formData.append('certificate', file);
  return legalApiRequest(`/legal/admin/${id}/file`, {
    method: 'POST',
    body: formData
  });
}
async function legalRemoveCertificate(id) {
  return legalApiRequest(`/legal/admin/${id}/file`, { method: 'DELETE' });
}
function legalAdminFileUrl(id) {
  return `${LEGAL_API_BASE}/legal/admin/${id}/file`;
}

function legalFormatDate(dateStr) {
  if (!dateStr) return 'Not specified';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- Gallery ----
async function galleryFetchPublic() {
  return legalApiRequest('/gallery/public');
}
async function galleryFetchAdmin() {
  return legalApiRequest('/gallery/admin');
}
async function galleryUpload(file, caption) {
  const formData = new FormData();
  formData.append('image', file);
  if (caption) formData.append('caption', caption);
  return legalApiRequest('/gallery/admin', { method: 'POST', body: formData });
}
async function galleryUpdate(id, fields) {
  return legalApiRequest(`/gallery/admin/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}
async function galleryDelete(id) {
  return legalApiRequest(`/gallery/admin/${id}`, { method: 'DELETE' });
}

// ---- Team Members (Advisory Council / Volunteers / Brand Ambassadors) ----
const TEAM_CATEGORIES = {
  advisory: 'advisory_council',
  volunteer: 'volunteer',
  ambassador: 'brand_ambassador'
};
async function peopleFetchPublic(category) {
  return legalApiRequest(`/people/public/${category}`);
}
async function peopleFetchAdmin() {
  return legalApiRequest('/people/admin');
}
async function peopleAdd(fields, photoFile) {
  const formData = new FormData();
  Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
  if (photoFile) formData.append('photo', photoFile);
  return legalApiRequest('/people/admin', { method: 'POST', body: formData });
}
async function peopleUpdate(id, fields) {
  return legalApiRequest(`/people/admin/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}
async function peopleUploadPhoto(id, photoFile) {
  const formData = new FormData();
  formData.append('photo', photoFile);
  return legalApiRequest(`/people/admin/${id}/photo`, { method: 'POST', body: formData });
}
async function peopleDelete(id) {
  return legalApiRequest(`/people/admin/${id}`, { method: 'DELETE' });
}
