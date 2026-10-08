/**
 * Chen Logistics — public website navigation model.
 *
 * Single source of truth for the top navigation bar (dropdowns, mega
 * menu, quick links) and the footer columns. Every href here must
 * resolve to a real route under app/(site).
 */
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Calculator,
  CircleHelp,
  Code2,
  Compass,
  DoorOpen,
  FileText,
  Globe,
  Handshake,
  History,
  Mail,
  Newspaper,
  Package,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";

export interface SiteLink {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
}

export interface SiteMenuGroup {
  label: string;
  links: SiteLink[];
}

/* ------------------------------------------------------------------ About Us */

export const ABOUT_MENU: SiteLink[] = [
  {
    label: "About Us",
    href: "/about",
    description: "Who we are and what we do",
    icon: Building2,
  },
  {
    label: "Vision / Mission / Core Values",
    href: "/about/vision",
    description: "What guides every shipment",
    icon: Compass,
  },
  {
    label: "Our Journey",
    href: "/about/journey",
    description: "From one Lagos hub to nationwide",
    icon: History,
  },
  {
    label: "Management Team",
    href: "/about/management",
    description: "The people behind the network",
    icon: Users,
  },
];

/* ----------------------------------------------------------------- Products */

export const PRODUCTS_MEGA: SiteMenuGroup[] = [
  {
    label: "Shipping & Logistics",
    links: [
      {
        label: "Domestic Shipping",
        href: "/products/domestic-shipping",
        description: "Reliable and swift delivery across all 36 states in Nigeria.",
        icon: Truck,
      },
      {
        label: "International Shipping",
        href: "/products/international-shipping",
        description: "Ship to 230+ locations worldwide with ease.",
        icon: Globe,
      },
      {
        label: "Corporate",
        href: "/products/corporate",
        description:
          "Custom logistics solutions built for growing and large businesses.",
        icon: Building2,
      },
    ],
  },
  {
    label: "Domestic Shipping",
    links: [
      {
        label: "Chen App",
        href: "/products/chen-app",
        description:
          "Book pickups, manage shipments, and track deliveries directly from the app.",
        icon: Smartphone,
      },
      {
        label: "ChenFaster",
        href: "/products/chenfaster",
        description: "Express delivery across Nigeria within 24–48 hours.",
        icon: Zap,
      },
      {
        label: "E-commerce",
        href: "/products/e-commerce",
        description:
          "Flexible shipping solutions designed for online businesses and retailers.",
        icon: ShoppingBag,
      },
      {
        label: "Last-Mile Delivery",
        href: "/products/last-mile-delivery",
        description: "Seamless doorstep delivery for your final-mile needs.",
        icon: DoorOpen,
      },
      {
        label: "Heavy Goods",
        href: "/products/heavy-goods",
        description: "Reliable nationwide transportation for heavy and bulky goods.",
        icon: Package,
      },
      {
        label: "Mailroom Services",
        href: "/products/mailroom-services",
        description: "Efficient mail management and delivery solutions for businesses.",
        icon: Mail,
      },
      {
        label: "Warehousing",
        href: "/products/warehousing",
        description: "Secure storage and inventory management solutions.",
        icon: Warehouse,
      },
    ],
  },
];

/* --------------------------------------------------------------- Locations */

export interface LocationCountry {
  label: string;
  href: string;
  code: string;
}

/** Quick links in the Locations menu — ship from these countries to Nigeria. */
export const LOCATION_COUNTRIES: LocationCountry[] = [
  { label: "Canada", href: "/locations/canada", code: "CA" },
  { label: "China", href: "/locations/china", code: "CN" },
  { label: "Ghana", href: "/locations/ghana", code: "GH" },
  { label: "United Kingdom", href: "/locations/united-kingdom", code: "UK" },
  { label: "United States", href: "/locations/united-states", code: "US" },
];

export interface ShippingRoute {
  from: string;
  to: string;
  href: string;
}

/** Popular shipping routes highlighted in the Locations menu. */
export const POPULAR_ROUTES: ShippingRoute[] = [
  { from: "Canada", to: "Nigeria", href: "/locations/canada" },
  { from: "China", to: "Nigeria", href: "/locations/china" },
  { from: "Ghana", to: "Nigeria", href: "/locations/ghana" },
  { from: "United Kingdom", to: "Nigeria", href: "/locations/united-kingdom" },
  { from: "United States", to: "Nigeria", href: "/locations/united-states" },
];

