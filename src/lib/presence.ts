// Who is online. Every open, visible tab sends a heartbeat (see PresenceHeartbeat) and page
// loads also count as activity. The time is recorded on the session, so "online" means
// "a tab was visible within the last 90 seconds".

// A visible tab pings this often...
export const HEARTBEAT_INTERVAL_MS = 30_000;
// ...so one or two missed pings are tolerated before the account shows as offline.
export const ONLINE_WINDOW_MS = 90_000;
// A session is written at most this often by a heartbeat, however many tabs are open.
export const HEARTBEAT_WRITE_INTERVAL_MS = 25_000;
// Page loads write at most this often (the heartbeat covers the time in between).
export const SESSION_TOUCH_INTERVAL_MS = 60_000;

export type Presence = "online" | "offline";

export function presenceOf(lastSeen: Date | null | undefined, now = new Date()): Presence {
  if (!lastSeen) return "offline";
  return now.getTime() - lastSeen.getTime() <= ONLINE_WINDOW_MS ? "online" : "offline";
}

export function lastSeenLabel(lastSeen: Date | null | undefined, now = new Date()): string {
  if (!lastSeen) return "Not seen yet";
  const seconds = Math.max(0, Math.floor((now.getTime() - lastSeen.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} d ago` : "Over a month ago";
}
