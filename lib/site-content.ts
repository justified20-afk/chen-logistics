/**
 * Chen Logistics — public website content model.
 *
 * Page copy for the marketing site lives here so each route stays a
 * thin wrapper. Keep entries in sync with the navigation in
 * `lib/site-nav.ts`.
 */

/* ----------------------------------------------------------------- Services */

export interface ServiceContent {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
}

export const SERVICES: ServiceContent[] = [
  {
    slug: "domestic-shipping",
    title: "Domestic Shipping",
    tagline: "All 36 states, one network",
    description:
      "Reliable and swift delivery across all 36 states in Nigeria. From a single parcel in Lagos to a full truckload bound for Kano, every shipment moves on the same tracked, auditable network of hubs and routes.",
    features: [
      "Coverage across all 36 states and the FCT",
      "Door-to-door and hub-to-hub delivery options",
      "Real-time tracking with scan events at every hub",
      "Standard, express and same-day service levels",
      "Cash-on-delivery support with reconciliation",
    ],
  },
  {
    slug: "international-shipping",
    title: "International Shipping",
    tagline: "Ship to 230+ locations worldwide",
    description:
      "Ship to 230+ locations worldwide with ease. Chen Logistics handles export documentation, customs clearance and last-mile handover, so a parcel leaving Canada, China, Ghana, the UK or the US arrives in Nigeria on a single tracked journey.",
    features: [
      "Export and import handling with customs clearance",
      "Door-to-door and port-to-door service options",
      "Consolidation of multiple parcels into one shipment",
      "End-to-end tracking from origin to Nigerian destination",
      "Duty and tax guidance before you book",
    ],
  },
  {
    slug: "corporate",
    title: "Corporate",
    tagline: "Built for growing businesses",
    description:
      "Custom logistics solutions built for growing and large businesses. Volume rates, dedicated account management and integration support, so your shipping scales with your order book instead of against it.",
    features: [
      "Volume and contract pricing for regular shippers",
      "Dedicated account manager and escalation path",
      "API and platform integrations for order flow",
      "Consolidated billing and monthly reporting",
      "SLA-backed pickup and delivery windows",
    ],
  },
  {
    slug: "chen-app",
    title: "Chen App",
    tagline: "Your shipments, in your pocket",
    description:
      "Book pickups, manage shipments, and track deliveries directly from the app. The Chen App puts the full shipping workflow on a phone — quote, book, pay, track and confirm, without a call centre.",
    features: [
      "Instant quotes and pickup booking",
      "Live delivery tracking with push notifications",
      "Digital proof-of-delivery capture",
      "Shipment history and receipts in one place",
      "Offline-friendly scanning for field teams",
    ],
  },
  {
    slug: "chenfaster",
    title: "ChenFaster",
    tagline: "24–48 hours, nationwide",
    description:
      "Express delivery across Nigeria within 24–48 hours. ChenFaster is our priority air-and-road express network for time-critical parcels, with earlier cut-offs and priority handling at every hub.",
    features: [
      "Delivery within 24–48 hours across Nigeria",
      "Priority sorting and loading at hubs",
      "Earlier daily pickup cut-off times",
      "Email and SMS alerts at each milestone",
      "Money-back commitment when we miss the window",
    ],
  },
  {
    slug: "e-commerce",
    title: "E-commerce",
    tagline: "Shipping built for online retail",
    description:
      "Flexible shipping solutions designed for online businesses and retailers. Connect your store, auto-generate waybills, offer customers multiple delivery speeds, and let returns run on the same network.",
    features: [
      "Store integrations and bulk waybill generation",
      "Multiple delivery speeds at checkout",
      "Pay-on-delivery with fast settlement",
      "Easy returns and reverse logistics",
      "Volume analytics per order and per region",
    ],
  },
  {
    slug: "last-mile-delivery",
    title: "Last-Mile Delivery",
    tagline: "The final doorstep, handled",
    description:
      "Seamless doorstep delivery for your final-mile needs. Our last-mile network covers urban centres and rural routes alike, with attempted-delivery tracking and same-day re-attempts when the first visit misses.",
    features: [
      "Urban and rural doorstep coverage",
      "Appointment and time-window delivery",
      "Photo and signature proof of delivery",
      "Automatic re-attempt scheduling",
      "Recipient notifications before arrival",
    ],
  },
  {
    slug: "heavy-goods",
    title: "Heavy Goods",
    tagline: "Bulky cargo, nationwide",
    description:
      "Reliable nationwide transportation for heavy and bulky goods. Pallets, machinery, building materials and oversized cargo move on flatbed and box trucks with lift-gate handling where needed.",
    features: [
      "Flatbed, box and curtain-sided truck options",
      "Lift-gate and forklift handling at hubs",
      "Permit and escort coordination for oversized loads",
      "Secured strapping and load documentation",
      "Project quoting for multi-stop movements",
    ],
  },
  {
    slug: "mailroom-services",
    title: "Mailroom Services",
    tagline: "Mail, managed",
    description:
      "Efficient mail management and delivery solutions for businesses. We run your inbound and outbound mailroom — sorting, metering, distribution and same-day inter-office delivery — so your team stops ferrying envelopes.",
    features: [
      "Inbound mail receiving and sorting",
      "Outbound dispatch and metering",
      "Inter-office same-day courier runs",
      "Digital mail logs with recipient sign-off",
      "Scheduled daily or weekly collection rounds",
    ],
  },
  {
    slug: "warehousing",
    title: "Warehousing",
    tagline: "Store, pick, ship",
    description:
      "Secure storage and inventory management solutions. Store stock close to your customers in our Lagos, Abuja and Port Harcourt facilities, with barcode-controlled picking and same-day dispatch to the delivery network.",
    features: [
      "24/7 CCTV and access-controlled facilities",
      "Barcode and batch-controlled inventory",
      "Pick, pack and kitting services",
      "Same-day handover to the delivery network",
      "Monthly stock and inward-outward reports",
    ],
  },
];

