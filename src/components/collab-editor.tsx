"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import EditorToolbar from "./editor-toolbar";
import PresenceAvatars from "./presence-avatars";
import {
  SlashCommandsExtension,
  makeSuggestionConfig,
} from "@/lib/editor/slash-command-extension";
import { slashCommands } from "@/lib/editor/slash-commands";
import { colorForUser, displayNameFor } from "@/lib/collab/user-color";

type CurrentUser = {
  id: string;
  email: string;
};

type Props = {
  documentId: string;
  user: CurrentUser;
  canEdit?: boolean;
};

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export default function CollabEditor({
  documentId,
  user,
  canEdit = true,
}: Props) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const localUser = useMemo(
    () => ({
      id: user.id,
      name: displayNameFor(user.email),
      color: colorForUser(user.id),
    }),
    [user.id, user.email]
  );

  useEffect(() => {
    const roomName = `doc-${documentId}`;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
    const wsProvider = new WebsocketProvider(wsUrl, roomName, ydoc);

    wsProvider.on("status", (event: { status: ConnectionStatus }) => {
      setStatus(event.status);
    });

    wsProvider.awareness.setLocalStateField("user", localUser);

    setProvider(wsProvider);

    return () => {
      wsProvider.destroy();
      ydoc.destroy();
      setProvider(null);
    };
  }, [documentId, ydoc, localUser]);

  if (!provider) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        Connecting to collaboration server...
      </div>
    );
  }

  return (
    <InnerCollabEditor
      ydoc={ydoc}
      provider={provider}
      status={status}
      localUser={localUser}
      canEdit={canEdit}
    />
  );
}

function InnerCollabEditor({
  ydoc,
  provider,
  status,
  localUser,
  canEdit,
}: {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  status: ConnectionStatus;
  localUser: { id: string; name: string; color: string };
  canEdit: boolean;
}) {
  // Extensions are evaluated once at editor creation. canEdit comes from a
  // server fetch and won't change mid-session, so the conditional include
  // below is safe.
  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        undoRedo: false,
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-primary underline underline-offset-4 cursor-pointer",
          },
        },
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Collaboration.configure({ document: ydoc }),
      ...(canEdit
        ? [
            CollaborationCaret.configure({
              provider,
              user: {
                name: localUser.name,
                color: localUser.color,
              },
            }),
          ]
        : []),
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
        {canEdit ? <EditorToolbar editor={editor} /> : <div />}
        <div className="flex items-center gap-3 shrink-0">
          <PresenceAvatars provider={provider} localUserId={localUser.id} />
          <ConnectionIndicator status={status} />
          {!canEdit && <ViewerBadge />}
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ViewerBadge() {
  return (
    <span
      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
      title="You have read-only access to this document"
    >
      Viewer
    </span>
  );
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Connected
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="text-xs text-destructive inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Disconnected
    </span>
  );
}

// // collab-editor\src\components\collab-editor.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// import Collaboration from "@tiptap/extension-collaboration";
// import CollaborationCaret from "@tiptap/extension-collaboration-caret";
// import * as Y from "yjs";
// // import { WebrtcProvider } from "y-webrtc";
// import { WebrtcProvider } from "y-webrtc";    // ← WebRTC, not WebSocket
// import EditorToolbar from "./editor-toolbar";
// import PresenceAvatars from "./presence-avatars";
// import {
//   SlashCommandsExtension,
//   makeSuggestionConfig,
// } from "@/lib/editor/slash-command-extension";
// import { slashCommands } from "@/lib/editor/slash-commands";
// import { colorForUser, displayNameFor } from "@/lib/collab/user-color";

// type CurrentUser = {
//   id: string;
//   email: string;
// };

// type Props = {
//   documentId: string;
//   user: CurrentUser;
// };

// type ConnectionStatus = "connecting" | "connected" | "disconnected";

// export default function CollabEditor({ documentId, user }: Props) {
//   const [ydoc] = useState(() => new Y.Doc());
//   const [provider, setProvider] = useState<WebrtcProvider | null>(null);
//   const [status, setStatus] = useState<ConnectionStatus>("connecting");

//   const localUser = useMemo(
//     () => ({
//       id: user.id,
//       name: displayNameFor(user.email),
//       color: colorForUser(user.id),
//     }),
//     [user.id, user.email],
//   );

