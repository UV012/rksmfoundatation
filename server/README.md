# Legal & Registration API — Setup

Node.js + Express + MSSQL backend for the "Legal & Registration" (12AB / 80G) section.

## 1. Database
Run `sql/schema.sql` once against your MSSQL database (SSMS, Azure Data Studio, or
Plesk's database tool). It creates `AdminUsers` and `LegalRegistrations`
(pre-seeded with the 3 rows: trust, 12ab, 80g).

## 2. Configure
```
cp .env.example .env
```
Fill in your MSSQL credentials, a random `JWT_SECRET`, and `CORS_ORIGIN`
(your live site domain, e.g. `https://www.rkshahifoundation.org`).

## 3. Install & create your first admin login
```
npm install
node create-admin.js youradmin YourStrongPassword123
```
This bcrypt-hashes the password and inserts/updates the row in `AdminUsers`.
Run it again anytime to reset a password.

## 4. Run
```
npm start
```
API listens on `PORT` from `.env` (default 4000), exposing:
- `POST /api/auth/login`
- `GET  /api/legal/public` — public registration list
- `GET  /api/legal/public/:id/file` — public certificate download
- `GET  /api/legal/admin` (auth) — full list incl. private
- `PUT  /api/legal/admin/:id` (auth) — update fields/visibility
- `POST /api/legal/admin/:id/file` (auth) — upload/replace PDF
- `DELETE /api/legal/admin/:id/file` (auth) — remove PDF
- `GET  /api/legal/admin/:id/file` (auth) — download any file for review

## 5. Deploying on Plesk
- Plesk → your domain → **Node.js** → set document root to this `backend` folder,
  application startup file `server.js`.
- Set the same `.env` variables in Plesk's Node.js "Custom Environment Variables" panel
  (or keep the `.env` file — dotenv reads it either way).
- Plesk will run `npm install` for you on deploy (or run it manually via Plesk's
  "NPM install" button).
- Point `LEGAL_API_BASE` in the frontend's `legal-api.js` to this app's URL —
  either a subpath via reverse proxy (`/api`) or a subdomain
  (`https://api.rkshahifoundation.org/api`).

## Notes
- Uploaded PDFs are stored on disk under `backend/uploads/` (not in git — make sure
  this folder persists across deploys, or point it at a mounted/persistent path).
- Max upload size is controlled by `UPLOAD_MAX_MB` in `.env` (default 5MB).
- Passwords are bcrypt-hashed; sessions are JWTs valid for `JWT_EXPIRES_IN` (default 8h).
