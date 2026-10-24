import { getLocale } from "next-intl/server";
import { TopSitesEn } from "./top-sites-en";
import { TopSitesFr } from "./top-sites-fr";

export default async function TopSitesGuidePage() {
  return (await getLocale()) === "fr" ? <TopSitesFr /> : <TopSitesEn />;
}