//   useEffect(() => {
//     const roomName = `collab-editor-day16-${documentId}`;
//     const rtcProvider = new WebrtcProvider(roomName, ydoc);

//     // WebRTC doesn't surface a unified status event like WebSocket does;
//     // we treat it as connected once the provider is created. Day 17 brings back
//     // a real status indicator with our own WS server.
//     setStatus("connected");

//     rtcProvider.awareness.setLocalStateField("user", localUser);

//     setProvider(rtcProvider);

//     return () => {
//       rtcProvider.destroy();
//       ydoc.destroy();
//       setProvider(null);
//     };
//   }, [documentId, ydoc, localUser]);

//   if (!provider) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
//         Connecting to collaboration server...
//       </div>
//     );
//   }

//   return (
//     <InnerCollabEditor
//       ydoc={ydoc}
//       provider={provider}
//       status={status}
//       localUser={localUser}
//     />
//   );
// }

// function InnerCollabEditor({
//   ydoc,
//   provider,
//   status,
//   localUser,
// }: {
//   ydoc: Y.Doc;
//   provider: WebrtcProvider;
//   status: ConnectionStatus;
//   localUser: { id: string; name: string; color: string };
// }) {
//   const editor = useEditor({
//     immediatelyRender: false,
//     extensions: [
//       StarterKit.configure({
//         heading: { levels: [1, 2, 3] },
//         undoRedo: false,
//         link: {
//           openOnClick: false,
//           HTMLAttributes: {
//             class: "text-primary underline underline-offset-4 cursor-pointer",
//           },
//         },
//       }),
//       Placeholder.configure({ placeholder: "Start writing..." }),
//       Collaboration.configure({ document: ydoc }),
//       CollaborationCaret.configure({
//         provider,
//         user: {
//           name: localUser.name,
//           color: localUser.color,
//         },
//       }),
//       SlashCommandsExtension.configure({
//         suggestion: makeSuggestionConfig(slashCommands),
//       }),
//     ],
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
//       <div className="flex items-center justify-between gap-3">
//         <EditorToolbar editor={editor} />
//         <div className="flex items-center gap-3 shrink-0">
//           <PresenceAvatars provider={provider} localUserId={localUser.id} />
//           <ConnectionIndicator status={status} />
//         </div>
//       </div>
//       <EditorContent editor={editor} />
//     </div>
//   );
// }

// function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
//   if (status === "connected") {
//     return (
//       <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
//         Connected
//       </span>
//     );
//   }
//   if (status === "connecting") {
//     return (
//       <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
//         Connecting…
//       </span>
//     );
//   }
//   return (
//     <span className="text-xs text-destructive inline-flex items-center gap-1.5">
//       <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
//       Disconnected
//     </span>
//   );
// }

// import { useEffect, useMemo, useState } from "react";
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Placeholder from "@tiptap/extension-placeholder";
// // import Link from "@tiptap/extension-link";
// import Collaboration from "@tiptap/extension-collaboration";
// import CollaborationCaret from "@tiptap/extension-collaboration-caret";
// import * as Y from "yjs";
// // import { WebsocketProvider } from "y-websocket";
// import EditorToolbar from "./editor-toolbar";"use client";

// import PresenceAvatars from "./presence-avatars";
// import {
//   SlashCommandsExtension,
//   makeSuggestionConfig,
// } from "@/lib/editor/slash-command-extension";
// import { slashCommands } from "@/lib/editor/slash-commands";
// import { colorForUser, displayNameFor } from "@/lib/collab/user-color";
// import { WebrtcProvider } from "y-webrtc";

// type CurrentUser = {
//   id: string;
//   email: string;
// };

// type Props = {
//   documentId: string;
//   user: CurrentUser;
// };

// type ConnectionStatus = "connecting" | "connected" | "disconnected";

// const WS_URL = "wss://demos.yjs.dev/ws";

// export default function CollabEditor({ documentId, user }: Props) {
//   const [ydoc] = useState(() => new Y.Doc());
// //   const [provider, setProvider] = useState<WebsocketProvider | null>(null);
//   const [status, setStatus] = useState<ConnectionStatus>("connecting");
// const [provider, setProvider] = useState<WebrtcProvider | null>(null);
//   // Stable user identity for awareness.
//   const localUser = useMemo(
//     () => ({
//       id: user.id,
//       name: displayNameFor(user.email),
//       color: colorForUser(user.id),
//     }),
//     [user.id, user.email]
//   );