export function serviceBySlug(slug: string): ServiceContent | undefined {
  return SERVICES.find((service) => service.slug === slug);
}

/* ---------------------------------------------------------------- Countries */

export interface CountryContent {
  slug: string;
  href: string;
  name: string;
  code: string;
  headline: string;
  description: string;
  transit: string;
  steps: { title: string; body: string }[];
}

const CORRIDOR_STEPS = [
  {
    title: "Book your shipment",
    body: "Create the booking online or in the Chen App — origin address, parcel details and service level. You get a waybill number instantly.",
  },
  {
    title: "We collect or you drop off",
    body: "Schedule a pickup at the origin address, or drop the parcel at the nearest Chen Logistics collection point.",
  },
  {
    title: "Export and freight",
    body: "We handle export documentation, customs clearance and the freight leg, with scan events recorded at each handover.",
  },
  {
    title: "Clearance and delivery",
    body: "Our Nigerian team manages import clearance and last-mile delivery to the recipient's doorstep, with tracking throughout.",
  },
];

export const COUNTRIES: CountryContent[] = [
  {
    slug: "canada",
    href: "/locations/canada",
    name: "Canada",
    code: "CA",
    headline: "Shipping from Canada to Nigeria",
    description:
      "Send parcels, gifts and commercial goods from any Canadian province to Nigeria. Consolidated shipping lets you combine multiple purchases into one freight charge, and our team handles Canadian export paperwork end to end.",
    transit: "7–14 days door to door",
    steps: CORRIDOR_STEPS,
  },
  {
    slug: "china",
    href: "/locations/china",
    name: "China",
    code: "CN",
    headline: "Shipping from China to Nigeria",
    description:
      "Import from China with confidence. We consolidate purchases from Guangzhou, Shenzhen, Yiwu and other sourcing hubs, manage sea and air freight options, and clear customs in Nigeria so your goods arrive ready to sell.",
    transit: "10–21 days door to door",
    steps: CORRIDOR_STEPS,
  },
  {
    slug: "ghana",
    href: "/locations/ghana",
    name: "Ghana",
    code: "GH",
    headline: "Shipping from Ghana to Nigeria",
    description:
      "Fast regional shipping from Accra, Kumasi and Tema to Lagos and beyond. ECOWAS corridor clearances are handled by our regional desk, with road and air options depending on how quickly the shipment must move.",
    transit: "4–8 days door to door",
    steps: CORRIDOR_STEPS,
  },
  {
    slug: "united-kingdom",
    href: "/locations/united-kingdom",
    name: "United Kingdom",
    code: "UK",
    headline: "Shipping from the UK to Nigeria",
    description:
      "Ship from England, Scotland, Wales and Northern Ireland to Nigeria. Our UK desk collects from your door, consolidates parcels, and provides pre-paid duty options so recipients are not surprised at delivery.",
    transit: "6–12 days door to door",
    steps: CORRIDOR_STEPS,
  },
  {
    slug: "united-states",
    href: "/locations/united-states",
    name: "United States",
    code: "US",
    headline: "Shipping from the USA to Nigeria",
    description:
      "Send parcels from all 50 states to Nigeria. Choose economy air or priority express, consolidate multiple online purchases into one shipment, and track the journey from the US pickup to the Nigerian doorstep.",
    transit: "6–14 days door to door",
    steps: CORRIDOR_STEPS,
  },
];

