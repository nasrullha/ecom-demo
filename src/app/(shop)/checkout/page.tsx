import type { Metadata } from "next";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { PageTitle } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  await requireUser("/checkout");
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  return (
    <>
      <PageTitle title="Checkout" />
      <CheckoutForm
        defaults={{ name: profile?.full_name ?? "", phone: profile?.phone ?? "" }}
        shipping={{
          shipping_fee: settings.shipping_fee,
          free_shipping_threshold: settings.free_shipping_threshold,
        }}
      />
    </>
  );
}
