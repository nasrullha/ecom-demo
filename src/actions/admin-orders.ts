"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import { firstError, orderStatusSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { orderId, status, note } = parsed.data;

  if (status === "rejected" && !note) {
    return { ok: false, error: "Add a short reason so the customer knows why it was rejected." };
  }

  // The database checks that the change is allowed and puts stock back on reject.
  const { error } = await admin.supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) {
    if (error.code === "P0001") return { ok: false, error: error.message };
    console.error("Order status update failed:", error.message);
    return { ok: false, error: "We could not update the order. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account");
  revalidatePath("/products");
  return { ok: true };
}

export async function expireStaleOrdersAction(hours: number): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const h = Math.floor(Number(hours));
  if (!Number.isFinite(h) || h < 1 || h > 24 * 60) {
    return { ok: false, error: "Enter a number of hours between 1 and 1440." };
  }

  const { data, error } = await admin.supabase.rpc("expire_stale_orders", { p_hours: h });
  if (error) {
    console.error("Expire orders failed:", error.message);
    return { ok: false, error: "We could not release the unpaid orders. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/products");
  return { ok: true, count: typeof data === "number" ? data : 0 };
}
