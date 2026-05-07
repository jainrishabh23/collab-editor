"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import type { JSONContent } from "@tiptap/react";
import EditorToolbar from "./editor-toolbar";
import RelativeTime from "./relative-time";
import { useOnline } from "@/lib/hooks/use-online";
import { useDocumentSave, type SaveStatus } from "@/lib/hooks/use-document-save";
import {
  SlashCommandsExtension,
  makeSuggestionConfig,
} from "@/lib/editor/slash-command-extension";
import { slashCommands } from "@/lib/editor/slash-commands";

type EditorProps = {
  documentId: string;
  initialContent: JSONContent | null;
};

export default function Editor({ documentId, initialContent }: EditorProps) {
  // Latest content lives here so the save hook can read it on demand.
  const contentRef = useRef<JSONContent | null>(initialContent);
  const online = useOnline();

  const { status, markDirty } = useDocumentSave({
    documentId,
    initialContent,
    getContent: () => contentRef.current,
    online,
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
     SlashCommandsExtension.configure({
    suggestion: makeSuggestionConfig(slashCommands),
  }),
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
      },
    },
    onUpdate({ editor }) {
      contentRef.current = editor.getJSON();
      markDirty();
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <EditorToolbar editor={editor} />
        <SaveIndicator status={status} online={online} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function SaveIndicator({
  status,
  online,
}: {
  status: SaveStatus;
  online: boolean;
}) {
  if (!online) {
    return (
      <span
        className="text-xs text-muted-foreground shrink-0"
        title="Reconnecting..."
      >
        ⚠ Offline — changes will sync when you&apos;re back
      </span>
    );
  }

  if (status.kind === "idle") return null;

  if (status.kind === "dirty") {
    return (
      <span className="text-xs text-muted-foreground shrink-0">
        Unsaved changes…
      </span>
    );
  }

  if (status.kind === "saving") {
    return (
      <span className="text-xs text-muted-foreground shrink-0">Saving…</span>
    );
  }

  if (status.kind === "saved") {
    return (
      <span className="text-xs text-muted-foreground shrink-0">
        <RelativeTime date={status.at} prefix="Saved " />
      </span>
    );
  }

  // error
  return (
    <span
      className="text-xs text-destructive shrink-0"
      title={status.message}
    >
      Save failed (attempt {status.attempt}) — retrying…
    </span>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// import Link from "@tiptap/extension-link";
// import type { JSONContent } from "@tiptap/react";
// import EditorToolbar from "./editor-toolbar";
// import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
// import { createClient } from "@/lib/supabase/client";

// type SaveStatus = "idle" | "saving" | "saved" | "error";

// type EditorProps = {
//   documentId: string;
//   initialContent: JSONContent | null;
// };

// export default function Editor({ documentId, initialContent }: EditorProps) {
//   const [content, setContent] = useState<JSONContent | null>(initialContent);
//   const [status, setStatus] = useState<SaveStatus>("idle");
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   // Track the last content we saved, so we don't save the same thing twice.
//   const lastSavedRef = useRef<string>(JSON.stringify(initialContent ?? null));

//   const debouncedContent = useDebouncedValue(content, 800);

//   const editor = useEditor({
//     immediatelyRender: false,
//     extensions: [
//       StarterKit.configure({
//         heading: { levels: [1, 2, 3] },
//       }),
//       Placeholder.configure({
//         placeholder: "Start writing...",
//       }),
//       Link.configure({
//         openOnClick: false,
//         HTMLAttributes: {
//           class:
//             "text-primary underline underline-offset-4 cursor-pointer",
//         },
//       }),
//     ],
//     content: initialContent ?? "",
//     editorProps: {
//       attributes: {
//         class:
//           "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
//       },
//     },
//     onUpdate({ editor }) {
//       setContent(editor.getJSON());
//     },
//   });

//   // Persist content to Supabase whenever the debounced value changes.
//   useEffect(() => {
//     if (!debouncedContent) return;

//     const serialized = JSON.stringify(debouncedContent);
//     if (serialized === lastSavedRef.current) return; // nothing changed

//     let cancelled = false;
//     setStatus("saving");
//     setErrorMessage(null);

//     const supabase = createClient();
//     supabase
//       .from("documents")
//       .update({ content: debouncedContent })
//       .eq("id", documentId)
//       .then(({ error }) => {
//         if (cancelled) return;
//         if (error) {
//           console.error("Save failed:", error);
//           setErrorMessage(error.message);
//           setStatus("error");
//           return;
//         }
//         lastSavedRef.current = serialized;
//         setStatus("saved");
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, [debouncedContent, documentId]);

//   // Warn the user if they try to leave with unsaved changes.
//   useEffect(() => {
//     function handleBeforeUnload(e: BeforeUnloadEvent) {
//       if (status === "saving") {
//         e.preventDefault();
//         e.returnValue = "";
//       }
//     }
//     window.addEventListener("beforeunload", handleBeforeUnload);
//     return () => window.removeEventListener("beforeunload", handleBeforeUnload);
//   }, [status]);

//   if (!editor) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
//         Loading editor...
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <div className="flex items-center justify-between">
//         <EditorToolbar editor={editor} />
//         <SaveIndicator status={status} errorMessage={errorMessage} />
//       </div>
//       <EditorContent editor={editor} />
//     </div>
//   );
// }

// function SaveIndicator({
//   status,
//   errorMessage,
// }: {
//   status: SaveStatus;
//   errorMessage: string | null;
// }) {
//   if (status === "saving") {
//     return (
//       <span className="text-xs text-muted-foreground ml-2 shrink-0">
//         Saving…
//       </span>
//     );
//   }
//   if (status === "saved") {
//     return (
//       <span className="text-xs text-muted-foreground ml-2 shrink-0">
//         Saved
//       </span>
//     );
//   }
//   if (status === "error") {
//     return (
//       <span className="text-xs text-destructive ml-2 shrink-0" title={errorMessage ?? ""}>
//         Save failed — retrying…
//       </span>
//     );
//   }
//   return null;
// }

// // collab-editor\src\components\editor.tsx

// "use client";

// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// import Link from "@tiptap/extension-link";
// import EditorToolbar from "./editor-toolbar";

// type EditorProps = {
//   initialContent?: string | null;
// };

// export default function Editor({ initialContent }: EditorProps) {
//   const editor = useEditor({
//     immediatelyRender: false, // important for Next.js SSR
//     extensions: [
//       StarterKit.configure({
//         heading: {
//           levels: [1, 2, 3],
//         },
//       }),
//       Placeholder.configure({
//         placeholder: "Start writing...",
//       }),
//       Link.configure({
//         openOnClick: false,
//         HTMLAttributes: {
//           class: "text-primary underline underline-offset-4 cursor-pointer",
//         },
//       }),
//     ],
//     content: initialContent || "",
//     editorProps: {
//       attributes: {
//         class:
//           "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
//       },
//     },
//   });

//   if (!editor) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
//         Loading editor...
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <EditorToolbar editor={editor} />
//       <EditorContent editor={editor} />
//     </div>
//   );
// }