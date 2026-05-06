"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function NewDocumentButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      router.push("/sign-in");
      return;
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        owner_id: userData.user.id,
        title: "Untitled",
      })
      .select("id")
      .single();

    setLoading(false);

    if (error) {
      console.error("Failed to create document:", error);
      alert(`Failed to create document: ${error.message}`);
      return;
    }

    router.push(`/doc/${data.id}`);
  }

  return (
    <Button onClick={handleCreate} disabled={loading}>
      {loading ? "Creating..." : "+ New document"}
    </Button>
  );
}
