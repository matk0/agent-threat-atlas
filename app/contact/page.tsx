import { redirect } from "next/navigation";

// Removed: contact lives at clawforceone.ai. /about explains the site
// and links out.
export default function ContactRedirect() {
  redirect("/about");
}
