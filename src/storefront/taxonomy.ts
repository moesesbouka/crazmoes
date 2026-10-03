import type { StorefrontDepartment, StorefrontListing, StorefrontSubcategory } from "./types";

export const STOREFRONT_DEPARTMENTS: StorefrontDepartment[] = [
  {
    name: "Electronics",
    slug: "electronics",
    description: "TVs, monitors, computers, audio, cameras and connected tech.",
    keywords: ["tv", "television", "monitor", "computer", "laptop", "desktop", "soundbar", "speaker", "audio", "camera", "projector", "router", "network", "headphone", "keyboard", "mouse"],
    subcategories: [
      { name: "TVs", slug: "tvs", keywords: ["tv", "television"] },
      { name: "Monitors", slug: "monitors", keywords: ["monitor", "display"] },
      { name: "Computers", slug: "computers", keywords: ["computer", "laptop", "desktop", "workstation", "thinkstation", "pc"] },
      { name: "Audio", slug: "audio", keywords: ["soundbar", "speaker", "subwoofer", "receiver", "audio", "bose", "headphone"] },
      { name: "Networking", slug: "networking", keywords: ["router", "mesh", "wifi", "wi-fi", "network", "ethernet"] },
      { name: "Projectors", slug: "projectors", keywords: ["projector"] },
      { name: "Cameras", slug: "cameras", keywords: ["camera", "kodak", "canon", "nikon", "webcam"] },
    ],
  },
  {
    name: "Appliances",
    slug: "appliances",
    description: "Cooling, cleaning and kitchen appliances at liquidation pricing.",
    keywords: ["air conditioner", "portable ac", "window ac", "dehumidifier", "fan", "vacuum", "microwave", "refrigerator", "fridge", "freezer", "dishwasher", "range", "oven", "washer", "dryer", "appliance"],
    subcategories: [
      { name: "Air Conditioners", slug: "air-conditioners", keywords: ["air conditioner", "portable ac", "window ac", "a/c"] },
      { name: "Dehumidifiers", slug: "dehumidifiers", keywords: ["dehumidifier"] },
      { name: "Fans", slug: "fans", keywords: ["fan", "air circulator"] },
      { name: "Microwaves", slug: "microwaves", keywords: ["microwave"] },
      { name: "Vacuums", slug: "vacuums", keywords: ["vacuum", "shop vac"] },
      { name: "Kitchen Appliances", slug: "kitchen-appliances", keywords: ["refrigerator", "fridge", "freezer", "dishwasher", "range", "oven", "cooktop", "air fryer", "toaster"] },
    ],
  },
  {
    name: "Furniture",
    slug: "furniture",
    description: "Living room, bedroom, office, patio and sleep essentials.",
    keywords: ["sofa", "couch", "sectional", "chair", "desk", "table", "bed", "mattress", "dresser", "cabinet", "nightstand", "stool", "recliner", "shelf", "bookcase", "furniture"],
    subcategories: [
      { name: "Living Room", slug: "living-room", keywords: ["sofa", "couch", "sectional", "recliner", "coffee table", "tv stand"] },
      { name: "Bedroom", slug: "bedroom", keywords: ["bed", "dresser", "nightstand", "headboard", "bedroom"] },
      { name: "Office", slug: "office", keywords: ["office chair", "desk", "file cabinet", "workstation"] },
      { name: "Mattresses", slug: "mattresses", keywords: ["mattress", "box spring"] },
      { name: "Desks", slug: "desks", keywords: ["desk", "gaming desk"] },
      { name: "Chairs", slug: "chairs", keywords: ["chair", "stool"] },
    ],
  },
  {
    name: "Home Improvement",
    slug: "home-improvement",
    description: "Fixtures, cabinets, plumbing, hardware and renovation finds.",
    keywords: ["vanity", "faucet", "sink", "toilet", "bidet", "bathtub", "tub", "shower", "cabinet", "door", "hardware", "fixture", "plumbing", "fireplace", "blind", "home improvement"],
    subcategories: [
      { name: "Bathroom", slug: "bathroom", keywords: ["vanity", "toilet", "bidet", "bathtub", "tub", "shower", "bathroom"] },
      { name: "Plumbing", slug: "plumbing", keywords: ["faucet", "sink", "plumbing", "valve"] },
      { name: "Cabinets", slug: "cabinets", keywords: ["cabinet", "medicine cabinet"] },
      { name: "Fixtures", slug: "fixtures", keywords: ["fixture", "faucet", "sink", "lighting"] },
      { name: "Doors", slug: "doors", keywords: ["door"] },
      { name: "Hardware", slug: "hardware", keywords: ["hardware", "lock", "kwikset"] },
    ],
  },
  {
    name: "Tools & Equipment",
    slug: "tools-equipment",
    description: "Power tools, shop equipment and jobsite gear.",
    keywords: ["tool", "drill", "saw", "chainsaw", "compressor", "generator", "welder", "grinder", "sander", "work light", "toolbox"],
    subcategories: [],
  },
  {
    name: "Outdoor & Seasonal",
    slug: "outdoor-seasonal",
    description: "Patio, lawn, camping and seasonal inventory.",
    keywords: ["patio", "outdoor", "grill", "camp", "sleeping bag", "lawn", "garden", "snow", "heater", "umbrella", "gazebo"],
    subcategories: [],
  },
  {
    name: "Fitness",
    slug: "fitness",
    description: "Exercise machines, training gear and recovery equipment.",
    keywords: ["treadmill", "exercise", "fitness", "bike", "elliptical", "proform", "weight", "dumbbell", "ab roller"],
    subcategories: [],
  },
  {
    name: "Scooters & E-Bikes",
    slug: "scooters-ebikes",
    description: "Electric scooters, e-bikes, go-karts and rideables.",
    keywords: ["scooter", "e-bike", "ebike", "electric bike", "ninebot", "segway", "niu", "go kart", "gokart", "razor"],
    subcategories: [],
  },
  {
    name: "Gaming & Arcade",
    slug: "gaming-arcade",
    description: "Arcade cabinets, gaming furniture, accessories and collectibles.",
    keywords: ["arcade", "pac-man", "pacman", "ridge racer", "terminator", "atari", "big buck hunter", "gaming", "game cabinet", "game table"],
    subcategories: [],
  },
  {
    name: "Smart Home & Security",
    slug: "smart-home-security",
    description: "Cameras, locks, sensors and connected-home gear.",
    keywords: ["security", "camera", "smart lock", "doorbell", "sensor", "kidde", "alarm", "thermostat", "smart home"],
    subcategories: [],
  },
  {
    name: "Automotive",
    slug: "automotive",
    description: "Garage, vehicle and automotive accessories.",
    keywords: ["automotive", "car", "vehicle", "garage", "charger", "jump starter", "tire", "motorcycle"],
    subcategories: [],
  },
  {
    name: "Kids & Toys",
    slug: "kids-toys",
    description: "Toys, kids furniture and family finds.",
    keywords: ["toy", "kids", "child", "baby", "ride on", "playset", "doll", "lego"] ,
    subcategories: [],
  },
];

