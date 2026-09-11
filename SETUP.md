# Setup Guide — Google Sign-In + Deployment

## Step 1 — Google Cloud Console (5 minutes, free)

1. Go to https://console.cloud.google.com/ and create a new project (any name).
2. In the left sidebar: **APIs & Services → Library**
   - Search "Google Calendar API" → click **Enable**
   - Search "Tasks API" → click **Enable**
3. Go to **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill app name, your email, etc.
   - Add scopes: `.../auth/calendar` and `.../auth/tasks`
   - Add your own email as a "Test user" (while app is unpublished, only test
     users can log in — this is fine for personal use, still 100% free)
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs — add BOTH of these (you'll add the real one
     after deploying in Step 3):
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR-VERCEL-URL.vercel.app/api/auth/callback/google`
   - Click Create → copy the **Client ID** and **Client Secret**

## Step 2 — Local setup

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your real `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET`.

Generate a secret for `AUTH_SECRET`:
```bash
openssl rand -base64 32
```
Paste the output into `.env.local`.

Then:
```bash
npm install
npm run dev
```
Open http://localhost:3000 and test "Connect Google Account".

## Step 3 — Deploy for free (Vercel)

1. Push this project to a GitHub repo (create one on github.com, free).
2. Go to https://vercel.com → Sign up with GitHub (free).
3. Click **Add New → Project** → import your repo.
4. Before deploying, add Environment Variables (same as your `.env.local`):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL` → set this to your real Vercel URL, e.g.
     `https://your-app.vercel.app`
5. Click **Deploy**. Vercel gives you a permanent free URL.
6. Go back to Google Cloud Console → Credentials → your OAuth client →
   make sure the Vercel URL's callback is listed in Authorized redirect URIs
   (you already added a placeholder in Step 1 — update it to match exactly).

Now you (and anyone you add as a test user) can open the Vercel URL from
any phone or laptop, sign in with Google once, and stay signed in — the
app silently refreshes the session using the refresh token, so it won't
ask you to log in again unless you explicitly sign out or revoke access
from your Google Account settings.

## Notes

- This app requests `access_type: offline` + `prompt: consent`, which is
  what makes Google issue a refresh token — this is the "one-time login"
  mechanism.
- While your OAuth consent screen is in "Testing" mode, only emails you've
  added as test users can sign in. This is fine for personal/family use
  and stays free forever. Only if you want strangers to use the app would
  you need Google's app verification process (still free, just a review).
