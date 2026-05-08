"use client";

import { useEffect, useState } from "react";
// import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";

type AwarenessUser = {
  id: string;
  name: string;
  color: string;
};

type AwarenessState = {
  user?: AwarenessUser;
};

type Props = {
    // provider: WebrtcProvider;
  provider: WebsocketProvider;
  localUserId: string;
};

export default function PresenceAvatars({ provider, localUserId }: Props) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    const awareness = provider.awareness;

    // function update() {
    //   const states = Array.from(awareness.getStates().values()) as AwarenessState[];

    //   // Deduplicate by user id (a user might have multiple tabs open with the same id).
    //   const seen = new Set<string>();
    //   const unique: AwarenessUser[] = [];
    //   for (const state of states) {
    //     if (!state.user) continue;
    //     if (seen.has(state.user.id)) continue;
    //     seen.add(state.user.id);
    //     unique.push(state.user);
    //   }

    //   setUsers(unique);
    // }

    function update() {
    const states = Array.from(awareness.getStates().values()) as AwarenessState[];

    const map = new Map<string, AwarenessUser>();
    for (const state of states) {
        if (!state.user) continue;
        if (typeof state.user.id !== "string") continue;
        // Last writer wins on duplicate ids — fine for our use.
        map.set(state.user.id, state.user);
    }

    setUsers(Array.from(map.values()));
    }

    update();
    awareness.on("change", update);
    return () => {
      awareness.off("change", update);
    };
  }, [provider]);

  if (users.length === 0) return null;

  // Show up to 4 avatars; collapse the rest into a "+N" bubble.
  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar
          key={user.id}
          name={user.name}
          color={user.color}
          isYou={user.id === localUserId}
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