import { redirect } from "next/navigation";

export default async function ChannelRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  redirect(`/?channel=${encodeURIComponent(username)}`);
}
