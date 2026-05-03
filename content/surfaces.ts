import { locale } from "@/lib/i18n";
import { surfaces as surfacesEn } from "./surfaces.en";
import { surfaces as surfacesSk } from "./surfaces.sk";

export type { Surface } from "./surfaces.en";

export const surfaces = locale === "sk" ? surfacesSk : surfacesEn;
