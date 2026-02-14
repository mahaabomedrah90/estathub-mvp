# Estathub MVP - Local Development Guide

## 🚀 Quick Start (One-Time Setup)

### Prerequisites
- Node.js 16+
- Docker Desktop (for PostgreSQL)
- Git

### 1. Start Docker PostgreSQL (Database)

```bash
# Open Docker Desktop first, then run:
docker run -d --name postgres-local \
  -e POSTGRES_USER=mahaabomedrah \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=estathub_db \
  -p 5433:5432 \
  postgres:14-alpine

# Wait 10 seconds for PostgreSQL to start
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies (if not done)
npm install

# Environment is already configured in .env:
# DATABASE_URL="postgresql://mahaabomedrah:postgres123@localhost:5433/estathub_db"

# Run migrations
npx prisma migrate dev

# Seed database with demo data
npx prisma db seed

# Start backend server
npm run dev:ts
```

Backend will run on: **http://localhost:5001**

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies (if not done)
npm install

# Start frontend dev server
npm run dev
```

Frontend will run on: **http://localhost:5173**

---

## 🔐 Demo Login Credentials

All accounts use the same password:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@estathub.local | Demo123! |
| **Investor** | investor@estathub.local | Demo123! |
| **Investor 2** | fatima@investor.local | Demo123! |
| **Owner** | owner@estathub.local | Demo123! |

---

## 📊 Seeded Data

### Properties
1. **Riyadh Rental – Tower Floor 5**
   - Total Value: 5,000,000 SAR
   - Token Price: 1,000 SAR
   - Total Tokens: 5,000
   - Monthly Yield: 0.9%

2. **Jeddah Retail – Shop #12**
   - Total Value: 3,000,000 SAR
   - Token Price: 1,000 SAR
   - Total Tokens: 3,000
   - Monthly Yield: 1.1%

### Investment Orders
- investor@estathub.local owns 75 tokens across both properties
- fatima@investor.local owns 30 tokens in Riyadh property

---

## 🛠️ Daily Development Commands

```bash
# 1. Start Docker (if not running)
docker start postgres-local

# 2. Start backend (in terminal 1)
cd backend && npm run dev:ts

# 3. Start frontend (in terminal 2)
cd frontend && npm run dev

# 4. Open browser
open http://localhost:5173
```

---

## 🔧 Useful Prisma Commands

```bash
# View database in Prisma Studio
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-seed after reset
npx prisma db seed

# Generate Prisma Client after schema changes
npx prisma generate
```

---

## 🐛 Troubleshooting

### Port 5001 Already in Use
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

### Database Connection Error
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres-local

# If not running, start it
docker start postgres-local

# If container doesn't exist, recreate it
docker rm -f postgres-local
docker run -d --name postgres-local \
  -e POSTGRES_USER=mahaabomedrah \
  -e POSTGRES_PASSWORD=postgres123 \
  -e POSTGRES_DB=estathub_db \
  -p 5433:5432 \
  postgres:14-alpine
```

### Reset Everything
```bash
# Stop all processes
lsof -ti:5001 | xargs kill -9 2>/dev/null
docker stop postgres-local

# Remove database and start fresh
docker rm -f postgres-local

# Follow "Quick Start" steps 1-3 above
```

---

## 📁 Project Structure

```
estathub-mvp-starter/
├── backend/           # Express + TypeScript API
│   ├── .env           # Environment configuration
│   ├── prisma/        # Database schema & migrations
│   └── src/           # API controllers & routes
├── frontend/          # React + Vite SPA
│   └── src/           # Pages & components
└── docs/              # Documentation
```

---

## 🔒 Security Notes

- `.env.local` is gitignored and contains real credentials
- `.env` is committed but uses placeholder values (safe for production template)
- Never commit actual database passwords to git
- Demo credentials are for local development only

---

## 🌐 Available URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend App | http://localhost:5173 | Main application |
| Backend API | http://localhost:5001 | REST API endpoints |
| Prisma Studio | http://localhost:5555 | Database management |

---

## 📝 API Endpoints (Sample)

```
POST /api/auth/login          - User login
GET  /api/properties          - List all properties
POST /api/orders              - Create investment order
GET  /api/wallet              - Get user wallet balance
```

Full API documentation available in backend source code.
