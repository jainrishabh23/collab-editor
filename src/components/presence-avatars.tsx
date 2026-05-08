"use client";

import { useEffect, useState } from "react";
// import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

type AwarenessUser = {
  // Optional: CollaborationCaret overwrites the awareness `user` field with its
  // own { name, color } payload on init, dropping any id we set earlier.
  id?: string;
  name: string;
  color: string;
};

type AwarenessState = {
  user?: AwarenessUser;
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

      // Dedupe by user.id when present, else by clientID. Each Yjs peer has
      // a unique clientID, so falling back to it shows one avatar per tab when
      // the id has been stripped by another awareness writer.
      const map = new Map<string, DisplayUser>();
      for (const [clientID, state] of entries) {
        if (!state.user) continue;
        const id =
          typeof state.user.id === "string" ? state.user.id : null;
        const key = id ?? `client-${clientID}`;
        if (map.has(key)) continue;
        map.set(key, {
          key,
          name: state.user.name,
          color: state.user.color,
          isYou:
            clientID === localClientID ||
            (id !== null && id === localUserId),
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