/* ---------------------------------------------------------------- Resources */

export const RESOURCES_MENU: SiteLink[] = [
  {
    label: "Shipping Price Calculator",
    href: "/resources/calculator",
    description: "Estimate domestic shipping costs instantly",
    icon: Calculator,
  },
  {
    label: "Prohibited Items",
    href: "/resources/prohibited-items",
    description: "What can and cannot travel with us",
    icon: ShieldAlert,
  },
  {
    label: "FAQ",
    href: "/resources/faq",
    description: "Answers to the questions we hear most",
    icon: CircleHelp,
  },
  {
    label: "Blog",
    href: "/resources/blog",
    description: "Shipping guides and company news",
    icon: Newspaper,
  },
  {
    label: "Privacy Policy",
    href: "/resources/privacy-policy",
    description: "How we handle your data",
    icon: ShieldCheck,
  },
  {
    label: "Terms & Conditions",
    href: "/resources/terms-conditions",
    description: "The rules of the road",
    icon: FileText,
  },
  {
    label: "Partnership",
    href: "/resources/partnership",
    description: "Work with Chen Logistics",
    icon: Handshake,
  },
  {
    label: "Developer",
    href: "/resources/developer",
    description: "APIs and integrations",
    icon: Code2,
  },
  {
    label: "IMS Policy Statement",
    href: "/resources/ims-policy",
    description: "Our integrated management system commitment",
    icon: ScrollText,
  },
];

/* ----------------------------------------------------------------- Careers */

export const CAREERS_LINK: SiteLink = {
  label: "Careers",
  href: "/careers",
  icon: Briefcase,
};

/* -------------------------------------------------------------- Quick Links */

/** Right-side action area + mobile quick links. */
export const QUICK_LINKS: SiteLink[] = [
  { label: "Sign Up", href: "/register", icon: Users },
  { label: "Get a Quote", href: "/quote", icon: Calculator },
  { label: "Download Chen Logistics App", href: "/download", icon: Smartphone },
];

export const GET_QUOTE_HREF = "/quote";
export const SIGN_UP_HREF = "/register";
export const DOWNLOAD_APP_HREF = "/download";

/* ------------------------------------------------------------------ Footer */

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Products",
    links: [
      { label: "Chen App", href: "/products/chen-app" },
      { label: "ChenFaster", href: "/products/chenfaster" },
      { label: "E-commerce", href: "/products/e-commerce" },
      { label: "Mailroom Services", href: "/products/mailroom-services" },
      { label: "Warehousing", href: "/products/warehousing" },
      { label: "Domestic Shipping", href: "/products/domestic-shipping" },
      { label: "International Shipping", href: "/products/international-shipping" },
    ],
  },
  {
    title: "International Shipping",
    links: [
      { label: "Export", href: "/products/international-shipping#export" },
      { label: "Import", href: "/products/international-shipping#import" },
      { label: "Shipping From Canada to Nigeria", href: "/locations/canada" },
      { label: "Shipping From China to Nigeria", href: "/locations/china" },
      { label: "Shipping From Ghana to Nigeria", href: "/locations/ghana" },
      { label: "Shipping From UK to Nigeria", href: "/locations/united-kingdom" },
      { label: "Shipping From USA to Nigeria", href: "/locations/united-states" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Vision / Mission / Core Values", href: "/about/vision" },
      { label: "Our Journey", href: "/about/journey" },
      { label: "Management Team", href: "/about/management" },
      { label: "Locations", href: "/locations" },
      { label: "Mobile Experience Centre", href: "/experience" },
      { label: "Corporate", href: "/products/corporate" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Resources",
    links: RESOURCES_MENU.map(({ label, href }) => ({ label, href })),
  },
];

export const FOOTER_LEGAL_LINKS: SiteLink[] = [
  { label: "Privacy Policy", href: "/resources/privacy-policy" },
  { label: "Terms & Conditions", href: "/resources/terms-conditions" },
  { label: "Cookie Policy", href: "/resources/cookie-policy" },
];
