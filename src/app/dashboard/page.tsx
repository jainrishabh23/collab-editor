import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 border-b">
        <div className="text-xl font-semibold tracking-tight">
          Co<span className="text-primary">.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{data.user.email}</span>
          <SignOutButton />
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          You&apos;re signed in. Documents coming soon.
        </p>

        <div className="rounded-lg border p-6 bg-muted/30">
          <p className="text-sm">
            <span className="font-medium">User ID:</span>{" "}
            <code className="text-xs">{data.user.id}</code>
          </p>
          <p className="text-sm mt-1">
            <span className="font-medium">Email:</span> {data.user.email}
          </p>
        </div>
      </section>
    </main>
  );
}