export function getDepartment(slug?: string | null): StorefrontDepartment | undefined {
  if (!slug) return undefined;
  return STOREFRONT_DEPARTMENTS.find((department) => department.slug === slug);
}

export function getSubcategory(department: StorefrontDepartment | undefined, slug?: string | null): StorefrontSubcategory | undefined {
  if (!department || !slug) return undefined;
  return department.subcategories.find((subcategory) => subcategory.slug === slug);
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9+&/' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordMatches(haystack: string, keyword: string): boolean {
  const needle = normalize(keyword);
  if (!needle) return false;
  if (needle.length <= 3 && /^[a-z0-9]+$/.test(needle)) {
    return new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(haystack);
  }
  return haystack.includes(needle);
}

export function classifyListing(listing: Pick<StorefrontListing, "title" | "description" | "category">) {
  const haystack = normalize(`${listing.title} ${listing.category ?? ""} ${listing.description ?? ""}`);

  for (const department of STOREFRONT_DEPARTMENTS) {
    for (const subcategory of department.subcategories) {
      if (subcategory.keywords.some((keyword) => keywordMatches(haystack, keyword))) {
        return { department, subcategory };
      }
    }
    if (department.keywords.some((keyword) => keywordMatches(haystack, keyword))) {
      return { department, subcategory: undefined };
    }
  }

  return { department: undefined, subcategory: undefined };
}

export function keywordsForRoute(departmentSlug?: string | null, subcategorySlug?: string | null): string[] {
  const department = getDepartment(departmentSlug);
  const subcategory = getSubcategory(department, subcategorySlug);
  if (subcategory) return subcategory.keywords;
  return department?.keywords ?? [];
}
