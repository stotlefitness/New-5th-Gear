# Google OAuth Setup Guide

This guide will help you fix the `redirect_uri_mismatch` error when using Google login.

## Your Supabase Project

Based on your configuration, your Supabase project URL is:
```
https://xezqolcqtodxzypzbdvv.supabase.co
```

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services → Credentials**
3. Find the **OAuth 2.0 Client ID** that you're using for Supabase (the one whose Client ID is in your Supabase settings)
4. Click on it to edit

### Add the Supabase Redirect URI

5. Under **Authorized redirect URIs**, click **+ ADD URI**
6. Add this exact URL (no trailing slash):
   ```
   https://xezqolcqtodxzypzbdvv.supabase.co/auth/v1/callback
   ```
7. Click **SAVE**

⚠️ **Important**: This must match EXACTLY. Common mistakes:
- ❌ Adding a trailing slash: `.../callback/`
- ❌ Using your Vercel/app URL instead
- ❌ Updating the wrong OAuth client

## Step 2: Verify Supabase Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Providers → Google**
4. Verify that the **Client ID** and **Client Secret** match the OAuth client you just updated in Google Cloud Console
5. At the top, you should see:
   ```
   Redirect URL: https://xezqolcqtodxzypzbdvv.supabase.co/auth/v1/callback
   ```
   This should match what you added in Google Cloud Console.

## Step 3: Configure Supabase Redirect URLs

1. In Supabase Dashboard, go to **Authentication → URL Configuration**
2. Set **Site URL** to your frontend URL:
   - **Local development**: `http://localhost:3000`
   - **Production**: Your Vercel/deployment URL (e.g., `https://your-app.vercel.app`)

3. Under **Additional Redirect URLs**, add:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/signup/complete
   http://localhost:3000/complete-account
   ```
   And for production:
   ```
   https://your-app.vercel.app/auth/callback
   https://your-app.vercel.app/signup/complete
   https://your-app.vercel.app/complete-account
   ```
   (Replace `your-app.vercel.app` with your actual domain)

4. Click **Save**

## Step 4: Test

After completing the above steps:

1. Clear your browser cache/cookies (or use incognito mode)
2. Try logging in with Google again
3. The `redirect_uri_mismatch` error should be resolved

## Troubleshooting

### Still getting the error?

1. **Double-check the redirect URI** in Google Cloud Console matches exactly:
   - From Supabase: `https://xezqolcqtodxzypzbdvv.supabase.co/auth/v1/callback`
   - In Google Cloud: Should be identical (no trailing slash, no typos)

2. **Verify you're using the correct OAuth Client**:
   - The Client ID in Supabase Google provider settings
   - Must match the OAuth Client ID you're editing in Google Cloud Console

3. **Wait a few minutes**: Sometimes it takes 1-2 minutes for Google's changes to propagate

4. **Check Supabase logs**: Go to Supabase Dashboard → Logs → Auth Logs to see detailed error messages

### How the Flow Works

1. User clicks "Continue with Google" → Your app calls `supabase.auth.signInWithOAuth()`
2. User is redirected to Google → Google authenticates the user
3. Google redirects back to Supabase → `https://xezqolcqtodxzypzbdvv.supabase.co/auth/v1/callback` (must be authorized in Google)
4. Supabase exchanges the code for a session → Creates/updates user
5. Supabase redirects to your app → Based on `redirectTo` in your code (must be in Supabase's allowed URLs)
6. Your app handles the callback → `/auth/callback` or `/signup/complete` route processes the session

## Current App Redirect URLs

Your app uses these redirect URLs after Google authentication:

- **Login**: `/auth/callback` → Handles regular Google login
- **Signup**: `/signup/complete` → Handles Google signup flow

Both of these must be in Supabase's **Additional Redirect URLs** list.



