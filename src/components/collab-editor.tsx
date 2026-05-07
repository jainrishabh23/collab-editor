"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import EditorToolbar from "./editor-toolbar";
import {
  SlashCommandsExtension,
  makeSuggestionConfig,
} from "@/lib/editor/slash-command-extension";
import { slashCommands } from "@/lib/editor/slash-commands";

type Props = {
  documentId: string;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

const WS_URL = "wss://demos.yjs.dev/ws";

export default function CollabEditor({ documentId }: Props) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const roomName = `collab-editor-day15-${documentId}`;
    const wsProvider = new WebsocketProvider(WS_URL, roomName, ydoc);

    wsProvider.on("status", (event: { status: ConnectionStatus }) => {
      setStatus(event.status);
    });

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
      setProvider(null);
    };
  }, [documentId, ydoc]);

  if (!provider) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        Connecting to collaboration server...
      </div>
    );
  }

  return <InnerCollabEditor ydoc={ydoc} status={status} />;
}

function InnerCollabEditor({
  ydoc,
  status,
}: {
  ydoc: Y.Doc;
  status: ConnectionStatus;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        undoRedo: false,
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      SlashCommandsExtension.configure({
        suggestion: makeSuggestionConfig(slashCommands),
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
      },
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
        <ConnectionIndicator status={status} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="text-xs text-destructive shrink-0 inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Disconnected
    </span>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// import Link from "@tiptap/extension-link";
// import Collaboration from "@tiptap/extension-collaboration";
// import * as Y from "yjs";
// import { WebsocketProvider } from "y-websocket";
// import EditorToolbar from "./editor-toolbar";
// import {
//   SlashCommandsExtension,
//   makeSuggestionConfig,
// } from "@/lib/editor/slash-command-extension";
// import { slashCommands } from "@/lib/editor/slash-commands";

// type Props = {
//   documentId: string;
// };

// type ConnectionStatus = "connecting" | "connected" | "disconnected";

// const WS_URL = "wss://demos.yjs.dev/ws";

// export default function CollabEditor({ documentId }: Props) {
//   const ydocRef = useRef<Y.Doc | null>(null);
//   const providerRef = useRef<WebsocketProvider | null>(null);
//   const [status, setStatus] = useState<ConnectionStatus>("connecting");
//   const [ready, setReady] = useState(false);

//   // Initialize Y.Doc and provider once on mount.
//   useEffect(() => {
//     const ydoc = new Y.Doc();
//     ydocRef.current = ydoc;

//     // Use a unique, hard-to-guess room name based on the document ID.
//     // This isn't real security — Day 17 we own the WS server.
//     const roomName = `collab-editor-day15-${documentId}`;

//     const provider = new WebsocketProvider(WS_URL, roomName, ydoc);
//     providerRef.current = provider;

//     provider.on("status", (event: { status: ConnectionStatus }) => {
//       setStatus(event.status);
//     });

//     // Wait until the provider has connected and synced once before showing
//     // the editor. Otherwise users might see an empty doc while content arrives.
//     provider.once("sync", () => {
//       setReady(true);
//     });

//     // Safety: if sync takes too long, render anyway after 1.5s.
//     const fallbackTimer = setTimeout(() => setReady(true), 1500);

//     return () => {
//       clearTimeout(fallbackTimer);
//       provider.destroy();
//       ydoc.destroy();
//       providerRef.current = null;
//       ydocRef.current = null;
//     };
//   }, [documentId]);

//   const editor = useEditor(
//     {
//       immediatelyRender: false,
//       extensions:
//         ready && ydocRef.current
//           ? [
//               // StarterKit but with history disabled — Yjs handles undo/redo for collab.
//               StarterKit.configure({
//                 heading: { levels: [1, 2, 3] },
//                 undoRedo: false,
//               }),
//               Placeholder.configure({ placeholder: "Start writing..." }),
//               Link.configure({
//                 openOnClick: false,
//                 HTMLAttributes: {
//                   class:
//                     "text-primary underline underline-offset-4 cursor-pointer",
//                 },
//               }),
//               Collaboration.configure({
//                 document: ydocRef.current,
//               }),
//               SlashCommandsExtension.configure({
//                 suggestion: makeSuggestionConfig(slashCommands),
//               }),
//             ]
//           : [], 
//       // Critical: do NOT pass `content` here. The Y.Doc is the source of truth.
//       editorProps: {
//         attributes: {
//           class:
//             "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
//         },
//       },
//     },
//     [ready] // recreate the editor once we're ready and the Y.Doc is bound
//   );

//   if (!ready || !editor) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
//         Connecting to collaboration server...
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-4">
//       <div className="flex items-center justify-between gap-3">
//         <EditorToolbar editor={editor} />
//         <ConnectionIndicator status={status} />
//       </div>
//       <EditorContent editor={editor} />
//     </div>
//   );
// }

// function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
//   if (status === "connected") {
//     return (
//       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
//         Connected
//       </span>
//     );
//   }
//   if (status === "connecting") {
//     return (
//       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
//         Connecting…
//       </span>
//     );
//   }
//   return (
//     <span className="text-xs text-destructive shrink-0 inline-flex items-center gap-1.5">
//       <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
//       Disconnected
//     </span>
//   );
// }