# Mnetto

A cross-platform network engineering toolkit with a terminal-style UI:
subnet calculator, port scanning, cloud-synced sessions, and MiRAi — a
built-in AI assistant backed by the real Claude API. Ships as a desktop
app (Electron), Android app (Capacitor), and a web version.

## Run it (development)

```bash
npm install
npm run dev
```

## Setting up cloud storage (Supabase)

Cloud sync uses [Supabase](https://supabase.com) — free tier, gives you
auth + a database together, no backend server for you to run.

1. Create a free project at supabase.com
2. In the SQL editor, run this to create the sessions table with
   row-level security (so users can only ever see their own data):

   ```sql
   create table sessions (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users not null,
     kind text not null,
     payload jsonb not null,
     created_at timestamptz default now()
   );

   alter table sessions enable row level security;

   create policy "Users can read their own sessions"
     on sessions for select using (auth.uid() = user_id);

   create policy "Users can insert their own sessions"
     on sessions for insert with check (auth.uid() = user_id);
   ```

3. In Project Settings > API, copy your Project URL and `anon` `public` key
4. Copy `.env.example` to `.env` and fill both values in
5. Restart `npm run dev`

Then in the app: `cloud login you@email.com` → click the magic link
emailed to you → `cloud whoami` to confirm → `cloud save` after any
subnet calculation → `cloud history` to see saved sessions.

The `anon` key is safe to ship in your built app — it's meant to be
public. What actually protects user data is the row-level security
policy above, which is why that SQL step isn't optional.

## Setting up MiRAi (the AI assistant)

MiRAi calls the real Anthropic API, but *how* the key is handled is
different depending on which build you're running — this matters, so
here's exactly what happens on each:

- **Desktop (Electron):** the call runs entirely in the main process.
  Your key is encrypted at rest via the OS keychain (Keychain/DPAPI/
  libsecret) and never enters the UI code at all.
- **Web / Android:** browsers can't run a hidden main process, so the
  key is stored in that browser's `localStorage` and the request is
  sent directly from the browser to Anthropic, using a header
  (`anthropic-dangerous-direct-browser-access`) Anthropic added
  specifically for this "bring your own key" pattern. Each visitor's
  key stays in their own browser only — it's never sent to your
  server, never shared with other visitors, and never committed to
  the repo.

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. In the app: `mirai key sk-ant-...`
3. Then just: `mirai what's the difference between a /24 and /25?`

**Important for a public release either way:** each user needs their
own API key — you can't safely embed one key inside a distributed
`.exe` or a public website, since anyone could extract it (trivially,
on the web version — it'd be sitting in the page's network requests)
and rack up charges on your account. If you eventually want visitors
to use MiRAi *without* needing their own key, that means running a
small backend server you control that holds the key and meters usage
— a real (small) project on its own, ask me when you're ready.

## Deploying the web version (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy-web.yml`) builds
and deploys the web version automatically on every push to `main`.

1. In your GitHub repo: **Settings > Pages > Source**, select
   "GitHub Actions"
2. In **Settings > Secrets and variables > Actions**, add two repo
   secrets: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same
   values as your local `.env`)
3. Push to `main` — the workflow builds `dist/` and publishes it
4. Your site goes live at `https://<your-username>.github.io/<repo-name>/`

What works on the deployed website vs. what doesn't, and why:

| Feature | Web | Why |
|---|---|---|
| Subnet calculator | ✅ | Pure JS, runs anywhere |
| Cloud storage / teams | ✅ | Supabase client works in any browser |
| MiRAi | ✅ | Uses the browser-access header + per-visitor key, see above |
| `ping` / `nmap` | ❌ desktop only | Browsers are sandboxed from spawning system processes — this is a security boundary, not a missing feature, and can't be worked around from a website |
| LAN discovery | ❌ desktop only | Same reason — no browser can send raw network broadcasts |

The terminal shows a clear "desktop app only" message for these
instead of failing silently.

## Building the actual .exe

```bash
npm run build      # bundles the React UI
npm run dist        # packages Electron + UI into an installer
```

Output lands in `release/`. A few things that matter here:

- **electron-builder cross-builds by target, not by your current OS
  alone.** Building the Windows target from macOS/Linux needs
  [Wine](https://www.winehq.org/) installed locally, or — the far more
  reliable path — build on an actual Windows machine or a Windows CI
  runner (e.g. GitHub Actions with a `windows-latest` runner).
- **Unsigned .exe files get flagged.** Windows SmartScreen and most
  antivirus will warn users on an unsigned installer, especially one
  that shells out to `nmap`/network tools. For real distribution
  you'll want a code-signing certificate (~$100–400/yr from a CA like
  DigiCert or Sectigo, or a cheaper option via SignPath for open source).
- **The `.env` file is NOT bundled** into the built app by default —
  Vite only reads it at build time to inline the Supabase values into
  the compiled JS. That's expected and fine (those values are meant to
  be public). Your Anthropic key, by contrast, is never read from
  `.env` at all — it's entered per-user at runtime and stored
  encrypted locally, which is exactly what you want.

## Project layout

```
electron/
  main.js      # Electron main process — window creation, the ONLY place
               # allowed to spawn external tools (nmap/ping/tshark) or
               # call the Claude API directly
  preload.js   # Narrow, explicit bridge between the sandboxed UI and main.js
src/
  components/
    Terminal.jsx       # Terminal-style UI: input, scrollback, history
  lib/
    subnetCalculator.js  # Pure math, fully working, no dependencies
    commands.js           # Routes typed commands to logic (subnet/cloud/mirai/nmap)
    cloud.js               # Supabase client: auth + save/list sessions
```

## Commands available today

```
subnet 192.168.1.0/24
ping 1.1.1.1
nmap -sV 192.168.1.1          (requires nmap installed)
cloud login you@email.com
cloud save
cloud history
mirai key sk-ant-...
mirai what's a broadcast address?
```

## Status

| Feature | Status |
|---|---|
| Subnet calculator | ✅ Fully working (desktop, Android, web) |
| Terminal UI shell | ✅ Working |
| `ping` / `nmap` | ✅ Desktop only — see table above for why |
| Cloud storage / team workspaces (Supabase) | ✅ Working everywhere once you complete setup above |
| MiRAi (Claude API) | ✅ Working everywhere, key handling differs by platform (see above) |
| Web deployment (GitHub Pages) | ✅ Auto-deploys on push via GitHub Actions |
| Android build (Capacitor) | ✅ Auto-builds APK via GitHub Actions |
| Packet capture (Wireshark-style) | 🚧 Not built — needs elevated OS permissions, see prior notes |
| Network simulator (Packet Tracer-style) | ⏸️ Deliberately deferred — large scope, v2+ |
| Code signing for distribution | 🚧 Needed before public release, not automated here |
