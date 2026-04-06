import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-text-primary">Shadow CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary tracking-tight mb-4">
            Sales intelligence,
            <br />
            <span className="text-primary">powered by signals</span>
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-lg mx-auto">
            Track contacts, manage deals, analyze pipeline health, and generate
            AI-powered outreach. Built for teams that sell smarter.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary text-base px-6 py-2.5">
              Start for free
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-base px-6 py-2.5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} Shadow CRM. Built by Ayush Kumar Jha.
        </div>
      </footer>
    </div>
  );
}