// //   useEffect(() => {
// //     const roomName = `collab-editor-day15-${documentId}`;
// //     const wsProvider = new WebsocketProvider(WS_URL, roomName, ydoc);

// //     wsProvider.on("status", (event: { status: ConnectionStatus }) => {
// //       setStatus(event.status);
// //     });

// //     // Set our awareness. Other clients will see this as soon as they sync.
// //     wsProvider.awareness.setLocalStateField("user", localUser);

// //     setProvider(wsProvider);

// //     return () => {
// //       wsProvider.destroy();
// //       ydoc.destroy();
// //       setProvider(null);
// //     };
// //   }, [documentId, ydoc, localUser]);

// useEffect(() => {
//   const roomName = `collab-editor-day16-${documentId}`;
//   const rtcProvider = new WebrtcProvider(roomName, ydoc);

//   // WebRTC doesn't surface a unified status event like WebSocket does;
//   // we treat it as connected once the provider is created. Day 17 brings back
//   // a real status indicator with our own WS server.
//   setStatus("connected");

//   // Set our awareness. Other clients will see this as soon as they sync.
//   rtcProvider.awareness.setLocalStateField("user", localUser);

//   setProvider(rtcProvider);

//   return () => {
//     rtcProvider.destroy();
//     ydoc.destroy();
//     setProvider(null);
//   };
// }, [documentId, ydoc, localUser]);

//   if (!provider) {
//     return (
//       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
//         Connecting to collaboration server...
//       </div>
//     );
//   }

//   return (
//     <InnerCollabEditor
//       ydoc={ydoc}
//       provider={provider}
//       status={status}
//       localUser={localUser}
//     />
//   );
// }

// function InnerCollabEditor({
//   ydoc,
//   provider,
//   status,
//   localUser,
// }: {
//   ydoc: Y.Doc;
//   provider: WebrtcProvider;
//   status: ConnectionStatus;
//   localUser: { id: string; name: string; color: string };
// }) {
// // function InnerCollabEditor({
// //   ydoc,
// //   provider,
// //   status,
// //   localUser,
// // }: {

// //   ydoc: Y.Doc;
// //   provider: WebsocketProvider;
// //   status: ConnectionStatus;
// //   localUser: { id: string; name: string; color: string };
// // }) {

//   const editor = useEditor({
//     immediatelyRender: false,
//     extensions: [
//     //   StarterKit.configure({
//     //     heading: { levels: [1, 2, 3] },
//     //     undoRedo: false,
//     //   }),
//       StarterKit.configure({
//         heading: { levels: [1, 2, 3] },
//         undoRedo: false,
//         link: {
//             openOnClick: false,
//             HTMLAttributes: {
//             class: "text-primary underline underline-offset-4 cursor-pointer",
//             },
//         },
//         }),
//       Placeholder.configure({ placeholder: "Start writing..." }),
//     //   Link.configure({
//     //     openOnClick: false,
//     //     HTMLAttributes: {
//     //       class:
//     //         "text-primary underline underline-offset-4 cursor-pointer",
//     //     },
//     //   }),
//       Collaboration.configure({ document: ydoc }),
//       CollaborationCaret.configure({
//         provider,
//         user: {
//           name: localUser.name,
//           color: localUser.color,
//         },
//       }),
//       SlashCommandsExtension.configure({
//         suggestion: makeSuggestionConfig(slashCommands),
//       }),
//     ],
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
//       <div className="flex items-center justify-between gap-3">
//         <EditorToolbar editor={editor} />
//         <div className="flex items-center gap-3 shrink-0">
//           <PresenceAvatars provider={provider} localUserId={localUser.id} />
//           <ConnectionIndicator status={status} />
//         </div>
//       </div>
//       <EditorContent editor={editor} />
//     </div>
//   );
// }

// function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
//   if (status === "connected") {
//     return (
//       <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
//         Connected
//       </span>
//     );
//   }
//   if (status === "connecting") {
//     return (
//       <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
//         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
//         Connecting…
//       </span>
//     );
//   }
//   return (
//     <span className="text-xs text-destructive inline-flex items-center gap-1.5">
//       <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
//       Disconnected
//     </span>
//   );
// }

