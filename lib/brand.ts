/**
 * Chen Logistics — brand identity and company information.
 * Single source of truth for the public brand name, tagline and the
 * company details published in the site footer and metadata.
 */

export const APP_NAME = "Chen Logistics";
export const APP_TAGLINE =
  "Delivering fast, reliable shipping and logistics solutions.";
export const APP_SHORT = "Chen";

export const COMPANY_LEGAL_NAME = "Chen Logistics Technologies Limited";
export const COMPANY_LOCATION = "Lagos, Nigeria";
export const COMPANY_WEBSITE = "chenlogistics.vercel.app";
export const COMPANY_WEBSITE_URL = "https://chenlogistics.vercel.app";

/**
 * NOTE — the +232 prefix is the Sierra Leone country code, while +234 is
 * Nigeria. Chen Logistics Technologies Limited is registered in Lagos,
 * Nigeria, so the +232 number must be verified with the company before
 * this is published to production.
 */
export const COMPANY_PHONES: { label: string; href: string }[] = [
  { label: "+232 707 756 2565", href: "tel:+2327077562565" },
  { label: "+234 707 345 4656", href: "tel:+2347073454656" },
];

export const TRACKING_NUMBER_EXAMPLE = "CH-10482";

export interface SocialLink {
  label: string;
  href: string;
}

/** Active social platforms for the company. */
export const SOCIALS: SocialLink[] = [
  { label: "LinkedIn", href: "https://www.linkedin.com" },
  { label: "X", href: "https://x.com" },
  { label: "Instagram", href: "https://www.instagram.com" },
  { label: "Facebook", href: "https://www.facebook.com" },
  { label: "YouTube", href: "https://www.youtube.com" },
];
