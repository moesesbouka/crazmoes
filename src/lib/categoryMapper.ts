// Auto-categorize products based on title keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Furniture": ["chair", "table", "desk", "couch", "sofa", "bed", "dresser", "cabinet", "shelf", "bookcase", "ottoman", "bench", "stool", "nightstand", "wardrobe", "armoire", "futon", "recliner", "loveseat", "headboard", "mattress"],
  "Electronics": ["tv", "television", "monitor", "computer", "laptop", "phone", "tablet", "speaker", "headphone", "camera", "printer", "router", "keyboard", "mouse", "gaming", "console", "xbox", "playstation", "nintendo", "bluetooth", "wireless", "usb", "charger", "cable", "adapter", "battery", "drone", "smartwatch", "earbuds", "soundbar"],
  "Tools & Hardware": ["drill", "saw", "hammer", "screwdriver", "wrench", "pliers", "tool", "power tool", "ladder", "level", "tape measure", "socket", "nail", "screw", "bolt", "clamp", "sander", "grinder", "compressor", "generator", "welder", "chainsaw", "trimmer", "mower"],
  "Kitchen & Dining": ["pot", "pan", "knife", "cutting board", "blender", "mixer", "toaster", "microwave", "coffee", "kettle", "dish", "plate", "bowl", "cup", "mug", "utensil", "spatula", "cookware", "bakeware", "food processor", "instant pot", "air fryer", "silverware", "dinnerware"],
  "Home & Garden": ["plant", "planter", "pot", "garden", "hose", "lawn", "outdoor", "patio", "grill", "bbq", "umbrella", "cushion", "rug", "carpet", "curtain", "blind", "lamp", "light", "decor", "vase", "frame", "mirror", "clock", "pillow", "blanket", "throw", "candle"],
  "Sports & Outdoors": ["bike", "bicycle", "golf", "tennis", "basketball", "football", "soccer", "baseball", "fishing", "camping", "tent", "sleeping bag", "backpack", "hiking", "kayak", "paddle", "surfboard", "skateboard", "ski", "snowboard", "exercise", "fitness", "weight", "dumbbell", "treadmill", "yoga"],
  "Clothing & Accessories": ["shirt", "pants", "jeans", "dress", "jacket", "coat", "sweater", "hoodie", "shoes", "boots", "sneakers", "sandals", "hat", "cap", "scarf", "gloves", "belt", "wallet", "purse", "bag", "backpack", "watch", "jewelry", "sunglasses", "tie"],
  "Baby & Kids": ["baby", "crib", "stroller", "car seat", "highchair", "playpen", "toy", "toys", "lego", "doll", "puzzle", "game", "kids", "children", "infant", "toddler", "nursery", "diaper"],
  "Office & School": ["office", "desk", "chair", "file", "folder", "binder", "notebook", "pen", "pencil", "stapler", "paper", "printer", "scanner", "whiteboard", "calendar", "organizer", "storage", "bin", "box"],
  "Appliances": ["washer", "dryer", "refrigerator", "fridge", "freezer", "dishwasher", "oven", "stove", "range", "hood", "vacuum", "iron", "fan", "heater", "air conditioner", "ac", "dehumidifier", "humidifier", "purifier"],
  "Automotive": ["car", "auto", "vehicle", "tire", "wheel", "jack", "jumper", "oil", "filter", "brake", "battery", "headlight", "taillight", "seat cover", "floor mat", "trunk", "cargo"],
  "Health & Beauty": ["makeup", "cosmetic", "skincare", "hair", "brush", "comb", "dryer", "straightener", "curler", "razor", "shaver", "trimmer", "scale", "thermometer", "first aid", "medicine", "vitamin", "supplement", "massage", "spa"],
  "Pet Supplies": ["dog", "cat", "pet", "collar", "leash", "bowl", "food", "treat", "toy", "bed", "crate", "cage", "aquarium", "fish", "bird", "hamster", "rabbit"],
  "Books & Media": ["book", "novel", "textbook", "magazine", "dvd", "blu-ray", "cd", "vinyl", "record", "album", "movie", "music", "audiobook"],
  "Art & Crafts": ["paint", "brush", "canvas", "easel", "yarn", "fabric", "sewing", "knitting", "crochet", "scrapbook", "craft", "art", "drawing", "sketch", "color", "marker", "crayon"],
};

export function categorizeProduct(title: string, description: string = ""): string {
  const searchText = `${title} ${description}`.toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Use word boundary matching to avoid partial matches
      const regex = new RegExp(`\\b${keyword}s?\\b`, 'i');
      if (regex.test(searchText)) {
        return category;
      }
    }
  }
  
  return "Other";
}
