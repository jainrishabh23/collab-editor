"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  documentId: string;
  initialTitle: string;
};

export default function DocumentTitle({ documentId, initialTitle }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function commitTitle() {
    const trimmed = title.trim();
    const finalTitle = trimmed === "" ? "Untitled" : trimmed;

    if (finalTitle !== title) setTitle(finalTitle);

    setEditing(false);

    if (finalTitle === savedTitle) {
      return; // nothing changed
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("documents")
      .update({ title: finalTitle })
      .eq("id", documentId);

    setSaving(false);

    if (error) {
      console.error("Title save failed:", error);
      // revert on error
      setTitle(savedTitle);
      return;
    }

    setSavedTitle(finalTitle);
    router.refresh(); // refresh server data so the nav bar shows new title elsewhere
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur(); // triggers commitTitle via onBlur
    }
    if (e.key === "Escape") {
      setTitle(savedTitle);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={handleKeyDown}
        className="font-medium bg-transparent border-b border-border focus:outline-none focus:border-primary px-1 -mx-1 max-w-[40ch]"
        maxLength={120}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className="font-medium truncate text-left hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
    >
      {title}
      {saving && (
        <span className="ml-2 text-xs text-muted-foreground font-normal">Saving…</span>
      )}
    </button>
  );
}
