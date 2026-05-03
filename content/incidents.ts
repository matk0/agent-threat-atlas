import { locale } from "@/lib/i18n";
import { incidents as incidentsEn } from "./incidents.en";
import { incidents as incidentsSk } from "./incidents.sk";

export type { Incident } from "./incidents.en";

export const incidents = locale === "sk" ? incidentsSk : incidentsEn;
