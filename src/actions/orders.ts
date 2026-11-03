"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { ImageProcessingError, processImage, SLIP_PROCESS_OPTIONS } from "@/lib/image-server";
import { firstError, placeOrderSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

/**
 * Errors raised on purpose by our database functions (plain-English messages
 * such as "Only 2 left of ...") use code P0001 and are safe to show.
 * Anything else is logged and replaced with a generic message.
 */
function friendlyDbError(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "P0001" || error.code === "28000") return error.message;
  console.error("Database error:", error.code, error.message);
  return fallback;
}

export async function placeOrderAction(input: unknown): Promise<ActionResult<{ orderId: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to place your order." };

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { items, shipping } = parsed.data;

  const supabase = await createClient();
  // Only variant ids and quantities are sent. Prices, stock and totals are
  // decided inside the database, so they can't be tampered with.
  const { data, error } = await supabase.rpc("create_order", {
    p_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_shipping: {
      name: shipping.name,
      phone: shipping.phone,
      address: shipping.address,
      city: shipping.city,
      atoll: shipping.atoll,
      delivery_method: shipping.deliveryMethod,
      vessel: shipping.vessel ?? "",
      postal_code: shipping.postalCode ?? "",
      note: shipping.note ?? "",
    },
  });

  if (error || typeof data !== "string") {
    return {
      ok: false,
      error: error
        ? friendlyDbError(error, "We could not place your order. Please try again.")
        : "We could not place your order. Please try again.",
    };
  }

  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, orderId: data };
}

export async function uploadPaymentSlipAction(formData: FormData): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const orderId = formData.get("orderId");
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return { ok: false, error: "Order not found." };
  }

  const supabase = await createClient();

  // RLS already limits this to the customer's own orders.
  const { data: order } = await supabase
    .from("orders")
    .select("id,status,slip_path")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "pending" && order.status !== "slip_uploaded") {
    return { ok: false, error: "A payment slip can no longer be uploaded for this order." };
  }

  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(formData.get("file"), SLIP_PROCESS_OPTIONS);
  } catch (e) {
    if (e instanceof ImageProcessingError) return { ok: false, error: e.message };
    console.error("Slip processing failed:", e);
    return { ok: false, error: "We could not process that image." };
  }

  const path = `${user.id}/${orderId}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });
  if (uploadError) {
    console.error("Slip upload failed:", uploadError.message);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const { error: attachError } = await supabase.rpc("attach_payment_slip", {
    p_order_id: orderId,
    p_path: path,
  });
  if (attachError) {
    await supabase.storage.from("payment-slips").remove([path]); // don't leave an orphan file
    return { ok: false, error: friendlyDbError(attachError, "We could not save your slip. Please try again.") };
  }

  // Replacing an earlier slip: delete the old file, it is no longer referenced.
  if (order.slip_path) {
    await supabase.storage.from("payment-slips").remove([order.slip_path]);
  }

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return { ok: false, error: "Order not found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId });
  if (error) return { ok: false, error: friendlyDbError(error, "We could not cancel this order.") };

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/account");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true };
}
