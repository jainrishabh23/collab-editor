"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SlashCommandItem } from "@/lib/editor/slash-command-extension";

type Props = {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
};

export type SlashCommandListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const SlashCommandList = forwardRef<SlashCommandListRef, Props>(
  function SlashCommandList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      // Reset selection whenever the filtered list changes
      setSelectedIndex(0);
    }, [items]);

    function selectItem(index: number) {
      const item = items[index];
      if (item) command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-lg border bg-popover text-popover-foreground shadow-md p-3 text-sm text-muted-foreground w-72">
          No matching commands
        </div>
      );
    }

    return (
      <div className="rounded-lg border bg-popover text-popover-foreground shadow-md w-72 max-h-80 overflow-y-auto py-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
              index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
              {item.icon}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium leading-tight">
                {item.title}
              </span>
              <span className="text-xs text-muted-foreground leading-snug mt-0.5">
                {item.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }
);

export default SlashCommandList;