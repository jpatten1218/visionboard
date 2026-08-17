# Vision Board

An iPhone-first implementation of the Functional Vision Board from Matt
Vincent's workbook. Next.js on Vercel, Postgres on Supabase.

## What it does

The workbook's system, not a generic goal tracker:

| Screen | Workbook part | What it holds |
| --- | --- | --- |
| **Board** | Part 02 — the pyramid | One macro goal per screen with its micro and mini goals under it. Swipe sideways between macro goals. |
| **Today** | Part 03 — floor and ceiling | Atomic non-negotiables with streaks, plus the day's mini goals. |
| **Evidence** | Part 05 — progress, not perfection | A running count, an eight-week density grid, and every win stacked by date. |
| **Parked** | Part 04 — avoidance list | Ideas with priority, revisit date, and what they'd replace. |
| **Compass** | Parts 01 and 06 | Universal goals, weekly consistency, journal and self-inquiry prompts, reading list. |

Two of the workbook's rules are enforced in code rather than left to
willpower:

- **Universal goals can never be completed.** A database constraint rejects it.
  They are directions you live, not checkboxes.
- **Nothing leaves the Avoidance List until a macro goal is finished.** Each
  finished macro buys exactly one pull, and spent pulls are not reusable.

### On not using sticky notes

The workbook is analog on purpose, and a skeuomorphic corkboard is unreadable
at 390pt. What carries over is the gesture — swipe a card right and it leaves
the board for Evidence — and the per-tier colour, as a card stripe. What
digital adds is the only thing the whiteboard can't do: it counts, and nothing
falls off the wall.

## Setup

### 1. Supabase

Project `visionboard` already exists (`hrhsgmqrsmyqayzlnvbt`, us-east-1) with
the schema and seed data applied. To recreate it elsewhere, apply the
migrations in order from the Supabase dashboard's SQL editor.

### 2. Environment variables

Copy `.env.example` to `.env.local` for local work, and set the same three in
Vercel under **Settings → Environment Variables**:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hrhsgmqrsmyqayzlnvbt.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → `service_role`. **Secret** — never prefix it with `NEXT_PUBLIC_`. |
| `VISION_BOARD_PASSCODE` | Anything you choose. Leave unset and the board is open to anyone with the URL. |

### 3. Run it

```bash
npm install
npm run dev
```

`npm run icons` regenerates the app icons after editing `public/icon.svg`.

## iPhone notes

Open the deployed URL in Safari, then **Share → Add to Home Screen**. It
launches without browser chrome, draws correctly around the notch and home
indicator, and keeps the status bar translucent.

Specific accommodations, since these are the things that usually make a web app
feel wrong on iOS:

- Form fields are 16px, which is what stops Safari zooming the page on focus.
- Scale is locked and `viewport-fit=cover` is set, with `env(safe-area-inset-*)`
  padding on the tab bar and screen edges.
- `overscroll-behavior: none` kills the rubber-band bounce that otherwise
  reveals the page background in standalone mode.
- `touch-action: manipulation` drops the 300ms double-tap delay; tap targets
  are at least 44pt.
- Heights use `dvh`, so Safari's collapsing toolbars don't clip the layout.

## Security

There are no user accounts yet. Nothing reaches Supabase from the browser —
every read and write runs in a server action, and RLS denies the `anon` role
outright. `docs/SECURITY.md` records what that does and doesn't protect, and
the four steps to add real accounts later.
