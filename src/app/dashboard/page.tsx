import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import NewDocumentButton from "./new-document-button";
import DocumentActions from "./document-actions";

type Role = "viewer" | "editor";

type Document = {
  id: string;
  title: string;
  updated_at: string;
  owner_id: string;
};

type DocumentWithMeta = Document & {
  isOwner: boolean;
  role: Role | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/sign-in");
  }

  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, title, updated_at, owner_id")
    .order("updated_at", { ascending: false });

  // Pull only the current user's permission rows so we can label shared docs
  // with their role. RLS already restricts to user_id = self, but the explicit
  // filter keeps intent obvious and the index hot.
  const { data: permissions, error: permsError } = await supabase
    .from("document_permissions")
    .select("document_id, role")
    .eq("user_id", userData.user.id);

  if (permsError) {
    console.error("Failed to load permissions:", permsError.message);
  }

  const roleByDocId = new Map<string, Role>();
  for (const p of permissions ?? []) {
    roleByDocId.set(p.document_id, p.role as Role);
  }

  // Owner takes precedence: if a doc is somehow owned AND has a self-row in
  // document_permissions (data inconsistency), we treat it as owned, no badge.
  const docs: DocumentWithMeta[] = ((documents as Document[] | null) ?? []).map(
    (d) => {
      const isOwner = d.owner_id === userData.user.id;
      return {
        ...d,
        isOwner,
        role: isOwner ? null : (roleByDocId.get(d.id) ?? null),
      };
    },
  );

  const owned = docs.filter((d) => d.isOwner);
  const shared = docs.filter((d) => !d.isOwner);

  return (
    <main className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/dashboard" className="text-xl font-semibold tracking-tight">
          Co<span className="text-primary">.</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {userData.user.email}
          </span>
          <SignOutButton />
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your documents</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {owned.length} document{owned.length === 1 ? "" : "s"}
              {shared.length > 0 && <> · {shared.length} shared</>}
            </p>
          </div>
          <NewDocumentButton />
        </div>

        {docsError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Error loading documents: {docsError.message}
          </div>
        )}

        {docs.length === 0 ? (
          <EmptyState />
        ) : shared.length === 0 ? (
          <DocumentList documents={owned} />
        ) : (
          <div className="flex flex-col gap-10">
            {owned.length > 0 && <DocumentList documents={owned} />}
            <div>
              <h2 className="text-lg font-semibold tracking-tight mb-3">
                Shared with you
              </h2>
              <DocumentList documents={shared} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// function DocumentList({ documents }: { documents: Document[] }) {
//   return (
//     <ul className="flex flex-col gap-2">
//       {documents.map((doc) => (
//         <li key={doc.id}>
//           <Link
//             href={`/doc/${doc.id}`}
//             className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
//           >
//             <div className="min-w-0 flex-1">
//               <p className="font-medium truncate">{doc.title}</p>
//               <p className="text-xs text-muted-foreground mt-0.5">
//                 Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
//               </p>
//             </div>
//             <span className="text-muted-foreground text-sm ml-4 shrink-0">→</span>
//           </Link>
//         </li>
//       ))}
//     </ul>
//   );
// }

function DocumentList({ documents }: { documents: DocumentWithMeta[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="relative">
          <Link
            href={`/doc/${doc.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1 pr-12">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{doc.title}</p>
                {doc.role && <RoleBadge role={doc.role} />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
              </p>
            </div>
          </Link>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <DocumentActions documentId={doc.id} currentTitle={doc.title} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
      {role}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <h3 className="font-medium mb-1">No documents yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first document to start writing.
      </p>
    </div>
  );
}


// import { redirect } from "next/navigation";
// import { createClient } from "@/lib/supabase/server";
// import { Button } from "@/components/ui/button";
// import SignOutButton from "./sign-out-button";

// export default async function DashboardPage() {
//   const supabase = await createClient();
//   const { data, error } = await supabase.auth.getUser();

//   if (error || !data?.user) {
//     redirect("/sign-in");
//   }

//   return (
//     <main className="min-h-screen bg-background">
//       <nav className="flex items-center justify-between px-6 py-4 border-b">
//         <div className="text-xl font-semibold tracking-tight">
//           Co<span className="text-primary">.</span>
//         </div>
//         <div className="flex items-center gap-3">
//           <span className="text-sm text-muted-foreground">{data.user.email}</span>
//           <SignOutButton />
//         </div>
//       </nav>

//       <section className="max-w-3xl mx-auto px-6 py-16">
//         <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
//         <p className="text-muted-foreground mb-8">
//           You&apos;re signed in. Documents coming soon.
//         </p>

//         <div className="rounded-lg border p-6 bg-muted/30">
//           <p className="text-sm">
//             <span className="font-medium">User ID:</span>{" "}
//             <code className="text-xs">{data.user.id}</code>
//           </p>
//           <p className="text-sm mt-1">
//             <span className="font-medium">Email:</span> {data.user.email}
//           </p>
//         </div>
//       </section>
//     </main>
//   );
// }