import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MarcianoLoginPage from "@/app/marciano/(public)/login/page";
import { auth } from "@/lib/auth";

export default async function MarcianosEntryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "marciano") {
    redirect("/marciano");
  }

  if (session?.user) {
    redirect("/hoy");
  }

  return <MarcianoLoginPage />;
}
