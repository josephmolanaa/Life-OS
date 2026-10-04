# Life OS

Personal command center for finance, activity, habits, and progress.

## Stack

- Next.js App Router
- Supabase Auth + PostgreSQL
- Recharts
- PWA first
- Electron desktop shell with GitHub release updates

## Run

```bash
npm install
npm run dev
```

## Windows desktop

Run `npm run desktop:build` to build the Next.js standalone server and the Windows
installer in `dist`. The build checks the packaged updater dependency tree and
server assets; rerun that check with `npm run desktop:check`.

For development, run `npm run dev -- --port 63027`, then `npm run desktop:dev`.
Installed apps start the bundled server automatically on loopback port 63027.

Git pushes do not publish desktop updates. `npm run desktop:publish` requires a
GitHub token via `GH_TOKEN` and publishes the installer, blockmap, and `latest.yml`
to the configured GitHub repository. Bump the package version for each release.
Never commit tokens or bundle `.env.local`.

Versions that crash before startup cannot update themselves. Install the fixed
1.0.2 installer manually once; subsequent updates use GitHub releases.

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
