# Setting up cloud sync (Supabase + Google sign-in)

The app works fully offline out of the box (everything lives in
`localStorage`). This turns on optional cross-device sync via Supabase, with
Google as the sign-in method. Nothing here is required — skip it and the app
behaves exactly as it does today.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's created, go to **Settings → API**. You'll need two values:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
   - **anon / public key** (NOT the `service_role` key — that one must never
     appear in client-side code)

## 2. Run the schema

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in the contents of `supabase-schema.sql` (shipped alongside this
   file) and click **Run**.
3. This creates two tables (`mistakes`, `user_settings`) with row-level
   security so each signed-in user can only ever read or write their own
   rows.

## 3. Set up Google OAuth

Supabase needs a Google OAuth Client ID/Secret to let people sign in with
Google.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   create a project (or use an existing one).
2. **APIs & Services → OAuth consent screen** — configure it (External is
   fine for most cases), add your app name and support email.
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   → Application type: **Web application**.
4. In Supabase, go to **Authentication → Sign In / Providers → Google** and
   copy the **Callback URL (for OAuth)** shown there.
5. Back in Google Cloud, paste that callback URL into **Authorized redirect
   URIs** on the OAuth client you just created, then save.
6. Copy the generated **Client ID** and **Client Secret** into the Google
   provider settings in Supabase, and toggle it **Enabled**.

## 4. Allow your hosted page as a redirect target

In Supabase, go to **Authentication → URL Configuration** and add the exact
URL you're hosting `mistex.html` at (e.g. `https://yourdomain.com/` or
`https://yourdomain.com/mistex.html`) to **Redirect URLs**. Without this,
Google will redirect back but Supabase will refuse to complete the sign-in.

## 5. Fill in the two config lines

Open `mistex.html`, find this block (search for `SUPABASE_URL`):

```js
const SUPABASE_URL = "";       // e.g. "https://xxxxxxxx.supabase.co"
const SUPABASE_ANON_KEY = "";  // the "anon" / "public" key, never the service_role key
```

Fill in your Project URL and anon key from step 1. That's it — reload the
page, go to Settings → Account, and "Sign in with Google" will appear.

## What happens once it's configured

- Signing in pulls any existing cloud data and merges it with whatever's
  already local (last-write-wins per mistake, based on which was reviewed
  more recently).
- Every local change (grading a card, editing a mistake, changing settings)
  is pushed to Supabase automatically a couple seconds after you make it.
- Signing out just stops syncing — nothing is deleted, and the app keeps
  working locally.
- If a sync push or pull fails (offline, expired session, etc.), the
  Account section in Settings shows the error instead of failing silently.

## Security notes

- The `anon` key is meant to be public — it's safe to ship in client-side
  code. Row-level security (set up by `supabase-schema.sql`) is what
  actually restricts access, not the secrecy of that key.
- Never put your `service_role` key in this file — it bypasses row-level
  security entirely.
