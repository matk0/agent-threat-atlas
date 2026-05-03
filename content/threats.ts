import { locale } from "@/lib/i18n";
import { threats as threatsEn } from "./threats.en";
import { threats as threatsSk } from "./threats.sk";

export type { Threat } from "./threats.en";

export const threats = locale === "sk" ? threatsSk : threatsEn;

export const threatBySlug = (slug: string) =>
  threats.find((t) => t.slug === slug);
