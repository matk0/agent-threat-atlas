import { locale } from "@/lib/i18n";
import { playbooks as playbooksEn } from "./playbooks.en";
import { playbooks as playbooksSk } from "./playbooks.sk";

export type { Playbook, PlaybookSection } from "./playbooks.en";

export const playbooks = locale === "sk" ? playbooksSk : playbooksEn;

export const playbookBySlug = (slug: string) =>
  playbooks.find((p) => p.slug === slug);
