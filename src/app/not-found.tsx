import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="text-center max-w-sm">
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground mb-6">
          That page or document doesn&apos;t exist — or you don&apos;t have access to it.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}