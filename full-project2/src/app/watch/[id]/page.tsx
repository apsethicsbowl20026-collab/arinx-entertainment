import { redirect } from "next/navigation";

export default async function WatchRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/?watch=${encodeURIComponent(id)}`);
}