// // "use client";

// // import { useEffect, useState } from "react";
// // import { useEditor, EditorContent } from "@tiptap/react";
// // import StarterKit from "@tiptap/starter-kit";
// // import Placeholder from "@tiptap/extension-placeholder";
// // import Link from "@tiptap/extension-link";
// // import Collaboration from "@tiptap/extension-collaboration";
// // import * as Y from "yjs";
// // import { WebsocketProvider } from "y-websocket";
// // import EditorToolbar from "./editor-toolbar";
// // import {
// //   SlashCommandsExtension,
// //   makeSuggestionConfig,
// // } from "@/lib/editor/slash-command-extension";
// // import { slashCommands } from "@/lib/editor/slash-commands";

// // type Props = {
// //   documentId: string;
// // };

// // type ConnectionStatus = "connecting" | "connected" | "disconnected";

// // const WS_URL = "wss://demos.yjs.dev/ws";

// // export default function CollabEditor({ documentId }: Props) {
// //   const [ydoc] = useState(() => new Y.Doc());
// //   const [provider, setProvider] = useState<WebsocketProvider | null>(null);
// //   const [status, setStatus] = useState<ConnectionStatus>("connecting");

// //   useEffect(() => {
// //     const roomName = `collab-editor-day15-${documentId}`;
// //     const wsProvider = new WebsocketProvider(WS_URL, roomName, ydoc);

// //     wsProvider.on("status", (event: { status: ConnectionStatus }) => {
// //       setStatus(event.status);
// //     });

// //     setProvider(wsProvider);

// //     return () => {
// //       wsProvider.destroy();
// //       ydoc.destroy();
// //       setProvider(null);
// //     };
// //   }, [documentId, ydoc]);

// //   if (!provider) {
// //     return (
// //       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
// //         Connecting to collaboration server...
// //       </div>
// //     );
// //   }

// //   return <InnerCollabEditor ydoc={ydoc} status={status} />;
// // }

// // function InnerCollabEditor({
// //   ydoc,
// //   status,
// // }: {
// //   ydoc: Y.Doc;
// //   status: ConnectionStatus;
// // }) {
// //   const editor = useEditor({
// //     immediatelyRender: false,
// //     extensions: [
// //       StarterKit.configure({
// //         heading: { levels: [1, 2, 3] },
// //         undoRedo: false,
// //       }),
// //       Placeholder.configure({ placeholder: "Start writing..." }),
// //       Link.configure({
// //         openOnClick: false,
// //         HTMLAttributes: {
// //           class:
// //             "text-primary underline underline-offset-4 cursor-pointer",
// //         },
// //       }),
// //       Collaboration.configure({
// //         document: ydoc,
// //       }),
// //       SlashCommandsExtension.configure({
// //         suggestion: makeSuggestionConfig(slashCommands),
// //       }),
// //     ],
// //     editorProps: {
// //       attributes: {
// //         class:
// //           "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
// //       },
// //     },
// //   });

// //   if (!editor) {
// //     return (
// //       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
// //         Loading editor...
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="flex flex-col gap-4">
// //       <div className="flex items-center justify-between gap-3">
// //         <EditorToolbar editor={editor} />
// //         <ConnectionIndicator status={status} />
// //       </div>
// //       <EditorContent editor={editor} />
// //     </div>
// //   );
// // }

// // function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
// //   if (status === "connected") {
// //     return (
// //       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
// //         <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
// //         Connected
// //       </span>
// //     );
// //   }
// //   if (status === "connecting") {
// //     return (
// //       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
// //         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
// //         Connecting…
// //       </span>
// //     );
// //   }
// //   return (
// //     <span className="text-xs text-destructive shrink-0 inline-flex items-center gap-1.5">
// //       <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
// //       Disconnected
// //     </span>
// //   );
// // }

// // "use client";

