import Pusher from "pusher";

// Singleton for the Pusher Server SDK
const globalForPusher = globalThis as unknown as {
  pusher: Pusher | undefined;
};

export const pusherServer =
  globalForPusher.pusher ??
  new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPusher.pusher = pusherServer;
}

/**
 * Channel naming convention: `user-{line_uid}`
 * Event names: `point-update`
 */
export const getUserChannel = (lineUid: string) => `user-${lineUid}`;
export const POINT_UPDATE_EVENT = "point-update";
