# Setup Guide – GitHub + Plane + Cursor + VS Code

> Follow these steps exactly in order. Commands are copy‑paste ready.

---

## 1) Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `estathub-mvp` → **Private**
3. Initialize with **README** and Node `.gitignore` (optional)

### Local clone
```bash
# Replace <your-username>
git clone https://github.com/<your-username>/estathub-mvp.git
cd estathub-mvp
```

Add starter files (already present in this starter).

---

## 2) Plane Workspace & Project

1. Open https://app.plane.so
2. Create Workspace: **Estathub MVP**
3. Create Project: **MVP Development**
4. Create cycles or groups (columns):
   - Analysis & Planning
   - Development
   - Integration
   - Testing
   - Launch

### (Optional) Connect GitHub to Plane
- Plane → Workspace Settings → **Integrations** → GitHub
- Authorize access and select `estathub-mvp` repo
- Enable: *Sync commits and PRs to Plane issues*

> If integration is unavailable in your plan, keep using issue keys in commit messages to trace manually.

---

## 3) Local Dev: Node + pnpm (or npm)

Install Node 18+ and optionally pnpm:
```bash
# macOS
brew install node
npm install -g pnpm
```

---

## 4) Frontend (React) skeleton

From repo root:
```bash
cd frontend
pnpm init -y   # or: npm init -y
pnpm add react react-dom
pnpm add -D vite @vitejs/plugin-react
```

Create `index.html`, `src/main.jsx`, `src/App.jsx`, and `vite.config.js` (provided in this starter).

Run dev:
```bash
pnpm vite
# or: npx vite
```

---

## 5) Backend (Express) skeleton

From repo root:
```bash
cd backend
pnpm init -y   # or: npm init -y
pnpm add express cors dotenv morgan
pnpm add -D nodemon
```

Scripts (package.json):
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

Run API:
```bash
pnpm dev
# or: npm run dev
```

---

## 6) VS Code + Cursor

- Install **VS Code**
- Extensions:
  - GitHub Pull Requests and Issues
  - ESLint, Prettier
  - REST Client (optional)
- Install **Cursor** (https://cursor.sh)
- Open the repo with Cursor, sign in with GitHub.
- Use AI prompts in Cursor (examples in `docs/cursor_prompts.md`).

---

## 7) Environment Variables

Create `.env` files:

`backend/.env`
```
PORT=5000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://user:pass@localhost:5432/estathub
PAYTABS_KEY=REPLACE_ME
```

`frontend/.env`
```
VITE_API_BASE=http://localhost:5000
```

**Never commit `.env`**. It’s ignored by `.gitignore`.

---

## 8) GitHub Actions (CI)

The workflow provided in `.github/workflows/ci.yml` will:
- Install deps
- Lint/build frontend (vite build)
- Run backend lint

Enable Actions in the repo settings if needed.

---

## 9) Plane Issues → Branches → PR Flow

1. Create issue in Plane: `FE-01 Investor Dashboard`
2. Create branch:
```bash
git checkout -b feature/FE-01-investor-dashboard
```
3. Develop, commit with issue key:
```bash
git add .
git commit -m "FE-01: implement investor card and list"
git push origin feature/FE-01-investor-dashboard
```
4. Open PR → reviewers → mention `Closes #<github-issue>` if you created a GH issue.
5. Merge to `dev`, then promote to `main` after testing.

---

## 10) Run Everything Together

- Terminal 1 (backend):
```bash
cd backend
pnpm dev
```
- Terminal 2 (frontend):
```bash
cd frontend
pnpm dev
```

Open: http://localhost:5173

---

## 11) Next Steps

- Add authentication (Nafath integration placeholder)
- Payment gateway integration (PayTabs)
- Smart wallet module
- Internal marketplace endpoints
