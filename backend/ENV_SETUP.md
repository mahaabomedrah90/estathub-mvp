# Environment Configuration Guide

## 🎯 Quick Start for New Developers

```bash
# 1. Copy the example file
cp .env.example .env.local

# 2. Edit .env.local with your real credentials
# (see sections below for details)

# 3. Create local database
createdb estathub_db

# 4. Run migrations
npx prisma migrate dev

# 5. Start development
npm run dev
```

---

## 📁 Environment Files Explained

| File | Purpose | Gitignored? | Contains Secrets? |
|------|---------|-------------|-------------------|
| `.env.example` | Template with documentation | No | No (placeholders) |
| `.env` | Safe defaults / CI fallback | No | No |
| `.env.local` | **Your real local values** | ✅ Yes | ✅ Yes |
| `.env.production` | Production template | Yes | No (platform provides) |

**Prisma Load Order:** `.env` → `.env.local` (local overrides) → System env vars

---

## 🔐 Security Rules (CRITICAL)

### ❌ NEVER COMMIT:
- `.env.local` (contains real passwords)
- `.env.production` with real credentials
- Any file with `DATABASE_URL` containing real passwords
- JWT secrets, API keys, private keys

### ✅ SAFE TO COMMIT:
- `.env.example` (documentation template)
- `.env` (only placeholder values)
- This README

---

## 🗄️ Database Setup

### Option 1: Local PostgreSQL (Recommended for Development)

```bash
# Install PostgreSQL if not installed
# On macOS: brew install postgresql
# On Ubuntu: sudo apt install postgresql

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Ubuntu

# Create database
createdb estathub_db

# Verify connection
psql -d estathub_db -c "SELECT 1;"
```

**Update `.env.local`:**
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/estathub_db"
```

### Option 2: Render PostgreSQL (Production)

1. Create PostgreSQL instance on Render
2. Copy Internal Database URL
3. Add to Render Dashboard → Environment Variables
4. **Never save production URL in any file!**

### Option 3: Supabase PostgreSQL

1. Create project on Supabase
2. Settings → Database → Connection String
3. Use "Transaction pooler" for serverless

---

## 🔑 Generating Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example: a3f5b2c8d9e1f4a7b6c3d8e5f1a2b4c7...
```

---

## 🚀 Production Deployment (Render)

1. **Go to Render Dashboard** → Your Service → Environment
2. **Add Environment Variables:**
   - `DATABASE_URL`: From your Render PostgreSQL
   - `JWT_SECRET`: Generated secret (32+ chars)
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: Your frontend URL

3. **Remove or clear** any `.env.production` file in repo
4. **Deploy** - Render uses dashboard env vars, not files

---

## 🔍 Troubleshooting

### Error: "Can't reach database server"
- Check `DATABASE_URL` in `.env.local`
- Verify PostgreSQL is running: `pg_isready`
- Check database exists: `psql -l | grep estathub`

### Error: "password authentication failed"
- Wrong password in `DATABASE_URL`
- Check PostgreSQL user exists: `psql -c "\du"`

### Error: "database does not exist"
- Run: `createdb estathub_db`
- Or: `psql -c "CREATE DATABASE estathub_db;"`

---

## 📝 Checklist Before Committing

- [ ] `.env.local` is NOT staged: `git status`
- [ ] `.env` contains ONLY placeholder values
- [ ] No real passwords in any committed file
- [ ] `DATABASE_URL` in `.env` uses generic format: `postgresql://USER:PASSWORD@HOST:5432/DATABASE`

---

## 📚 Prisma Commands Reference

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (development)
npx prisma migrate dev

# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# View database schema
npx prisma db pull
```