export function countryBySlug(slug: string): CountryContent | undefined {
  return COUNTRIES.find((country) => country.slug === slug);
}

/* -------------------------------------------------------------------- About */

export const ABOUT_SECTIONS = [
  {
    title: "Who we are",
    paragraphs: [
      "Chen Logistics Technologies Limited is a Nigerian logistics and technology company headquartered in Lagos. We combine technology, reliable transportation, and customer-focused logistics solutions to make domestic and international shipping simpler.",
      "Our network links urban hubs and rural routes across all 36 states, and our international corridors connect Nigeria to 230+ locations worldwide — so a shipment moves on one system from the first scan to the final doorstep.",
    ],
  },
  {
    title: "What we do",
    paragraphs: [
      "Domestic shipping, express delivery, e-commerce fulfilment, last-mile delivery, heavy goods transport, mailroom services and warehousing — all operated on a single platform where every scan, handover and delivery attempt is recorded.",
      "For businesses, we add corporate accounts with volume pricing, consolidated billing and integrations. For individuals, the Chen App makes booking a pickup as simple as taking a photo of a parcel.",
    ],
  },
  {
    title: "Why customers choose us",
    paragraphs: [
      "Fast, reliable delivery you can count on. Every shipment carries a promised delivery window, and every milestone is visible to sender and recipient in real time — no phone calls required, no surprises at the destination.",
    ],
  },
];

export const VISION_CONTENT = {
  vision:
    "To be the logistics partner every African business and household trusts — moving anything, anywhere, with clarity and control.",
  mission:
    "We deliver fast, reliable shipping and logistics solutions by combining technology, dependable transportation and customer-focused service — making domestic and international shipping simple for everyone.",
  values: [
    { title: "Reliability", body: "We keep our delivery windows, or we say so plainly." },
    { title: "Speed", body: "Fast is the standard, not the exception." },
    { title: "Integrity", body: "Honest pricing, honest status, honest mistakes." },
    { title: "Customer focus", body: "Every route ends at someone's doorstep — we act like it." },
    { title: "Innovation", body: "Technology should remove work, not add clicks." },
    { title: "Safety", body: "People and parcels arrive in the same condition they left." },
  ],
};

export const JOURNEY_MILESTONES = [
  {
    year: "2019",
    title: "One hub in Lagos",
    body: "Chen Logistics starts with a single distribution hub on Lagos Island and a handful of delivery routes serving local businesses.",
  },
  {
    year: "2021",
    title: "Thirty-six states",
    body: "The network expands to cover all 36 states and the FCT, linking urban hubs with rural routes on one tracking platform.",
  },
  {
    year: "2023",
    title: "ChenFaster launches",
    body: "Express delivery within 24–48 hours goes nationwide, with priority handling at every hub and earlier pickup cut-offs.",
  },
  {
    year: "2024",
    title: "International corridors",
    body: "Shipping from Canada, China, Ghana, the UK and the US to Nigeria begins, with export documentation and customs clearance in-house.",
  },
  {
    year: "2025",
    title: "The Chen App",
    body: "Customers gain pickup booking, live tracking and digital proof of delivery directly on their phones.",
  },
  {
    year: "2026",
    title: "230+ locations worldwide",
    body: "Chen Logistics ships to 230+ locations worldwide, combining technology, reliable transportation and customer-focused solutions at scale.",
  },
];

