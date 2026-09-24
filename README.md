# Life OS

Personal command center for finance, activity, habits, and progress.

## Stack
- Next.js App Router
- Supabase Auth + PostgreSQL
- Recharts
- PWA first
- Desktop-ready shell for Tauri later

## Run
```bash
npm install
npm run dev
```

## Scope
- `/finance` main dashboard
- `/finance/transactions` quick logging
- `/finance/wallets` wallet manager
- `/finance/reports` monthly analytics
- `/finance/budgets` budget guard
- `/finance/loans` give/get tracker
- `/finance/btc` DCA log
- `/finance/net-worth` snapshots
- `/finance/activity` ActivityWatch raw feed

## Modules
- Dashboard: / overview semua modul.

- Finance: /finance khusus uang, wallet, budget, reports.

- ActivityWatch: /activitywatch baca app/window lokal.

- Habits: /habits checklist harian.


## ActivityWatch
Jalankan ActivityWatch lokal di http://localhost:5600 untuk data live.

Kalau ActivityWatch offline, Life OS tampilkan fallback aman tanpa crash.


## Todos
Daily todos memakai /api/todos dan fallback lokal saat Supabase belum siap.


## Database
Migration awal ada di supabase/migrations/001_create_todos_table.sql.


## Routes
Route lama /finance/activity redirect ke /activitywatch.


## Push Notes
Perubahan modularisasi dipisah jadi commit kecil tanpa empty commit.


## Next
Next work: CRUD UI untuk career_goals dan career_projects.

## Career
Modul /career adalah command center untuk target career: AI Engineer + Investor (sesuai diagram draw.io).

3 Cabang utama:
- AI Engineer: Python, ML, Deep Learning, NLP, MLOps, API, Database, Git, Cloud
- Economics: Fundamental/Technical Analysis, Portfolio, Risk, Crypto, Macro
- Soft Skills: Problem Decomposition, Self-Directed Learning, Documentation, Time Estimation

### Data Mirror
Hours per skill dihitung otomatis dari 2 sumber:
1. activity_events_cache (Supabase) - mirror dari ActivityWatch lokal, via write-through cache
2. 	odos (Supabase) - habit harian ber-tag Career (misal "Belajar AI 1 jam", "Push GitHub Streak")

Mapping app ke skill slug:
- VS Code / Cursor -> Python / AI Engineering
- PyTorch / TensorFlow -> Deep Learning
- TradingView -> Technical Analysis
- Notion / Obsidian -> Documentation
- GitHub -> Git & Version Control

## Database
Semua migration ada di supabase/migrations/:
- 001_create_todos_table.sql - tabel todos + contributions
- 002_create_activity_rules_table.sql - tabel activity_app_rules (rule mapping)
- 003_create_activity_cache_table.sql - tabel activity_events_cache (write-through AW cache)
- 004_create_career_tables.sql - tabel career_goals, career_skills, career_projects




