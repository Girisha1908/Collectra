import { redirect } from "next/navigation";

export default async function PublicTrackingRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/order/${encodeURIComponent(id)}`);
}

