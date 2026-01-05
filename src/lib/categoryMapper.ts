// Auto-categorize products based on title keywords
// Priority order matters - more specific categories should come first
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Appliances - check before Electronics (more specific)
  "Appliances": [
    "washer", "dryer", "refrigerator", "fridge", "freezer", "dishwasher", "oven", "stove",
    "range hood", "hood vent",
    "vacuum", "roomba", "dyson", "bissell", "shark", "iron", "steamer",
    "box fan", "tower fan", "floor fan",
    "heater", "air conditioner",
    "ac unit", "dehumidifier", "humidifier", "purifier", "air purifier", "water heater", "garbage disposal",
    "instant pot", "pressure cooker", "slow cooker", "crock pot", "air fryer", "deep fryer", "rice cooker",
    "bread maker", "ice maker", "wine cooler", "beverage cooler", "chest freezer", "upright freezer",
    "mini fridge", "compact refrigerator", "window ac", "portable ac", "space heater", "furnace"
  ],
  
  // Electronics
  "Electronics": [
    "tv", "television", "smart tv", "roku", "firestick", "apple tv", "chromecast", "monitor", "computer", 
    "laptop", "desktop", "macbook", "chromebook", "imac", "pc", "phone", "iphone", "samsung", "android", 
    "tablet", "ipad", "kindle", "speaker", "bluetooth speaker", "soundbar", "subwoofer", "receiver", "amplifier",
    "headphone", "earbuds", "airpods", "beats", "bose", "camera", "dslr", "gopro", "webcam", "ring doorbell",
    "printer", "scanner", "copier", "router", "modem", "wifi", "mesh", "keyboard", "mouse", "trackpad",
    "gaming", "console", "xbox", "playstation", "ps4", "ps5", "nintendo", "switch", "controller", "vr", "oculus",
    "drone", "smartwatch", "apple watch", "fitbit", "garmin", "projector", "streaming", "cable", "hdmi", "usb",
    "charger", "power bank", "battery", "adapter", "hub", "docking station", "external hard drive", "ssd",
    "flash drive", "memory card", "sd card", "record player", "turntable", "cassette", "radio", "stereo",
    "home theater", "surround sound", "karaoke", "microphone", "audio", "video", "led", "smart home", "alexa", "echo"
  ],
  
  // Furniture
  "Furniture": [
    "chair", "office chair", "gaming chair", "recliner", "rocker", "glider", "accent chair", "dining chair",
    "table", "dining table", "coffee table", "end table", "side table", "console table", "entry table",
    "desk", "standing desk", "computer desk", "writing desk", "l-shaped desk", "couch", "sofa", "sectional",
    "loveseat", "sleeper sofa", "futon", "daybed", "bed", "bed frame", "platform bed", "bunk bed", "loft bed",
    "headboard", "footboard", "mattress", "box spring", "dresser", "chest of drawers", "nightstand", "bedside",
    "cabinet", "hutch", "buffet", "sideboard", "credenza", "armoire", "wardrobe", "closet organizer",
    "shelf", "shelving", "bookcase", "bookshelf", "entertainment center", "tv stand", "media console",
    "ottoman", "pouf", "bench", "storage bench", "stool", "bar stool", "counter stool", "vanity",
    "murphy bed", "trundle", "canopy bed", "sleigh bed", "bedroom set", "dining set", "patio furniture",
    "outdoor furniture", "wicker", "adirondack", "hammock", "porch swing", "rocking chair"
  ],
  
  // Kitchen & Dining
  "Kitchen & Dining": [
    "pot", "pan", "skillet", "wok", "dutch oven", "stock pot", "sauce pan", "frying pan", "cast iron",
    "knife", "knife set", "chef knife", "cutting board", "butcher block", "blender", "vitamix", "ninja",
    "mixer", "stand mixer", "kitchenaid", "hand mixer", "toaster", "toaster oven", "microwave",
    "coffee maker", "keurig", "nespresso", "espresso", "french press", "kettle", "electric kettle",
    "dish", "plate", "dinnerware", "bowl", "cup", "mug", "glass", "drinkware", "utensil", "silverware",
    "flatware", "cutlery", "spatula", "ladle", "tong", "whisk", "colander", "strainer", "grater",
    "peeler", "can opener", "bottle opener", "corkscrew", "measuring cup", "measuring spoon",
    "mixing bowl", "baking", "bakeware", "cookie sheet", "baking pan", "muffin tin", "cake pan",
    "pie dish", "casserole", "roasting pan", "food processor", "cuisinart", "mandoline", "spiralizer",
    "juicer", "food scale", "timer", "thermometer", "meat thermometer", "spice rack", "canister",
    "tupperware", "food storage", "container", "pitcher", "carafe", "wine glass", "wine rack"
  ],
  
  // Tools & Hardware
  "Tools & Hardware": [
    "drill", "cordless drill", "impact driver", "hammer drill", "saw", "circular saw", "miter saw", 
    "table saw", "jigsaw", "reciprocating saw", "band saw", "chainsaw", "hammer", "mallet", "sledgehammer",
    "screwdriver", "wrench", "socket", "ratchet", "pliers", "vise grip", "channel lock", "crescent",
    "tool set", "tool box", "tool chest", "tool bag", "power tool", "dewalt", "milwaukee", "makita",
    "ryobi", "craftsman", "stanley", "bosch", "black and decker", "ladder", "step ladder", "extension ladder",
    "level", "tape measure", "stud finder", "multimeter", "clamp", "c-clamp", "bar clamp", "vise",
    "sander", "belt sander", "orbital sander", "grinder", "angle grinder", "bench grinder", "buffer",
    "compressor", "air compressor", "nail gun", "staple gun", "heat gun", "glue gun", "soldering iron",
    "generator", "welder", "plasma cutter", "trimmer", "edger", "mower", "lawn mower", "riding mower",
    "leaf blower", "pressure washer", "shop vac", "wet dry vac", "router", "wood router", "planer",
    "jointer", "lathe", "scroll saw", "dremel", "rotary tool", "oscillating tool", "workbench"
  ],
  
  // Home & Garden
  "Home & Garden": [
    "plant", "planter", "pot", "flower pot", "garden", "gardening", "hose", "sprinkler", "nozzle",
    "lawn", "grass", "seed", "fertilizer", "mulch", "soil", "compost", "rake", "shovel", "spade", "hoe",
    "wheelbarrow", "garden cart", "patio", "deck", "grill", "bbq", "barbecue", "smoker",
    "fire pit", "chiminea", "umbrella", "patio umbrella", "gazebo", "pergola", "awning", "shade",
    "outdoor cushion", "area rug", "runner", "doormat",
    "curtain", "drape", "blind", "shade", "shutter", "lamp", "floor lamp", "table lamp", "light fixture",
    "chandelier", "pendant", "sconce", "ceiling fan", "wall art", "picture frame", "photo frame",
    "vase", "mirror", "wall mirror", "clock", "wall clock", "throw pillow",
    "throw blanket", "candle", "candle holder", "diffuser", "fountain", "bird bath", "bird feeder",
    "planter box", "raised bed", "trellis", "arbor", "fence", "gate", "shed", "storage shed"
  ],
  
  // Sports & Fitness
  "Sports & Fitness": [
    "bike", "bicycle", "mountain bike", "road bike", "hybrid", "ebike", "electric bike", "cycling",
    "golf", "golf club", "golf bag", "golf cart", "tennis", "tennis racket", "pickleball", "badminton",
    "basketball", "basket ball", "nba", "wnba", "spalding", "wilson", "basketball hoop", "football", "soccer", "soccer ball", "baseball", "bat", "glove",
    "fishing", "fishing rod", "reel", "tackle", "lure", "camping", "tent", "sleeping bag", "camping gear",
    "backpack", "hiking", "hiking boots", "trail", "kayak", "canoe", "paddle", "paddleboard", "sup",
    "surfboard", "wetsuit", "snorkel", "scuba", "skateboard", "longboard", "scooter", "roller skates",
    "ski", "snowboard", "sled", "toboggan", "hockey", "ice skates", "lacrosse", "volleyball", "cornhole",
    "exercise", "fitness", "gym", "workout", "weight", "dumbbell", "barbell", "kettlebell", "weight bench",
    "treadmill", "elliptical", "exercise bike", "spin bike", "peloton", "rowing machine", "stair climber",
    "yoga", "yoga mat", "pilates", "resistance band", "jump rope", "pull up bar", "home gym", "punching bag",
    "boxing", "mma", "martial arts", "pool", "swimming", "goggles", "trampoline", "bounce house"
  ],
  
  // Clothing & Accessories
  "Clothing & Accessories": [
    "shirt", "t-shirt", "polo", "button down", "blouse", "top", "tank top", "pants", "trousers", "slacks",
    "jeans", "denim", "shorts", "skirt", "dress", "gown", "suit", "blazer", "jacket", "coat", "parka",
    "sweater", "cardigan", "hoodie", "sweatshirt", "fleece", "vest", "shoes", "boots", "sneakers", "athletic shoes",
    "running shoes", "sandals", "flip flops", "heels", "flats", "loafers", "oxfords", "slippers",
    "hat", "cap", "beanie", "scarf", "gloves", "mittens", "belt", "suspenders", "wallet", "purse",
    "handbag", "tote", "crossbody", "clutch", "watch", "jewelry", "necklace", "bracelet", "ring", "earrings",
    "sunglasses", "glasses", "tie", "bow tie", "cufflinks", "socks", "underwear", "bra", "lingerie",
    "swimsuit", "bikini", "trunks", "robe", "pajamas", "loungewear", "activewear", "leggings", "sports bra",
    "uniform", "scrubs", "workwear", "safety vest", "hard hat", "steel toe"
  ],
  
  // Baby & Kids
  "Baby & Kids": [
    "baby", "infant", "newborn", "toddler", "kids", "children", "child", "crib", "bassinet", "cradle",
    "stroller", "jogging stroller", "double stroller", "car seat", "infant car seat", "booster seat",
    "highchair", "high chair", "booster", "playpen", "pack n play", "baby gate", "safety gate",
    "baby monitor", "changing table", "diaper", "wipes", "bottle", "baby bottle", "sippy cup",
    "pacifier", "teether", "bib", "burp cloth", "swaddle", "baby blanket", "nursery", "mobile",
    "baby swing", "bouncer", "rocker", "walker", "activity center", "exersaucer", "jumper",
    "toy", "toys", "plush", "stuffed animal", "lego", "building blocks", "doll", "action figure",
    "puzzle", "game", "board game", "video game", "play", "playhouse", "playset", "swing set",
    "sandbox", "slide", "tricycle", "balance bike", "kids bike", "scooter", "wagon"
  ],
  
  // Office & School
  "Office & School": [
    "office", "desk accessory", "file", "file cabinet", "filing", "folder", "binder", "notebook", "journal",
    "pen", "pencil", "marker", "highlighter", "stapler", "staples", "tape dispenser", "scissors",
    "paper", "copy paper", "printer paper", "sticky notes", "post-it", "index cards", "envelope",
    "whiteboard", "dry erase", "bulletin board", "cork board", "calendar", "planner", "organizer",
    "desk organizer", "paper tray", "letter tray", "pencil holder", "pencil cup", "desk pad",
    "calculator", "shredder", "laminator", "label maker", "rubber band", "paper clip", "binder clip",
    "push pin", "thumb tack", "storage bin", "storage box", "banker box", "magazine holder",
    "bookend", "desk lamp", "task light", "ergonomic", "footrest", "monitor stand", "keyboard tray",
    "school supplies", "backpack", "lunch box", "water bottle", "locker"
  ],
  
  // Automotive
  "Automotive": [
    "car", "auto", "automotive", "vehicle", "truck", "suv", "van", "motorcycle", "atv", "utv",
    "tire", "wheel", "rim", "hubcap", "jack", "car jack", "floor jack", "jack stand", "jumper cable",
    "jump starter", "battery charger", "oil", "motor oil", "filter", "oil filter", "air filter",
    "brake", "brake pad", "rotor", "car battery", "alternator", "starter", "spark plug",
    "headlight", "taillight", "bulb", "wiper", "wiper blade", "windshield", "car cover",
    "seat cover", "floor mat", "car mat", "trunk organizer", "cargo", "roof rack", "cargo carrier",
    "bike rack", "hitch", "trailer hitch", "tow", "winch", "car wash", "car wax", "polish",
    "detail", "detailing", "car vacuum", "tire inflator", "air compressor", "tire gauge",
    "obd", "diagnostic", "dash cam", "gps", "car stereo", "subwoofer", "amplifier", "car speaker"
  ],
  
  // Health & Beauty
  "Health & Beauty": [
    "makeup", "cosmetic", "foundation", "concealer", "mascara", "lipstick", "lip gloss", "eyeshadow",
    "eyeliner", "blush", "bronzer", "highlighter", "primer", "setting spray", "makeup brush",
    "skincare", "cleanser", "moisturizer", "serum", "toner", "sunscreen", "spf", "face mask",
    "anti-aging", "retinol", "vitamin c", "hyaluronic", "lotion", "body lotion", "body wash",
    "hair", "shampoo", "conditioner", "hair dryer", "blow dryer", "straightener", "flat iron",
    "curling iron", "curler", "hair brush", "comb", "hair clip", "hair tie", "hair product",
    "razor", "shaver", "electric shaver", "trimmer", "beard trimmer", "clipper", "epilator",
    "wax", "waxing", "nail", "nail polish", "manicure", "pedicure", "nail file", "cuticle",
    "scale", "bathroom scale", "thermometer", "blood pressure", "first aid", "bandage", "gauze",
    "medicine", "vitamin", "supplement", "protein", "collagen", "massage", "massager", "spa",
    "essential oil", "aromatherapy", "diffuser", "humidifier", "heating pad", "ice pack"
  ],
  
  // Pet Supplies
  "Pet Supplies": [
    "dog", "puppy", "cat", "kitten", "pet", "animal", "collar", "harness", "leash", "retractable leash",
    "pet bed", "dog bed", "cat bed", "dog house", "cat tree", "scratching post", "crate", "kennel",
    "carrier", "pet carrier", "pet gate", "dog food", "cat food", "pet food", "treat", "dog treat",
    "cat treat", "food bowl", "water bowl", "pet bowl", "automatic feeder", "water fountain",
    "pet toy", "dog toy", "cat toy", "chew toy", "frisbee", "rope toy", "squeaky toy",
    "aquarium", "fish tank", "filter", "aquarium filter", "fish", "tropical fish", "fish food",
    "bird", "bird cage", "parakeet", "parrot", "hamster", "guinea pig", "rabbit", "bunny",
    "reptile", "terrarium", "heat lamp", "flea", "tick", "flea treatment", "shampoo", "grooming",
    "brush", "nail clipper", "deshedding", "litter", "litter box", "cat litter", "poop bag", "waste bag"
  ],
  
  // Seasonal & Holiday
  "Seasonal & Holiday": [
    "christmas", "holiday", "xmas", "santa", "ornament", "wreath", "garland", "christmas tree",
    "lights", "string lights", "led lights", "halloween", "costume", "decoration", "decor",
    "thanksgiving", "fall", "autumn", "harvest", "pumpkin", "easter", "spring", "valentine",
    "patriotic", "fourth of july", "july 4th", "memorial day", "labor day", "new year",
    "party", "party supplies", "balloon", "banner", "streamer", "confetti", "invitation",
    "gift wrap", "wrapping paper", "gift bag", "bow", "ribbon", "gift box", "stocking",
    "inflatable", "yard decoration", "outdoor decoration", "snowman", "reindeer", "nativity"
  ],
  
  // Storage & Organization
  "Storage & Organization": [
    "storage", "organizer", "organization", "bin", "basket", "container", "tote", "tub",
    "drawer", "drawer organizer", "shelf", "shelving unit", "rack", "closet", "closet organizer",
    "hanger", "coat rack", "hook", "wall hook", "pegboard", "garage storage", "garage organizer",
    "tool storage", "cabinet", "locker", "safe", "lockbox", "trunk", "chest", "storage ottoman",
    "under bed storage", "vacuum bag", "space bag", "shoe rack", "shoe organizer", "jewelry organizer",
    "makeup organizer", "bathroom organizer", "kitchen organizer", "pantry organizer", "lazy susan",
    "spice rack", "can organizer", "lid organizer", "pot rack", "utensil holder", "knife block",
    "mail organizer", "key holder", "charging station", "cord organizer", "cable management"
  ],
  
  // Bedding & Bath
  "Bedding & Bath": [
    "bedding", "sheet", "bed sheet", "fitted sheet", "flat sheet", "pillowcase", "duvet", "duvet cover",
    "comforter", "quilt", "bedspread", "blanket", "throw", "afghan", "pillow", "bed pillow", "body pillow",
    "mattress pad", "mattress topper", "mattress protector", "bed skirt", "sham", "euro sham",
    "towel", "bath towel", "hand towel", "washcloth", "beach towel", "bath mat", "bathroom rug",
    "shower curtain", "shower liner", "shower rod", "shower caddy", "soap dish", "soap dispenser",
    "toothbrush holder", "toilet brush", "toilet paper holder", "towel bar", "towel rack", "robe hook",
    "bathroom accessories", "bath set", "vanity", "medicine cabinet", "bathroom mirror", "magnifying mirror"
  ],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SHOPIFY_CATEGORY_MAP: Array<{ match: RegExp; category: string }> = [
  { match: /^sporting goods/i, category: "Sports & Fitness" },
  { match: /^apparel/i, category: "Clothing & Accessories" },
  { match: /^health & beauty/i, category: "Health & Beauty" },
  { match: /^pet supplies/i, category: "Pet Supplies" },
  { match: /^electronics/i, category: "Electronics" },
  { match: /^furniture/i, category: "Furniture" },
  { match: /^home & garden/i, category: "Home & Garden" },
  { match: /^tools/i, category: "Tools & Hardware" },
  { match: /^hardware/i, category: "Tools & Hardware" },
  { match: /^office/i, category: "Office & School" },
  { match: /^automotive/i, category: "Automotive" },
  { match: /^baby/i, category: "Baby & Kids" },
];

export function mapShopifyCategoryName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  for (const rule of SHOPIFY_CATEGORY_MAP) {
    if (rule.match.test(trimmed)) return rule.category;
  }

  return null;
}

export function categorizeProduct(title: string, description: string = ""): string {
  const searchText = `${title} ${description}`.toLowerCase();

  let bestCategory = "Other";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      const escaped = escapeRegExp(normalizedKeyword);

      // For multi-word phrases, allow any whitespace between words.
      const pattern = normalizedKeyword.includes(" ")
        ? `\\b${escaped.replace(/\s+/g, "\\\\s+")}\\b`
        : `\\b${escaped}s?\\b`;

      const regex = new RegExp(pattern, "i");

      if (regex.test(searchText)) {
        const weight = normalizedKeyword.includes(" ")
          ? 3
          : normalizedKeyword.length >= 8
            ? 2
            : 1;
        score += weight;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : "Other";
}

export function resolveProductCategory(
  title: string,
  description?: string,
  shopifyCategoryName?: string | null,
  productType?: string | null
): string {
  // User requirement: prioritize our own categorization based on title/description,
  // and do not rely on Shopify-provided classifications.
  return categorizeProduct(title, description ?? "");
}

