import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.mustChangePassword) {
    redirect("/change-password");
  }

  switch (session.role) {
    case "estate_admin":
      redirect("/admin");
    case "estate_security":
      redirect("/security");
    case "resident":
    default:
      redirect("/dashboard");
  }
}