export const TEAM = [
  {
    name: "Adaeze Chen",
    role: "Founder & Chief Executive Officer",
    initials: "AC",
    bio: "Founded Chen Logistics in 2019 after a decade in West African supply chains. Leads the company's long-term vision and network strategy.",
  },
  {
    name: "Emeka Okafor",
    role: "Chief Operating Officer",
    initials: "EO",
    bio: "Runs hub operations, dispatch and the delivery network across all 36 states, with a focus on on-time performance.",
  },
  {
    name: "Funmi Adeyemi",
    role: "Chief Technology Officer",
    initials: "FA",
    bio: "Leads the platform — tracking, the Chen App and integrations — keeping operations auditable and customer-facing tools simple.",
  },
  {
    name: "Ibrahim Musa",
    role: "Head of International",
    initials: "IM",
    bio: "Owns the export and import corridors from Canada, China, Ghana, the UK and the US, including customs and compliance.",
  },
  {
    name: "Ngozi Eze",
    role: "Head of Customer Experience",
    initials: "NE",
    bio: "Champions the customer promise — from first quote to doorstep — and runs the support and exception teams.",
  },
  {
    name: "Tunde Bello",
    role: "Head of Fleet & Safety",
    initials: "TB",
    bio: "Manages the vehicle fleet, driver standards and safety programmes that keep people and parcels moving securely.",
  },
];

/* -------------------------------------------------------------- Resources */

export const FAQS = [
  {
    question: "How do I track my shipment?",
    answer:
      "Enter your tracking number (for example CH-10482) in the tracking field at the top of this site or in the Chen App. You will see the current status and every recorded scan, from pickup to delivery. No account is required to track.",
  },
  {
    question: "How long does domestic shipping take?",
    answer:
      "Standard domestic shipments are typically delivered within 2–5 working days depending on the destination state. ChenFaster express delivers within 24–48 hours, and same-day service is available in Lagos, Abuja and Port Harcourt.",
  },
  {
    question: "Which countries can I ship from to Nigeria?",
    answer:
      "We currently operate dedicated corridors from Canada, China, Ghana, the United Kingdom and the United States to Nigeria, with delivery to 230+ locations worldwide. Each corridor page lists transit times and how to book.",
  },
  {
    question: "How is my shipping price calculated?",
    answer:
      "Domestic prices are based on the service level, the chargeable weight of the parcel, and any value-added services such as cash on delivery. Use the Shipping Price Calculator on this site for an instant estimate; international quotes are confirmed after we review the parcel details.",
  },
  {
    question: "What items are prohibited?",
    answer:
      "Fully prohibited items include firearms and ammunition, live animals, flammable liquids, narcotics and counterfeit goods. Restricted items such as electronics, liquids and documents may ship with additional packaging or paperwork. See our Prohibited Items page for the full list.",
  },
  {
    question: "What happens if my delivery fails?",
    answer:
      "If the recipient is unavailable, the driver records a failed delivery attempt and the shipment returns to the destination hub. You can schedule a re-attempt from the tracking page or the Chen App. After the allowed attempts, the parcel is held for collection or returned to sender.",
  },
  {
    question: "Do you offer cash on delivery?",
    answer:
      "Yes. Cash on delivery is supported on domestic shipments; the driver collects the amount, and funds are reconciled and settled to your account on the agreed cycle. COD handling fees are shown upfront in the quote.",
  },
  {
    question: "How do I book a pickup?",
    answer:
      "Book a pickup in the Chen App or through your corporate account dashboard. Choose a date and window, confirm the parcel details, and a driver collects from your door. Businesses can also schedule recurring pickup rounds.",
  },
  {
    question: "Can I ship heavy or bulky goods?",
    answer:
      "Yes. Our Heavy Goods service moves pallets, machinery and oversized cargo on flatbed and box trucks, with lift-gate handling and permit coordination for oversized loads. Request a project quote for multi-stop movements.",
  },
  {
    question: "How do I open a corporate account?",
    answer:
      "Use the Get a Quote button and select a corporate enquiry, or contact our sales team with your monthly volume. Corporate accounts include volume pricing, a dedicated account manager, consolidated billing and optional platform integrations.",
  },
];

