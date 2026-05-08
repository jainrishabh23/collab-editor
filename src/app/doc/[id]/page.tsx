import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Editor from "@/components/editor";
import CollabEditor from "@/components/collab-editor";
import type { JSONContent } from "@tiptap/react";
import DocumentTitle from "@/components/document-title";
import ShareButton from "./share-button";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/sign-in");
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, title, content, updated_at, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-destructive">
          Error loading document: {error.message}
        </p>
      </main>
    );
  }

  if (!document) {
    notFound();
  }

  // content is JSONB. It can be null (new document) or a Tiptap JSON object.
  const initialContent =
    document.content && typeof document.content === "object"
      ? (document.content as JSONContent)
      : null;

  const isOwner = document.owner_id === userData.user.id;

  // Viewers get a read-only editor; editors and owners get full edit.
  const { data: perm } = await supabase
    .from("document_permissions")
    .select("role")
    .eq("document_id", document.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const canEdit = isOwner || perm?.role === "editor";

  return (
    <main className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">← Back</Link>
          </Button>
          <DocumentTitle
            documentId={document.id}
            initialTitle={document.title}
          />
          {/* <span className="font-medium truncate">{document.title}</span> */}
        </div>

        <div className="flex items-center gap-3">
          {isOwner && <ShareButton documentId={document.id} />}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ID: {document.id.slice(0, 8)}…
          </span>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-10">
        <CollabEditor
          documentId={document.id}
          user={{
            id: userData.user.id,
            email: userData.user.email ?? "",
          }}
          canEdit={canEdit}
        />
        {/* <Editor documentId={document.id} initialContent={initialContent} /> */}
      </section>
    </main>
  );
}

// import { notFound, redirect } from "next/navigation";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/server";
// import { Button } from "@/components/ui/button";
// import Editor from "@/components/editor";

// export default async function DocumentPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;

//   const supabase = await createClient();
//   const { data: userData, error: userError } = await supabase.auth.getUser();

//   if (userError || !userData?.user) {
//     redirect("/sign-in");
//   }

//   const { data: document, error } = await supabase
//     .from("documents")
//     .select("id, title, content, updated_at")
//     .eq("id", id)
//     .maybeSingle();

//   if (error) {
//     return (
//       <main className="min-h-screen flex items-center justify-center p-8">
//         <p className="text-destructive">Error loading document: {error.message}</p>
//       </main>
//     );
//   }

//   if (!document) {
//     notFound();
//   }

//   // Tiptap accepts HTML strings or its own JSON format. We stored content
//   // as JSONB; for now we treat it as an HTML string. We'll formalize this on Day 9.
//   const initialContent =
//     typeof document.content === "string" ? document.content : null;

//   return (
//     <main className="min-h-screen bg-background">
//       <nav className="flex items-center justify-between px-6 py-4 border-b">
//         <div className="flex items-center gap-4 min-w-0">
//           <Button variant="ghost" size="sm" asChild>
//             <Link href="/dashboard">← Back</Link>
//           </Button>
//           <span className="font-medium truncate">{document.title}</span>
//         </div>
//         <span className="text-xs text-muted-foreground hidden sm:inline">
//           ID: {document.id.slice(0, 8)}…
//         </span>
//       </nav>

//       <section className="max-w-3xl mx-auto px-6 py-10">
//         <Editor initialContent={initialContent} />
//       </section>
//     </main>
//   );
// }

// import { notFound, redirect } from "next/navigation";
// import Link from "next/link";
// import { createClient } from "@/lib/supabase/server";
// import { Button } from "@/components/ui/button";

// export default async function DocumentPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;

//   const supabase = await createClient();
//   const { data: userData, error: userError } = await supabase.auth.getUser();

//   if (userError || !userData?.user) {
//     redirect("/sign-in");
//   }

//   const { data: document, error } = await supabase
//     .from("documents")
//     .select("id, title, content, updated_at")
//     .eq("id", id)
//     .maybeSingle();

//   if (error) {
//     return (
//       <main className="min-h-screen flex items-center justify-center p-8">
//         <p className="text-destructive">Error loading document: {error.message}</p>
//       </main>
//     );
//   }

//   if (!document) {
//     notFound();
//   }

//   return (
//     <main className="min-h-screen bg-background">
//       <nav className="flex items-center justify-between px-6 py-4 border-b">
//         <div className="flex items-center gap-4 min-w-0">
//           <Button variant="ghost" size="sm" asChild>
//             <Link href="/dashboard">← Back</Link>
//           </Button>
//           <span className="font-medium truncate">{document.title}</span>
//         </div>
//         <span className="text-xs text-muted-foreground hidden sm:inline">
//           ID: {document.id.slice(0, 8)}…
//         </span>
//       </nav>

//       <section className="max-w-3xl mx-auto px-6 py-16">
//         <div className="rounded-lg border border-dashed p-12 text-center">
//           <h2 className="font-medium mb-1">Editor coming on Day 8</h2>
//           <p className="text-sm text-muted-foreground">
//             This is a placeholder. The Tiptap editor lands in Week 2.
//           </p>
//         </div>

//         <div className="mt-8 text-xs text-muted-foreground">
//           <p>
//             <span className="font-medium">Document ID:</span> {document.id}
//           </p>
//           <p className="mt-1">
//             <span className="font-medium">Last updated:</span>{" "}
//             {new Date(document.updated_at).toLocaleString()}
//           </p>
//         </div>
//       </section>
//     </main>
//   );
// }
