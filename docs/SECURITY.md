# Security model

The board has no user accounts yet — that was a deliberate call to get a working
board fast. This document records what that costs and how the gap is covered, so
the tradeoff stays visible.

## What protects the data today

**Nothing reaches Supabase from the browser.** There is no client-side Supabase
client and no anon key in the bundle. Every read and write runs inside a server
action using the service role key, which lives only in the server environment.

**RLS denies everyone.** Every table has row-level security enabled with no
permissive policy for the `anon` or `authenticated` roles. Even if the anon key
were published, it would read nothing. The service role bypasses RLS by design,
which is why it must never cross to the client.

**An optional passcode gates the app.** Set `VISION_BOARD_PASSCODE` and the app
asks for it once, then stores a signed, HTTP-only cookie. This is a door lock,
not an identity system: it does not distinguish between people, and anyone with
the passcode has full access.

## What is not protected

- **Without `VISION_BOARD_PASSCODE`, anyone with the URL has full read/write
  access.** Set it before putting the deployment anywhere linkable.
- **There is no per-user separation.** One passcode, one board. The schema
  carries an `owner_id` column on every row so real accounts can be added later
  without a data migration, but nothing enforces it yet.
- **No audit trail.** Deletions are soft where it matters, but there is no
  record of who changed what, because there is no "who".

## Adding real auth later

The path is deliberately short:

1. Turn on a Supabase auth provider (magic link needs no extra accounts).
2. Backfill `owner_id` on existing rows to the first real user.
3. Replace the deny-all RLS policies with `auth.uid() = owner_id`.
4. Swap the server-action Supabase client for a request-scoped SSR client and
   drop the service role key from the runtime.

No table shape changes are required for any of that.
