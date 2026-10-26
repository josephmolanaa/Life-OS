# Life OS

Personal command center for finance, activity, habits, and progress.

## Stack

- Next.js App Router
- Supabase Auth + PostgreSQL
- Recharts
- Installable web app; internet required for loading and saving account data.
  Offline requests are not cached or queued. Local form drafts do not imply a saved record.
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
Closing the app window hides Life OS in the Windows notification-area hidden icons;
use the tray menu to reopen it or quit. On first install, startup with Windows is
enabled by default and can be toggled from the tray menu. Startup launches hidden.

Git pushes do not publish desktop updates. `npm run desktop:publish` requires a
GitHub token via `GH_TOKEN` and publishes the installer, blockmap, and `latest.yml`
to the configured GitHub repository. Bump the package version for each release.
Never commit tokens or bundle `.env.local`.

ActivityWatch desktop data is owner-scoped. Set either `ACTIVITYWATCH_OWNER_ID`
to the Supabase user ID, or `ACTIVITYWATCH_OWNER_EMAIL` to the email that owns
the local ActivityWatch installation. Email is case-insensitive. Without one of
these settings, live device data stays disabled; another signed-in account can
only see its own cached activity.
The Windows installer packages only these two owner values from `.env.local`; rebuild
the installer after changing them. ActivityWatch must be running locally on port 5600.

Versions that crash before startup cannot update themselves. Install the fixed
1.0.4 installer manually once; subsequent updates use GitHub releases.

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
