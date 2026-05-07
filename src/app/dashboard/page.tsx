import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import NewDocumentButton from "./new-document-button";
import DocumentActions from "./document-actions";

type Document = {
  id: string;
  title: string;
  updated_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    redirect("/sign-in");
  }

  const { data: documents, error: docsError } = await supabase
    .from("documents")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });

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
              {documents?.length ?? 0} document{documents?.length === 1 ? "" : "s"}
            </p>
          </div>
          <NewDocumentButton />
        </div>

        {docsError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Error loading documents: {docsError.message}
          </div>
        )}

        {documents && documents.length === 0 ? (
          <EmptyState />
        ) : (
          <DocumentList documents={documents as Document[] | null ?? []} />
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

function DocumentList({ documents }: { documents: Document[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <li key={doc.id} className="relative">
          <Link
            href={`/doc/${doc.id}`}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="min-w-0 flex-1 pr-12">
              <p className="font-medium truncate">{doc.title}</p>
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