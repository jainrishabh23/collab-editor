"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { error: string };

type Permission = {
  user_id: string;
  email: string;
  role: "viewer" | "editor";
  created_at: string;
};

type ListResult = { permissions: Permission[] } | { error: string };

const VALID_ROLES = new Set<"viewer" | "editor">(["viewer", "editor"]);

function friendlyPostgresError(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "23505":
      return "Already shared with this user";
    case "23503":
      return "Invalid document or user";
    case "42501":
      return "You don't have permission to do this";
    case "PGRST116":
      return "Not found";
    default:
      return fallback || "Something went wrong";
  }
}

export async function shareDocument(
  documentId: string,
  email: string,
  role: "viewer" | "editor",
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "Email is required" };

  if (!VALID_ROLES.has(role)) return { error: "Invalid role" };

  const { data: targetUserId, error: lookupError } = await supabase.rpc(
    "get_user_id_by_email",
    { email: normalizedEmail },
  );
  if (lookupError) {
    return {
      error: friendlyPostgresError(lookupError.code, lookupError.message),
    };
  }
  if (!targetUserId) {
    return { error: "No account found with that email" };
  }

  try {
    const { error: insertError } = await supabase
      .from("document_permissions")
      .insert({
        document_id: documentId,
        user_id: targetUserId,
        role,
        created_by: user.id,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return { error: "Already shared with this user" };
      }
      return {
        error: friendlyPostgresError(insertError.code, insertError.message),
      };
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to share document",
    };
  }

  return { success: true };
}

export async function revokePermission(
  documentId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  try {
    // Chain `.select()` so the response contains the deleted rows. If RLS
    // blocks the delete (current user isn't the doc owner) the API returns
    // 0 rows and no error — we treat that as a permission/not-found problem.
    const { data, error } = await supabase
      .from("document_permissions")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .select();

    if (error) {
      return { error: friendlyPostgresError(error.code, error.message) };
    }
    if (!data || data.length === 0) {
      return {
        error: "Permission not found or you don't have access to revoke it",
      };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to revoke permission",
    };
  }

  return { success: true };
}

export async function listPermissions(
  documentId: string,
): Promise<ListResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.rpc(
    "get_document_permissions_with_emails",
    { doc_id: documentId },
  );
  if (error) {
    return { error: friendlyPostgresError(error.code, error.message) };
  }

  return { permissions: (data ?? []) as Permission[] };
}
