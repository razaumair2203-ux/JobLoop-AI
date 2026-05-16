import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export default async function OnboardingLayout({
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

  // If onboarding is already done, go to dashboard
  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="flex h-14 items-center gap-2.5 border-b border-surface-border bg-surface-0 px-6">
        <Image src="/parrot.jpg" alt="JobLoop" width={28} height={28} className="rounded" />
        <span className="text-lg font-bold text-surface-text">JobLoop</span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
