"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareDialog from "./share-dialog";

type Props = {
  documentId: string;
};

export default function ShareButton({ documentId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Share document"
      >
        <UserPlus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <ShareDialog
        documentId={documentId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