export const PROHIBITED_CATEGORIES: {
  category: string;
  note: string;
  items: string[];
}[] = [
  {
    category: "Fully prohibited",
    note: "These items can never travel on the Chen Logistics network.",
    items: [
      "Firearms, ammunition and explosives",
      "Flammable liquids and gases",
      "Narcotics and controlled substances",
      "Live animals and plants",
      "Counterfeit goods and pirated media",
      "Valuable stones and precious metals without declaration",
      "Human remains and biohazardous material",
    ],
  },
  {
    category: "Restricted — documentation required",
    note: "These ship only with the correct paperwork and packaging.",
    items: [
      "Electronics and batteries (UN38.3 documentation)",
      "Liquids, creams and aerosols (leak-proof packaging)",
      "Medication and medical devices (pharmacy licence)",
      "Currency and negotiable instruments (declaration form)",
      "Food and agricultural products (NAFDAC / quarantine clearance)",
      "Documents of value (tamper-proof packaging)",
    ],
  },
  {
    category: "International restrictions",
    note: "Import corridors carry additional rules per origin country.",
    items: [
      "Used clothing and footwear (import permit required)",
      "Vehicles and machinery (age and emission limits)",
      "Telecoms devices (type-approval certification)",
      "Currency above declaration thresholds",
      "Goods subject to import prohibition lists",
    ],
  },
];

export const BLOG_POSTS = [
  {
    tag: "Shipping guide",
    title: "How to pack anything for a 36-state delivery",
    date: "12 September 2026",
    readTime: "5 min read",
    excerpt:
      "Boxes, cushioning and labelling choices that cut damage claims to near zero — what our hub teams see when parcels travel well, and what they see when they do not.",
  },
  {
    tag: "Company news",
    title: "ChenFaster now reaches all 36 states in 24–48 hours",
    date: "28 August 2026",
    readTime: "3 min read",
    excerpt:
      "Our express network goes truly nationwide: earlier pickup cut-offs, priority hub sorting and a delivery-window commitment for every state capital.",
  },
  {
    tag: "E-commerce",
    title: "The true cost of a failed delivery",
    date: "9 August 2026",
    readTime: "4 min read",
    excerpt:
      "Failed deliveries quietly double your shipping cost. Here is how recipient notifications, time windows and re-attempt scheduling pay for themselves.",
  },
  {
    tag: "International",
    title: "Shipping from China to Nigeria: a 2026 checklist",
    date: "25 July 2026",
    readTime: "6 min read",
    excerpt:
      "Consolidation, freight mode and documentation — the five decisions that decide whether a China import lands on time or sits at the port.",
  },
];

export const CAREER_ROLES = [
  {
    title: "Operations Manager — Lagos Hub",
    location: "Lagos Island, Lagos",
    type: "Full-time",
    team: "Operations",
    summary:
      "Own throughput, staffing and on-time performance at our largest hub. You will run the shift board and keep the exception queue empty.",
  },
  {
    title: "Dispatch Coordinator",
    location: "Ikeja, Lagos",
    type: "Full-time",
    team: "Operations",
    summary:
      "Build daily trips, assign drivers and vehicles, and enforce capacity limits so every dispatched trip is full and legal.",
  },
  {
    title: "Frontend Engineer",
    location: "Remote — Nigeria",
    type: "Full-time",
    team: "Technology",
    summary:
      "Ship the customer-facing Chen App and portal experiences. React, TypeScript and a healthy suspicion of untested happy paths.",
  },
  {
    title: "Customer Experience Specialist",
    location: "Lagos, Lagos",
    type: "Full-time",
    team: "Customer care",
    summary:
      "First line for tracking questions, delivery concerns and exception follow-ups. Empathy with data — both must be exact.",
  },
  {
    title: "Fleet & Safety Officer",
    location: "Port Harcourt, Rivers",
    type: "Full-time",
    team: "Fleet",
    summary:
      "Run vehicle inspections, driver briefings and incident investigations across the South-South network.",
  },
  {
    title: "International Desk Agent",
    location: "Lagos, Lagos",
    type: "Full-time",
    team: "International",
    summary:
      "Handle export documentation, customs queries and corridor exceptions for our Canada, China, Ghana, UK and US lanes.",
  },
];

/* ------------------------------------------------------------------ Legal */

export const PRIVACY_SECTIONS = [
  {
    title: "Information we collect",
    paragraphs: [
      "When you book a shipment, create an account or request a quote, we collect the information needed to move your parcel: names, addresses, phone numbers, parcel details and payment references. When you use the Chen App, we also collect device identifiers and location data only while a delivery is active.",
      "We collect tracking events, delivery scans and proof-of-delivery records for every shipment so that senders and recipients can see where a parcel is and who received it.",
    ],
  },
  {
    title: "How we use your information",
    paragraphs: [
      "Your information is used to operate the shipping service — routing, dispatch, customs clearance, delivery attempts, notifications and customer support. We also use it to improve the network, resolve disputes, and meet legal and regulatory obligations in Nigeria and the countries we ship from.",
      "We do not sell personal information to third parties, and we do not use shipment data for advertising.",
    ],
  },
  {
    title: "Who we share it with",
    paragraphs: [
      "We share information only with the parties a shipment physically requires: our drivers and hub staff, contracted couriers, customs and regulatory authorities, and payment processors. Each receives the minimum data needed for their role, under contract.",
    ],
  },
  {
    title: "Retention and security",
    paragraphs: [
      "Shipment records are retained for the period required by Nigerian regulation and our records policy, then securely deleted. Access to customer data is role-based and audited; every lookup of a personal record is logged.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: [
      "You may request a copy of your data, correct inaccuracies, or ask us to delete records where the law allows. Contact the data protection contact below and we will respond within the statutory period.",
    ],
  },
];

