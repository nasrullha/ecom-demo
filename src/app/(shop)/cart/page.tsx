import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart-view";
import { PageTitle } from "@/components/ui";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <>
      <PageTitle title="Your cart" />
      <CartView
        shipping={{
          shipping_fee: settings.shipping_fee,
          free_shipping_threshold: settings.free_shipping_threshold,
        }}
      />
    </>
  );
}
