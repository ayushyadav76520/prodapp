import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Scopes: we ask for Calendar (read/write) + Tasks (read/write).
// `access_type=offline` + `prompt=consent` is what makes Google hand us
// a refresh_token, which is what lets us silently re-auth the user
// on every visit without asking them to sign in again.
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
].join(" ");

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: Google gives us access_token + refresh_token here.
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : 0;
        return token;
      }

      // Subsequent requests: if the access token is still valid, reuse it.
      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }

      // Access token expired -> silently use the refresh token to get a new one.
      // This is the mechanism that avoids repeated logins.
      return refreshGoogleAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
});

async function refreshGoogleAccessToken(token: Record<string, unknown>) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      // Google sometimes rotates the refresh token; keep the new one if given.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Failed to refresh Google access token", error);
    // Mark the session as errored so the UI can prompt a manual re-login
    // only in this rare failure case (e.g. user revoked access in Google settings).
    return { ...token, error: "RefreshAccessTokenError" };
  }
}
