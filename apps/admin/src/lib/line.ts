import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const LINE_TOKEN_VERIFICATION_URL = "https://api.line.me/oauth2/v2.1/verify";

export interface LineMemberPayload {
  memberId: string;
  lineUserId: string;
}

/**
 * Verify LINE access token and get LINE user ID
 */
export async function verifyLineToken(
  accessToken: string,
  channelId: string
): Promise<{ userId: string; displayName?: string; pictureUrl?: string } | null> {
  try {
    const res = await fetch(
      `${LINE_TOKEN_VERIFICATION_URL}?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data.client_id !== channelId) return null;
    if (data.expires_in <= 0) return null;

    return { userId: data.sub ?? data.userId };
  } catch {
    return null;
  }
}

/**
 * Get LINE profile using access token
 */
export async function getLineProfile(accessToken: string) {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }>;
}

/**
 * Middleware helper: extract and verify LINE member from request
 */
export async function getMemberFromRequest(
  req: NextRequest
): Promise<LineMemberPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET ?? "secret"
    );
    const { payload } = await jwtVerify(token, secret);
    if (!payload.memberId || !payload.lineUserId) return null;
    return {
      memberId: payload.memberId as string,
      lineUserId: payload.lineUserId as string,
    };
  } catch {
    return null;
  }
}

/**
 * Send LINE OA push message
 */
export async function sendLineMessage(
  lineUserId: string,
  messages: Array<{ type: string; text?: string; [key: string]: unknown }>
) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelAccessToken) return;

  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });
}

/**
 * Authorization helper for API routes
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
