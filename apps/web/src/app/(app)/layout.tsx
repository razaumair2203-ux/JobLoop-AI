import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Redirect to onboarding if not completed
  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      user={{
        email: user.email ?? "",
        fullName: user.user_metadata?.full_name ?? user.email ?? "",
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