// // import { useEffect, useRef, useState } from "react";
// // import { useEditor, EditorContent } from "@tiptap/react";
// // import StarterKit from "@tiptap/starter-kit";
// // import Placeholder from "@tiptap/extension-placeholder";
// // import Link from "@tiptap/extension-link";
// // import Collaboration from "@tiptap/extension-collaboration";
// // import * as Y from "yjs";
// // import { WebsocketProvider } from "y-websocket";
// // import EditorToolbar from "./editor-toolbar";
// // import {
// //   SlashCommandsExtension,
// //   makeSuggestionConfig,
// // } from "@/lib/editor/slash-command-extension";
// // import { slashCommands } from "@/lib/editor/slash-commands";

// // type Props = {
// //   documentId: string;
// // };

// // type ConnectionStatus = "connecting" | "connected" | "disconnected";

// // const WS_URL = "wss://demos.yjs.dev/ws";

// // export default function CollabEditor({ documentId }: Props) {
// //   const ydocRef = useRef<Y.Doc | null>(null);
// //   const providerRef = useRef<WebsocketProvider | null>(null);
// //   const [status, setStatus] = useState<ConnectionStatus>("connecting");
// //   const [ready, setReady] = useState(false);

// //   // Initialize Y.Doc and provider once on mount.
// //   useEffect(() => {
// //     const ydoc = new Y.Doc();
// //     ydocRef.current = ydoc;

// //     // Use a unique, hard-to-guess room name based on the document ID.
// //     // This isn't real security — Day 17 we own the WS server.
// //     const roomName = `collab-editor-day15-${documentId}`;

// //     const provider = new WebsocketProvider(WS_URL, roomName, ydoc);
// //     providerRef.current = provider;

// //     provider.on("status", (event: { status: ConnectionStatus }) => {
// //       setStatus(event.status);
// //     });

// //     // Wait until the provider has connected and synced once before showing
// //     // the editor. Otherwise users might see an empty doc while content arrives.
// //     provider.once("sync", () => {
// //       setReady(true);
// //     });

// //     // Safety: if sync takes too long, render anyway after 1.5s.
// //     const fallbackTimer = setTimeout(() => setReady(true), 1500);

// //     return () => {
// //       clearTimeout(fallbackTimer);
// //       provider.destroy();
// //       ydoc.destroy();
// //       providerRef.current = null;
// //       ydocRef.current = null;
// //     };
// //   }, [documentId]);

// //   const editor = useEditor(
// //     {
// //       immediatelyRender: false,
// //       extensions:
// //         ready && ydocRef.current
// //           ? [
// //               // StarterKit but with history disabled — Yjs handles undo/redo for collab.
// //               StarterKit.configure({
// //                 heading: { levels: [1, 2, 3] },
// //                 undoRedo: false,
// //               }),
// //               Placeholder.configure({ placeholder: "Start writing..." }),
// //               Link.configure({
// //                 openOnClick: false,
// //                 HTMLAttributes: {
// //                   class:
// //                     "text-primary underline underline-offset-4 cursor-pointer",
// //                 },
// //               }),
// //               Collaboration.configure({
// //                 document: ydocRef.current,
// //               }),
// //               SlashCommandsExtension.configure({
// //                 suggestion: makeSuggestionConfig(slashCommands),
// //               }),
// //             ]
// //           : [],
// //       // Critical: do NOT pass `content` here. The Y.Doc is the source of truth.
// //       editorProps: {
// //         attributes: {
// //           class:
// //             "prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-1 py-2",
// //         },
// //       },
// //     },
// //     [ready] // recreate the editor once we're ready and the Y.Doc is bound
// //   );

// //   if (!ready || !editor) {
// //     return (
// //       <div className="min-h-[400px] flex items-center justify-center text-muted-foreground text-sm">
// //         Connecting to collaboration server...
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="flex flex-col gap-4">
// //       <div className="flex items-center justify-between gap-3">
// //         <EditorToolbar editor={editor} />
// //         <ConnectionIndicator status={status} />
// //       </div>
// //       <EditorContent editor={editor} />
// //     </div>
// //   );
// // }

// // function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
// //   if (status === "connected") {
// //     return (
// //       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
// //         <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
// //         Connected
// //       </span>
// //     );
// //   }
// //   if (status === "connecting") {
// //     return (
// //       <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1.5">
// //         <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
// //         Connecting…
// //       </span>
// //     );
// //   }
// //   return (
// //     <span className="text-xs text-destructive shrink-0 inline-flex items-center gap-1.5">
// //       <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
// //       Disconnected
// //     </span>
// //   );
// // }
