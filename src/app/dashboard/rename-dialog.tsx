"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentTitle: string;
};

export default function RenameDialog({
  open,
  onOpenChange,
  documentId,
  currentTitle,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(currentTitle);
  }, [open, currentTitle]);

  async function handleSave() {
    const trimmed = value.trim();
    const finalTitle = trimmed === "" ? "Untitled" : trimmed;

    if (finalTitle === currentTitle) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("documents")
      .update({ title: finalTitle })
      .eq("id", documentId);

    setSaving(false);

    if (error) {
      console.error("Rename failed:", error);
      alert(`Failed to rename: ${error.message}`);
      return;
    }

    onOpenChange(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rename document</AlertDialogTitle>
          <AlertDialogDescription>
            Pick a new title for this document.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="title-input">Title</Label>
          <Input
            id="title-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            maxLength={120}
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}