export const TERMS_SECTIONS = [
  {
    title: "Acceptance of terms",
    paragraphs: [
      "These Terms & Conditions govern your use of the Chen Logistics website, the Chen App and every shipment booked with Chen Logistics Technologies Limited. By booking a shipment or accessing the site, you accept these terms.",
    ],
  },
  {
    title: "Booking a shipment",
    paragraphs: [
      "A booking is accepted when we issue a waybill and tracking number. You warrant that the contents you declare are accurate and permitted under our Prohibited Items policy. Undeclared or prohibited items may be seized, returned at your cost, or disposed of.",
    ],
  },
  {
    title: "Charges and payment",
    paragraphs: [
      "Quoted prices are confirmed at booking and include applicable fees shown in the quote. Cash-on-delivery amounts are collected by the driver and reconciled on the agreed settlement cycle. Unpaid balances may suspend shipment release.",
    ],
  },
  {
    title: "Delivery commitments",
    paragraphs: [
      "Delivery windows are estimates based on our service levels. We make commercially reasonable efforts to meet them; events outside our control (customs holds, weather, road closures) may extend transit time, and we will tell you when they do.",
    ],
  },
  {
    title: "Liability and claims",
    paragraphs: [
      "Our liability for a lost or damaged parcel is limited to the declared value up to the amount shown on your waybill, unless you purchased additional cover. Claims must be raised within 14 days of the promised delivery date with your tracking number.",
    ],
  },
  {
    title: "Changes and contact",
    paragraphs: [
      "We may update these terms from time to time; the current version is always published on this page. Questions about these terms can be directed to the company contact details in the site footer.",
    ],
  },
];

export const COOKIE_SECTIONS = [
  {
    title: "What cookies are",
    paragraphs: [
      "Cookies are small files stored on your device when you visit a website. They let a site remember your preferences and understand how the site is used. This site and the Chen App use cookies and similar technologies (local storage, session tokens).",
    ],
  },
  {
    title: "How we use cookies",
    paragraphs: [
      "Essential cookies keep you signed in and remember your session. Analytics cookies, used only in aggregate, tell us which pages and features are used so we can improve them. Preference cookies remember your language and region choices.",
      "We do not set advertising cookies and we do not sell browsing data.",
    ],
  },
  {
    title: "Managing cookies",
    paragraphs: [
      "You can manage cookies in your browser settings and revoke consent at any time. Disabling essential cookies may affect sign-in and tracking features.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Cookie Policy occasionally; the current version is always published on this page with an updated date.",
    ],
  },
];

export const IMS_SECTIONS = [
  {
    title: "Purpose",
    paragraphs: [
      "Chen Logistics Technologies Limited operates an Integrated Management System (IMS) that combines quality, safety, security and environmental management into one framework. This statement is our public commitment to how the IMS is run across every hub, route and office.",
    ],
  },
  {
    title: "Our commitments",
    paragraphs: [
      "We commit to: meeting customer and regulatory requirements on every shipment; protecting the health and safety of employees, drivers and the communities we serve; securing customer data and cargo; and reducing the environmental impact of our operations through efficient routing and fleet standards.",
    ],
  },
  {
    title: "How it is governed",
    paragraphs: [
      "The IMS is owned by senior management and reviewed at least annually. Objectives are set, measured and reported; incidents, exceptions and audit findings are tracked to closure with named owners. All personnel are trained on the procedures that affect their role.",
    ],
  },
  {
    title: "Continual improvement",
    paragraphs: [
      "We treat every exception, failed delivery and customer concern as an input to the IMS. Root causes are analysed, corrective actions are verified, and lessons are shared across the network.",
    ],
  },
];
