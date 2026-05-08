// A small palette of high-contrast, accessibility-friendly colors.
// Picked so cursors are clearly distinguishable on light and dark backgrounds.
const PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
];

/**
 * Deterministically pick a color for a user based on their ID.
 * Same userId => always the same color, in any tab, for any other viewer.
 */
export function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

/**
 * Pick a friendly display name. Falls back to the email's local-part.
 */
export function displayNameFor(email: string | undefined, fullName?: string | null): string {
  if (fullName && fullName.trim().length > 0) return fullName.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return "Anonymous";
}