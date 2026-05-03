import { locale } from "@/lib/i18n";
import { resourceGroups as resourceGroupsEn } from "./resources.en";
import { resourceGroups as resourceGroupsSk } from "./resources.sk";

export type { ResourceGroup } from "./resources.en";

export const resourceGroups =
  locale === "sk" ? resourceGroupsSk : resourceGroupsEn;
