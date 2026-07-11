# Mnetto

A cross-platform network engineering toolkit with a terminal-style UI:
subnet calculator, port scanning, cloud-synced sessions, and MiRAi — a
built-in AI assistant backed by the free Google Gemini API. Ships as a desktop
app (Electron), Android app (Capacitor), and a web version.

## Run it (development)

```bash
npm install
npm run dev
```

## Setting up cloud storage (Supabase)

Cloud sync uses [Supabase](https://supabase.com) — free tier, gives you
auth + a database together, no backend server for you to run. This
now supports **team workspaces**: create an invite code, share it with
anyone anywhere (not just people on your network), and `cloud save`/
`cloud history` show shared team data instead of just your own.

**If you already have a `sessions` table set up** (from before team
workspaces existed), run this migration in the SQL editor — it adds
what's new without touching your existing data:

```sql
-- New tables for team workspaces
create table teams (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

create table team_members (
  team_id uuid references teams not null,
  user_id uuid references auth.users not null,
  primary key (team_id, user_id)
);

alter table teams enable row level security;
alter table team_members enable row level security;

create policy "Anyone can read teams" on teams for select using (true);
create policy "Users can create teams" on teams for insert with check (auth.uid() = created_by);
create policy "Users can see their own memberships" on team_members for select using (auth.uid() = user_id);
create policy "Users can join teams" on team_members for insert with check (auth.uid() = user_id);

-- Add team_id to your existing sessions table
alter table sessions add column team_id uuid references teams;

-- Replace the old "own data only" read policy with one that includes team data
-- (if this errors with "policy does not exist", check Database > Policies in
-- the Supabase dashboard for the exact name of your existing select policy
-- on "sessions" and swap it into the line below)
drop policy "Users can read their own sessions" on sessions;
create policy "Users can read own or team sessions" on sessions
  for select using (
    auth.uid() = user_id
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );
```

**If you're setting this up fresh** (no `sessions` table yet), run this instead:

```sql
create table teams (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

create table team_members (
  team_id uuid references teams not null,
  user_id uuid references auth.users not null,
  primary key (team_id, user_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  team_id uuid references teams,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table sessions enable row level security;

create policy "Anyone can read teams" on teams for select using (true);
create policy "Users can create teams" on teams for insert with check (auth.uid() = created_by);
create policy "Users can see their own memberships" on team_members for select using (auth.uid() = user_id);
create policy "Users can join teams" on team_members for insert with check (auth.uid() = user_id);

create policy "Users can read own or team sessions" on sessions
  for select using (
    auth.uid() = user_id
    or team_id in (select team_id from team_members where user_id = auth.uid())
  );
create policy "Users can insert their own sessions" on sessions
  for insert with check (auth.uid() = user_id);
```

Setup, either way:
1. In Project Settings > API, copy your Project URL and `anon` `public` key
2. Copy `.env.example` to `.env` and fill both values in
3. **In Authentication > Email Templates**, open the **"Magic Link"**
   template and add `{{ .Token }}` somewhere in the body (e.g. "Your
   Mnetto sign-in code is: {{ .Token }}"). This makes the email show a
   plain 6-digit code instead of relying on a clickable link.
4. Restart `npm run dev`

Login uses a **6-digit emailed code you type into the app**, not a
clickable link — this was a deliberate switch, and it matters: a
clickable magic link has to redirect back to some specific URL, which
gets messy across four different platforms (web, dev, desktop,
Android) each running at a different address — that's what caused the
earlier `localhost:3000` problem. A typed code sidesteps that
entirely: it works identically everywhere, no redirect URL
configuration needed, no custom URL scheme, nothing platform-specific.

```
cloud login you@email.com          → emails a 6-digit code
cloud verify 123456                 → completes sign-in
cloud whoami                        → confirm you're signed in
cloud team create                   → get an invite code, e.g. "K3PQZ1"
cloud team join K3PQZ1              → (on any other device, anywhere) join that team
cloud save                          → after a subnet calc — visible to the whole team now
cloud history                       → shows your saved data + your team's, from any device
```

The `anon` key is safe to ship in your built app — it's meant to be
public. What actually protects data (private vs. shared-with-team) is
the row-level security policy above, which is why that SQL step isn't
optional.

## Setting up MiRAi (the AI assistant — free)

MiRAi runs on **Google Gemini's free tier** (`gemini-2.5-flash`) — no
credit card, no cost. *How* the key is handled differs by build:

- **Desktop (Electron):** the call runs entirely in the main process.
  Your key is encrypted at rest via the OS keychain (Keychain/DPAPI/
  libsecret) and never enters the UI code at all.
- **Web / Android:** browsers can't run a hidden main process, so the
  key is stored in that browser's `localStorage` and the request goes
  directly from the browser to Google — Gemini's REST API supports
  this natively (CORS-enabled with just the API key header, no proxy
  needed). Each visitor's key stays in their own browser only — never
  sent to your server, never shared with other visitors, never
  committed to the repo.

1. Get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (starts with `AIza...`, no credit card required)
2. In the app: `mirai key AIza...`
3. Then just: `mirai what's the difference between a /24 and /25?`

**Heads up — Google reshuffles which models are free fairly often** (this
project has already hit one deprecation: `gemini-2.5-flash` moved to
paid-only for new API keys shortly after this was built). When MiRAi
starts returning "no longer available to new users" or a 404-style
model error, that's what happened — it's not a bug in the app. Fix:

1. Check [aistudio.google.com](https://aistudio.google.com) or the
   [Gemini models page](https://ai.google.dev/gemini-api/docs/models)
   for which model is currently marked free
2. Update the model name in exactly two places:
   - `electron/main.js` — the `modelName` default (search for `gemini-2.5-flash-lite`)
   - `src/lib/commands.js` — the fetch URL in the web/mobile branch (same search term)
3. Rebuild (`npm run build`) and re-deploy

Currently set to `gemini-2.5-flash-lite`, confirmed free-tier as of
this writing — but treat that as a snapshot, not a guarantee.

**Worth knowing about the free tier, so nothing surprises you:**
- Free-tier requests may be used by Google to improve their products
  (stated on their pricing page) — fine for a personal tool, worth
  knowing if privacy matters for your use case
- Rate limits exist (roughly 10 requests/minute, a few hundred/day as
  of mid-2026 — Google's limits shift over time, check the live number
  for your project in Google AI Studio)
- Even though it's free, **each user still needs their own key** —
  you can't embed a single key in a distributed app or public website
  for the same reason as any API key: it'd be extractable and anyone
  could exhaust your quota.

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
               # call the Gemini API directly
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
mirai key AIza...
mirai what's a broadcast address?
```

## Status

| Feature | Status |
|---|---|
| Subnet calculator | ✅ Fully working (desktop, Android, web) |
| Terminal UI shell | ✅ Working |
| `ping` / `nmap` | ✅ Desktop only — see table above for why |
| Cloud storage / team workspaces (Supabase) | ✅ Working everywhere once you complete setup above |
| MiRAi (Gemini API, free) | ✅ Working everywhere, key handling differs by platform (see above) |
| Web deployment (GitHub Pages) | ✅ Auto-deploys on push via GitHub Actions |
| Android build (Capacitor) | ✅ Auto-builds APK via GitHub Actions |
| Packet capture (Wireshark-style) | 🚧 Not built — needs elevated OS permissions, see prior notes |
| Network simulator (Packet Tracer-style) | ⏸️ Deliberately deferred — large scope, v2+ |
| Code signing for distribution | 🚧 Needed before public release, not automated here |
