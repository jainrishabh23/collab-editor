"use client";

import { useEffect, useState } from "react";
// import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

type AwarenessUser = {
  // CollaborationCaret overwrites the awareness `user` field with its own
  // { name, color } payload on init, dropping any id we set earlier.
  id?: string;
  name: string;
  color: string;
};

// Our own field, written alongside `user`. CollaborationCaret doesn't touch it,
// so the id survives and we can dedupe stably across refresh races.
type AwarenessUserMeta = {
  id: string;
  name: string;
  color: string;
};

type AwarenessState = {
  user?: AwarenessUser;
  userMeta?: AwarenessUserMeta;
};

type DisplayUser = {
  key: string;
  name: string;
  color: string;
  isYou: boolean;
};

type Props = {
    // provider: WebrtcProvider;
  provider: WebsocketProvider;
  localUserId: string;
};

export default function PresenceAvatars({ provider, localUserId }: Props) {
  const [users, setUsers] = useState<DisplayUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;
    const localClientID = awareness.clientID;

    function update() {
      const entries = Array.from(awareness.getStates().entries()) as [
        number,
        AwarenessState,
      ][];

      // Dedupe by userMeta.id when present, else by clientID. Two simultaneous
      // connections from the same user (refresh race: old socket lingering in
      // awareness while new one connects) collapse to one avatar because both
      // carry the same userMeta.id even though their Yjs clientIDs differ.
      // userMeta is read first for display fields; we fall back to `user`
      // (CollaborationCaret's stripped { name, color }) only if userMeta is
      // missing — e.g. a peer running an older client without userMeta.
      const map = new Map<string, DisplayUser>();
      for (const [clientID, state] of entries) {
        const meta = state.userMeta;
        const fallback = state.user;
        if (!meta && !fallback) continue;

        const key = meta?.id ?? `client-${clientID}`;
        if (map.has(key)) continue;

        map.set(key, {
          key,
          name: meta?.name ?? fallback?.name ?? "?",
          color: meta?.color ?? fallback?.color ?? "#888",
          isYou:
            (meta?.id !== undefined && meta.id === localUserId) ||
            clientID === localClientID,
        });
      }

      setUsers(Array.from(map.values()));
    }

    update();
    awareness.on("change", update);
    return () => {
      awareness.off("change", update);
    };
  }, [provider, localUserId]);

  if (users.length === 0) return null;

  // Show up to 4 avatars; collapse the rest into a "+N" bubble.
  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar
          key={user.key}
          name={user.name}
          color={user.color}
          isYou={user.isYou}
        />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-foreground text-[10px] font-medium border-2 border-background"
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

function Avatar({
  name,
  color,
  isYou,
}: {
  name: string;
  color: string;
  isYou: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="relative inline-flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-medium text-white border-2 border-background ring-0"
      style={{ backgroundColor: color }}
      title={isYou ? `${name} (you)` : name}
    >
      {initials || "?"}
    </span>
  );
}