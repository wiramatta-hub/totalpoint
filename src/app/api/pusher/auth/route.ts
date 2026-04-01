import { NextRequest, NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

/**
 * POST /api/pusher/auth
 * Required by Pusher for private/presence channels.
 * For this app we use public channels (user-{line_uid}), so this
 * endpoint is included as a foundation for future private-channel upgrades.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
      return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch (err) {
    console.error("[POST /api/pusher/auth]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
