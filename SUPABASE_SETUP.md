# Setting up cloud sync (Supabase + Google sign-in)

The app works fully offline out of the box (everything lives in
`localStorage`). This turns on optional cross-device sync via Supabase, with
Google as the sign-in method. Nothing here is required — skip it and the app
behaves exactly as it does today.

Your keys live in `config.js`, which is git-ignored and never committed —
`index.html` itself has no secrets in it at all.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's created, go to **Settings → API**. You'll need two values:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
   - **anon / public key** (NOT the `service_role` key — that one must never
     appear in client-side code, even in a git-ignored file)

## 2. Run the schema

1. In your Supabase project, open **SQL Editor → New query**.
2. Paste in the contents of `supabase_schema.sql` (shipped alongside this
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
URL you're hosting `index.html` at (e.g. `https://yourdomain.com/`) to
**Redirect URLs**. Without this, Google will redirect back but Supabase will
refuse to complete the sign-in.

## 5. Create your config.js

```bash
cp config.example.js config.js
```

Open `config.js` and fill in your Project URL and anon key from step 1:

```js
window.MISTEX_SUPABASE_URL = "https://xxxxxxxx.supabase.co";
window.MISTEX_SUPABASE_ANON_KEY = "your-anon-public-key-here";
```

`config.js` is listed in `.gitignore`, so it never gets committed —
`index.html` loads it at runtime (`<script src="config.js">`) but contains
no keys of its own. Reload the page, go to Settings → Account, and "Sign in
with Google" will appear.

## Deploying somewhere that isn't a plain file host

Since `config.js` is git-ignored, it won't exist on your hosting platform
unless you put it there separately:

- **Static hosts you upload to directly** (a plain web server, S3, etc.):
  upload `config.js` alongside `index.html` manually — it just needs to sit
  in the same folder.
- **GitHub Pages / Netlify / Vercel deploying straight from the repo**:
  `config.js` won't be in the repo (that's the point), so it won't deploy
  either. Either add it as a build step that writes the file from an
  environment variable/secret before deploy, or host `config.js` outside
  the repo and load it via a full URL instead of a relative path.

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
  code. Row-level security (set up by `supabase_schema.sql`) is what
  actually restricts access, not the secrecy of that key. Keeping it out of
  git here is about hygiene (so you can freely share/fork the repo without
  thinking about it), not because the key itself is dangerous if exposed.
- Never put your `service_role` key anywhere in this project — it bypasses
  row-level security entirely and must stay server-side only, which this
  app doesn't have.
