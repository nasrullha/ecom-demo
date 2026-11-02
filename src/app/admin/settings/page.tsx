import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageTitle } from "@/components/ui";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageTitle title="Settings" />
      <SettingsForm settings={settings} />
    </>
  );
}
