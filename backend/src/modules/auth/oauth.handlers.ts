import type { CookieOptions, RequestHandler, Response } from "express";
import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { findOrCreateGoogleUser, issueTokens } from "./auth.service.js";

const OAUTH_GOOGLE_STATE = "oauth_google_csrf";

function cookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  };
}

function redirectWithTokens(res: Response, accessToken: string, refreshToken: string) {
  const url = new URL(env.FRONTEND_OAUTH_SUCCESS_URL);
  url.hash =
    "accessToken=" +
    encodeURIComponent(accessToken) +
    "&refreshToken=" +
    encodeURIComponent(refreshToken);
  res.redirect(302, url.toString());
}

function redirectWithOAuthError(res: Response, message: string) {
  const url = new URL(env.FRONTEND_OAUTH_SUCCESS_URL);
  url.hash = "error=" + encodeURIComponent(message);
  res.redirect(302, url.toString());
}

export const googleOAuthStart: RequestHandler = (_req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    redirectWithOAuthError(res, "Google OAuth is not configured on the server.");
    return;
  }
  const state = randomBytes(24).toString("hex");
  res.cookie(OAUTH_GOOGLE_STATE, state, cookieOpts());
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  res.redirect(302, authUrl.toString());
};

export const googleOAuthCallback: RequestHandler = async (req, res) => {
  const clear = () => {
    res.clearCookie(OAUTH_GOOGLE_STATE, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    });
  };
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      clear();
      redirectWithOAuthError(res, "Google OAuth is not configured on the server.");
      return;
    }
    const q = req.query;
    if (typeof q.error === "string") {
      clear();
      redirectWithOAuthError(
        res,
        q.error === "access_denied" ? "Sign-in was cancelled." : q.error,
      );
      return;
    }
    const code = typeof q.code === "string" ? q.code : undefined;
    const state = typeof q.state === "string" ? q.state : undefined;
    const cookieState = req.cookies?.[OAUTH_GOOGLE_STATE] as string | undefined;
    clear();

    if (!code || !state || !cookieState || state !== cookieState) {
      redirectWithOAuthError(res, "Invalid OAuth state. Try signing in again.");
      return;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      redirectWithOAuthError(res, tokenJson.error ?? "Google token exchange failed.");
      return;
    }

    const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const profile = (await ui.json()) as { sub?: string; email?: string; picture?: string };
    if (!profile.sub || !profile.email) {
      redirectWithOAuthError(res, "Google did not return a complete profile.");
      return;
    }

    const user = await findOrCreateGoogleUser({
      sub: profile.sub,
      email: profile.email,
      picture: profile.picture,
    });
    const tokens = await issueTokens({
      userId: user._id as Types.ObjectId,
      role: user.role,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    redirectWithTokens(res, tokens.accessToken, tokens.refreshToken);
  } catch (e: unknown) {
    clear();
    const msg = e instanceof Error ? e.message : String(e);
    redirectWithOAuthError(res, msg);
  }
};
