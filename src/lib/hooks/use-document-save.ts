import { useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error"; message: string; attempt: number };

type Options = {
  documentId: string;
  initialContent: JSONContent | null;
  /** Pull the latest content. Called by the saver itself. */
  getContent: () => JSONContent | null;
  /** True when the browser thinks it's online. */
  online: boolean;
  /** Debounce ms before a save fires. Default 800. */
  debounceMs?: number;
};

const MAX_BACKOFF_MS = 30_000;

export function useDocumentSave({
  documentId,
  initialContent,
  getContent,
  online,
  debounceMs = 800,
}: Options) {
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  // What we last successfully saved, serialized for cheap equality.
  const lastSavedRef = useRef<string>(JSON.stringify(initialContent ?? null));
  // Track whether something has changed since last save.
  const dirtyRef = useRef(false);
  // Active save timer.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Backoff timer (when retrying after an error).
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Attempt counter for the current failing save.
  const attemptRef = useRef(0);

  /** Mark the document as dirty and schedule a debounced save. */
  function markDirty() {
    dirtyRef.current = true;
    setStatus({ kind: "dirty" });

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void runSave();
    }, debounceMs);
  }

  /** Attempt a save now. Handles retries internally. */
  async function runSave() {
    if (!online) {
      // Will be re-triggered by the online-watcher effect below.
      return;
    }

    const content = getContent();
    if (!content) return;

    const serialized = JSON.stringify(content);
    if (serialized === lastSavedRef.current) {
      dirtyRef.current = false;
      attemptRef.current = 0;
      setStatus({ kind: "saved", at: new Date() });
      return;
    }

    setStatus({ kind: "saving" });

    const supabase = createClient();
    const { error } = await supabase
      .from("documents")
      .update({ content })
      .eq("id", documentId);

    if (error) {
      attemptRef.current += 1;
      const attempt = attemptRef.current;
      const backoff = Math.min(1_000 * 2 ** (attempt - 1), MAX_BACKOFF_MS);

      setStatus({
        kind: "error",
        message: error.message,
        attempt,
      });

      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        void runSave();
      }, backoff);
      return;
    }

    // Success
    lastSavedRef.current = serialized;
    attemptRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // If the user typed again while we were saving, stay dirty;
    // the next debounced save will handle it.
    const latest = JSON.stringify(getContent());
    if (latest !== serialized) {
      dirtyRef.current = true;
      setStatus({ kind: "dirty" });
      // Trigger another debounced save soon.
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void runSave();
      }, debounceMs);
      return;
    }

    dirtyRef.current = false;
    setStatus({ kind: "saved", at: new Date() });
  }

  // When the browser comes back online and we're dirty or in error, flush.
  useEffect(() => {
    if (online && (dirtyRef.current || status.kind === "error")) {
      void runSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // Warn the user if they try to leave while there's unsaved work.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current || status.kind === "saving" || status.kind === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status.kind]);

  return {
    status,
    markDirty,
    /** Force a save right now (use sparingly — bypasses the debounce). */
    flush: runSave,
  };
}