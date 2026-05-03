import { locale } from "@/lib/i18n";
import { bestPractices as bestPracticesEn } from "./bestPractices.en";
import { bestPractices as bestPracticesSk } from "./bestPractices.sk";

export const bestPractices =
  locale === "sk" ? bestPracticesSk : bestPracticesEn;
