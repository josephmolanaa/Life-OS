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
Next work: ActivityWatch rule mapping untuk rename app dan category override.

