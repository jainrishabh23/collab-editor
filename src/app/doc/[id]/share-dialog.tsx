"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listPermissions,
  revokePermission,
  shareDocument,
} from "./actions";

type Role = "viewer" | "editor";

type Permission = {
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
};

type Props = {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ShareDialog({
  documentId,
  open,
  onOpenChange,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoadingList(true);
    const result = await listPermissions(documentId);
    setLoadingList(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPermissions(result.permissions);
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    void refetch();
  }, [open, refetch]);

  async function handleShare() {
    setError(null);
    setSuccess(null);
    setSharing(true);
    const result = await shareDocument(documentId, email, role);
    setSharing(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSuccess(role === "editor" ? "Shared as editor" : "Shared as viewer");
    setEmail("");
    void refetch();
  }

  async function handleRevoke(userId: string) {
    setError(null);
    setSuccess(null);
    setRevokingId(userId);
    const result = await revokePermission(documentId, userId);
    setRevokingId(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    void refetch();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Invite people by email. They&apos;ll see this document on their
            dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-1">
          <Label htmlFor="share-email">Invite by email</Label>
          <div className="flex gap-2">
            <Input
              id="share-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim() !== "") {
                  e.preventDefault();
                  void handleShare();
                }
              }}
              disabled={sharing}
              className="flex-1"
              autoComplete="email"
            />
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
              disabled={sharing}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Can view</SelectItem>
                <SelectItem value="editor">Can edit</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => void handleShare()}
              disabled={sharing || email.trim() === ""}
            >
              {sharing ? "Sharing…" : "Share"}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && !error && (
            <p className="text-xs text-muted-foreground">{success}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <p className="text-sm font-medium">Currently shared with</p>
          {loadingList && permissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : permissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Not shared with anyone yet
            </p>
          ) : (
            <ul className="flex flex-col">
              {permissions.map((p) => (
                <li
                  key={p.user_id}
                  className="flex items-center justify-between gap-3 py-1.5 text-sm"
                >
                  <span className="truncate">{p.email}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {p.role}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => void handleRevoke(p.user_id)}
                      disabled={revokingId === p.user_id}
                      aria-label={`Revoke access for ${p.email}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
