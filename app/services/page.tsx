import { redirect } from "next/navigation";

// Removed: this site is a reference asset, not a sales site.
// See /about for the project background and a link to Clawforce One.
export default function ServicesRedirect() {
  redirect("/about");
}
