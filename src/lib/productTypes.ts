import type { LanguageCode } from "@/i18n/portal";

export type ProductTypeNode = {
    id: string;
    children?: ProductTypeNode[];
};

export const PRODUCT_TYPE_TREE: ProductTypeNode[] = [
    { id: "uncategorized" },
    {
        id: "animals-pet-supplies",
        children: [
            {
                id: "pet-food-treats",
                children: [
                    { id: "dog-food" },
                    { id: "cat-food" },
                    { id: "bird-feed" },
                    { id: "fish-food" },
                    { id: "horse-feed" },
                ],
            },
            {
                id: "pet-health-care",
                children: [
                    { id: "flea-tick-control" },
                    { id: "pet-vitamins-supplements" },
                    { id: "pet-dental-care" },
                    { id: "pet-first-aid" },
                ],
            },
            {
                id: "pet-housing",
                children: [
                    { id: "dog-crates-kennels" },
                    { id: "cat-trees-furniture" },
                    { id: "small-animal-habitats" },
                    { id: "bird-cages" },
                ],
            },
            {
                id: "pet-toys",
                children: [
                    { id: "dog-toys" },
                    { id: "cat-toys" },
                    { id: "bird-toys" },
                    { id: "interactive-pet-toys" },
                ],
            },
            {
                id: "livestock",
                children: [
                    { id: "livestock-feed" },
                    { id: "livestock-fencing" },
                    { id: "barn-stable-supplies" },
                    { id: "animal-health-supplies" },
                ],
            },
            {
                id: "pet-grooming",
                children: [
                    { id: "pet-shampoo-conditioner" },
                    { id: "brushes-combs" },
                    { id: "grooming-tools" },
                    { id: "nail-clippers-grinders" },
                ],
            },
            {
                id: "aquatic",
                children: [
                    { id: "aquariums" },
                    { id: "aquarium-filters-pumps" },
                    { id: "aquarium-lighting" },
                    { id: "water-conditioners-test-kits" },
                ],
            },
            {
                id: "equine",
                children: [
                    { id: "saddles-tack" },
                    { id: "horse-riding-apparel" },
                    { id: "stable-supplies" },
                    { id: "equine-care-grooming" },
                ],
            },
        ],
    },
    {
        id: "accessories-apparel",
        children: [
            {
                id: "clothing",
                children: [
                    { id: "mens-clothing" },
                    { id: "womens-clothing" },
                    { id: "kids-clothing" },
                    { id: "activewear" },
                    { id: "outerwear" },
                ],
            },
            {
                id: "footwear",
                children: [
                    { id: "casual-shoes" },
                    { id: "athletic-shoes" },
                    { id: "boots" },
                    { id: "sandals" },
                    { id: "cycling-shoes" },
                ],
            },
            {
                id: "fashion-accessories",
                children: [
                    { id: "belts" },
                    { id: "hats-caps" },
                    { id: "scarves-gloves" },
                    { id: "sunglasses" },
                    { id: "wallets-cardholders" },
                ],
            },
            {
                id: "jewelry",
                children: [
                    { id: "rings" },
                    { id: "necklaces" },
                    { id: "bracelets" },
                    { id: "earrings" },
                ],
            },
            {
                id: "workwear-uniforms",
                children: [
                    { id: "medical-uniforms" },
                    { id: "hospitality-uniforms" },
                    { id: "industrial-workwear" },
                    { id: "high-visibility-workwear" },
                ],
            },
            {
                id: "watches",
                children: [
                    { id: "analog-watches" },
                    { id: "digital-watches" },
                    { id: "luxury-watches" },
                    { id: "watch-accessories" },
                ],
            },
            {
                id: "protective-gear",
                children: [
                    { id: "helmets" },
                    { id: "gloves-protection" },
                    { id: "body-armor-pads" },
                    { id: "eye-ear-protection" },
                ],
            },
        ],
    },
    {
        id: "business-industrial",
        children: [
            {
                id: "lab-science",
                children: [
                    { id: "lab-glassware" },
                    { id: "lab-instruments" },
                    { id: "lab-chemicals-consumables" },
                    { id: "sample-preparation" },
                ],
            },
            {
                id: "safety-security",
                children: [
                    { id: "workplace-safety-ppe" },
                    { id: "fire-safety" },
                    { id: "surveillance-access-control" },
                    { id: "alarms-emergency-systems" },
                ],
            },
            {
                id: "manufacturing-supplies",
                children: [
                    { id: "cnc-machine-tools" },
                    { id: "industrial-consumables" },
                    { id: "production-line-components" },
                    { id: "maintenance-repair-operations" },
                ],
            },
            {
                id: "restaurant-hospitality",
                children: [
                    { id: "commercial-kitchen-equipment" },
                    { id: "tableware-serveware" },
                    { id: "food-storage-prep" },
                    { id: "bar-coffee-equipment" },
                ],
            },
            {
                id: "material-handling",
                children: [
                    { id: "carts-trolleys" },
                    { id: "lifts-hoists" },
                    { id: "warehouse-racking" },
                    { id: "pallet-jacks-forklift-accessories" },
                ],
            },
            {
                id: "packaging-shipping",
                children: [
                    { id: "boxes-mailers" },
                    { id: "tape-labels" },
                    { id: "void-fill-protection" },
                    { id: "shipping-scale-postage" },
                ],
            },
            {
                id: "janitorial-sanitation",
                children: [
                    { id: "cleaning-chemicals" },
                    { id: "facility-cleaning-tools" },
                    { id: "restroom-supplies" },
                    { id: "waste-management" },
                ],
            },
        ],
    },
    {
        id: "camera-optics",
        children: [
            {
                id: "cameras",
                children: [
                    { id: "mirrorless-cameras" },
                    { id: "dslr-cameras" },
                    { id: "compact-cameras" },
                    { id: "action-cameras" },
                    { id: "instant-cameras" },
                ],
            },
            {
                id: "lenses",
                children: [
                    { id: "prime-lenses" },
                    { id: "zoom-lenses" },
                    { id: "telephoto-lenses" },
                    { id: "macro-lenses" },
                    { id: "cine-lenses" },
                ],
            },
            {
                id: "camera-accessories",
                children: [
                    { id: "camera-bags-cases" },
                    { id: "memory-cards-storage" },
                    { id: "camera-batteries-chargers" },
                    { id: "camera-filters" },
                ],
            },
            {
                id: "binoculars-scopes",
                children: [
                    { id: "binoculars" },
                    { id: "spotting-scopes" },
                    { id: "telescopes" },
                    { id: "rangefinders" },
                ],
            },
            {
                id: "tripods-supports",
                children: [
                    { id: "tripods" },
                    { id: "monopods" },
                    { id: "gimbals-stabilizers" },
                    { id: "camera-rigs-cages" },
                ],
            },
            {
                id: "lighting-studio",
                children: [
                    { id: "studio-lights" },
                    { id: "speedlights-flashes" },
                    { id: "softboxes-diffusers" },
                    { id: "backdrops-support-systems" },
                ],
            },
            {
                id: "drones-aerial",
                children: [
                    { id: "camera-drones" },
                    { id: "fpv-drones" },
                    { id: "drone-batteries-propellers" },
                    { id: "drone-carry-cases" },
                ],
            },
        ],
    },
    {
        id: "electronics",
        children: [
            {
                id: "computers",
                children: [
                    {
                        id: "laptops",
                        children: [
                            { id: "ultrabooks" },
                            { id: "gaming-laptops" },
                            { id: "business-laptops" },
                            { id: "creator-workstation-laptops" },
                        ],
                    },
                    {
                        id: "desktops",
                        children: [
                            { id: "gaming-desktops" },
                            { id: "all-in-one-desktops" },
                            { id: "business-desktops" },
                            { id: "workstations" },
                        ],
                    },
                    {
                        id: "components",
                        children: [
                            { id: "cpus" },
                            { id: "gpus" },
                            { id: "motherboards" },
                            { id: "ram-memory" },
                            { id: "storage-drives" },
                            { id: "power-supplies" },
                            { id: "pc-cases-cooling" },
                        ],
                    },
                    {
                        id: "monitors",
                        children: [
                            { id: "gaming-monitors" },
                            { id: "professional-monitors" },
                            { id: "ultrawide-monitors" },
                            { id: "portable-monitors" },
                        ],
                    },
                    {
                        id: "printers",
                        children: [
                            { id: "inkjet-printers" },
                            { id: "laser-printers" },
                            { id: "label-printers" },
                            { id: "3d-printers" },
                        ],
                    },
                ],
            },
            {
                id: "phones",
                children: [
                    {
                        id: "smartphones",
                        children: [
                            { id: "android-phones" },
                            { id: "ios-phones" },
                            { id: "foldable-phones" },
                            { id: "rugged-phones" },
                        ],
                    },
                    {
                        id: "feature-phones",
                        children: [
                            { id: "basic-feature-phones" },
                            { id: "4g-feature-phones" },
                        ],
                    },
                    {
                        id: "phone-cases",
                        children: [
                            { id: "slim-cases" },
                            { id: "rugged-cases" },
                            { id: "wallet-cases" },
                            { id: "waterproof-cases" },
                        ],
                    },
                    {
                        id: "phone-chargers",
                        children: [
                            { id: "wired-chargers" },
                            { id: "wireless-chargers" },
                            { id: "fast-chargers" },
                            { id: "power-banks" },
                        ],
                    },
                ],
            },
            {
                id: "audio",
                children: [
                    {
                        id: "headphones",
                        children: [
                            { id: "in-ear-headphones" },
                            { id: "on-ear-headphones" },
                            { id: "over-ear-headphones" },
                            { id: "noise-cancelling-headphones" },
                        ],
                    },
                    {
                        id: "speakers",
                        children: [
                            { id: "bluetooth-speakers" },
                            { id: "bookshelf-speakers" },
                            { id: "soundbars" },
                            { id: "subwoofers" },
                            { id: "pa-speakers" },
                        ],
                    },
                    {
                        id: "microphones",
                        children: [
                            { id: "usb-microphones" },
                            { id: "xlr-microphones" },
                            { id: "wireless-microphones" },
                            { id: "lavalier-microphones" },
                        ],
                    },
                ],
            },
            {
                id: "video-gaming",
                children: [
                    {
                        id: "game-consoles",
                        children: [
                            { id: "playstation-consoles" },
                            { id: "xbox-consoles" },
                            { id: "nintendo-consoles" },
                            { id: "retro-consoles" },
                            { id: "pc-handheld-consoles" },
                        ],
                    },
                    {
                        id: "game-accessories",
                        children: [
                            { id: "controllers-gamepads" },
                            { id: "vr-headsets" },
                            { id: "racing-wheel-flight-stick" },
                            { id: "gaming-headsets" },
                            { id: "capture-cards-streaming-gear" },
                        ],
                    },
                    {
                        id: "game-software",
                        children: [
                            { id: "pc-game-downloads" },
                            { id: "console-game-discs-cards" },
                            { id: "in-game-currency-codes" },
                            { id: "subscription-memberships" },
                        ],
                    },
                ],
            },
            {
                id: "tv-video",
                children: [
                    {
                        id: "televisions",
                        children: [
                            { id: "oled-tvs" },
                            { id: "qled-tvs" },
                            { id: "led-lcd-tvs" },
                            { id: "mini-led-tvs" },
                        ],
                    },
                    {
                        id: "streaming-devices",
                        children: [
                            { id: "streaming-sticks-boxes" },
                            { id: "media-players" },
                            { id: "smart-tv-accessories" },
                        ],
                    },
                    {
                        id: "projectors",
                        children: [
                            { id: "home-theater-projectors" },
                            { id: "portable-projectors" },
                            { id: "short-throw-projectors" },
                            { id: "projection-screens" },
                        ],
                    },
                ],
            },
            {
                id: "networking",
                children: [
                    {
                        id: "routers",
                        children: [
                            { id: "wifi-routers" },
                            { id: "mesh-wifi-systems" },
                            { id: "enterprise-routers" },
                        ],
                    },
                    {
                        id: "switches",
                        children: [
                            { id: "managed-switches" },
                            { id: "unmanaged-switches" },
                            { id: "poe-switches" },
                        ],
                    },
                    {
                        id: "modems",
                        children: [
                            { id: "cable-modems" },
                            { id: "dsl-modems" },
                            { id: "fiber-gateways" },
                        ],
                    },
                    {
                        id: "network-cables",
                        children: [
                            { id: "ethernet-cables" },
                            { id: "fiber-cables" },
                            { id: "patch-panels-connectors" },
                        ],
                    },
                ],
            },
            {
                id: "smart-home",
                children: [
                    {
                        id: "smart-lighting",
                        children: [
                            { id: "smart-bulbs" },
                            { id: "smart-light-strips" },
                            { id: "smart-switches-dimmers" },
                        ],
                    },
                    {
                        id: "smart-locks",
                        children: [
                            { id: "keypad-smart-locks" },
                            { id: "bluetooth-smart-locks" },
                            { id: "wifi-smart-locks" },
                        ],
                    },
                    {
                        id: "smart-sensors",
                        children: [
                            { id: "motion-sensors" },
                            { id: "door-window-sensors" },
                            { id: "smoke-water-sensors" },
                        ],
                    },
                    {
                        id: "smart-speakers-hubs",
                        children: [
                            { id: "voice-assistant-speakers" },
                            { id: "smart-home-hubs" },
                            { id: "display-assistant-hubs" },
                        ],
                    },
                ],
            },
            {
                id: "wearables",
                children: [
                    {
                        id: "smartwatches",
                        children: [
                            { id: "ios-compatible-smartwatches" },
                            { id: "android-compatible-smartwatches" },
                            { id: "gps-smartwatches" },
                        ],
                    },
                    {
                        id: "fitness-trackers",
                        children: [
                            { id: "basic-fitness-trackers" },
                            { id: "advanced-fitness-trackers" },
                            { id: "heart-rate-trackers" },
                        ],
                    },
                    {
                        id: "wearable-accessories",
                        children: [
                            { id: "watch-bands" },
                            { id: "wearable-chargers-docks" },
                            { id: "wearable-screen-protectors" },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: "food-beverages-tobacco",
        children: [
            {
                id: "food",
                children: [
                    { id: "pantry-staples" },
                    { id: "snacks-confectionery" },
                    { id: "organic-food" },
                    { id: "international-food" },
                ],
            },
            {
                id: "beverages",
                children: [
                    { id: "soft-drinks" },
                    { id: "juices" },
                    { id: "energy-drinks" },
                    { id: "sparkling-water" },
                ],
            },
            {
                id: "tobacco",
                children: [
                    { id: "cigars" },
                    { id: "cigarettes" },
                    { id: "rolling-tobacco" },
                    { id: "smoking-accessories" },
                ],
            },
            {
                id: "supplements",
                children: [
                    { id: "protein-supplements" },
                    { id: "vitamin-mineral-supplements" },
                    { id: "performance-supplements" },
                ],
            },
            {
                id: "fresh-produce",
                children: [
                    { id: "fresh-fruits" },
                    { id: "fresh-vegetables" },
                    { id: "herbs-leafy-greens" },
                ],
            },
            {
                id: "frozen-food",
                children: [
                    { id: "frozen-meals" },
                    { id: "frozen-vegetables" },
                    { id: "frozen-desserts" },
                ],
            },
            {
                id: "coffee-tea",
                children: [
                    { id: "coffee-beans-ground" },
                    { id: "tea-loose-bagged" },
                    { id: "brewing-equipment-accessories" },
                ],
            },
        ],
    },
    {
        id: "furniture",
        children: [
            {
                id: "living-room-furniture",
                children: [
                    { id: "sofas-sectional" },
                    { id: "coffee-side-tables" },
                    { id: "tv-media-units" },
                    { id: "accent-chairs" },
                ],
            },
            {
                id: "bedroom-furniture",
                children: [
                    { id: "beds-bedframes" },
                    { id: "mattresses" },
                    { id: "dressers-nightstands" },
                    { id: "wardrobes" },
                ],
            },
            {
                id: "office-furniture",
                children: [
                    { id: "office-desks" },
                    { id: "office-chairs" },
                    { id: "filing-storage-cabinets" },
                    { id: "conference-furniture" },
                ],
            },
            {
                id: "outdoor-furniture",
                children: [
                    { id: "patio-sets" },
                    { id: "outdoor-loungers" },
                    { id: "garden-benches" },
                    { id: "outdoor-dining-sets" },
                ],
            },
            {
                id: "storage-furniture",
                children: [
                    { id: "bookcases-shelves" },
                    { id: "storage-benches" },
                    { id: "modular-storage-units" },
                ],
            },
            {
                id: "kids-furniture",
                children: [
                    { id: "cribs-toddler-beds" },
                    { id: "kids-desks" },
                    { id: "playroom-storage" },
                ],
            },
        ],
    },
    {
        id: "hardware",
        children: [
            {
                id: "hand-tools",
                children: [
                    { id: "wrenches-sockets" },
                    { id: "screwdrivers-sets" },
                    { id: "pliers-cutters" },
                    { id: "hammers-mallets" },
                    { id: "measuring-layout-tools" },
                ],
            },
            {
                id: "power-tools",
                children: [
                    { id: "drills-drivers" },
                    { id: "saws-cutting-tools" },
                    { id: "grinders-polishers" },
                    { id: "sanders-planers" },
                    { id: "power-tool-batteries-chargers" },
                ],
            },
            {
                id: "building-materials",
                children: [
                    { id: "lumber-sheet-materials" },
                    { id: "insulation-drywall" },
                    { id: "cement-mortar" },
                    { id: "roofing-materials" },
                ],
            },
            {
                id: "plumbing",
                children: [
                    { id: "pipes-fittings" },
                    { id: "faucets-fixtures" },
                    { id: "water-heating-components" },
                    { id: "drainage-sewer-solutions" },
                ],
            },
            {
                id: "electrical-hardware",
                children: [
                    { id: "wires-cables-electrical" },
                    { id: "switches-outlets" },
                    { id: "electrical-panels-breakers" },
                    { id: "electrical-connectors-conduits" },
                ],
            },
            {
                id: "paint-supplies",
                children: [
                    { id: "interior-exterior-paints" },
                    { id: "primers-sealers" },
                    { id: "brushes-rollers-trays" },
                    { id: "paint-prep-masking" },
                ],
            },
            {
                id: "fasteners",
                children: [
                    { id: "screws-bolts-nuts" },
                    { id: "anchors-rivets" },
                    { id: "nails-staples" },
                ],
            },
            {
                id: "adhesives-sealants",
                children: [
                    { id: "construction-adhesives" },
                    { id: "silicone-sealants" },
                    { id: "threadlock-compounds" },
                    { id: "epoxy-fillers" },
                ],
            },
        ],
    },
    {
        id: "health-beauty",
        children: [
            {
                id: "skincare",
                children: [
                    { id: "cleansers-toners" },
                    { id: "moisturizers-serums" },
                    { id: "sunscreen-after-sun" },
                    { id: "masks-treatments" },
                ],
            },
            {
                id: "hair-care",
                children: [
                    { id: "shampoo-conditioner-haircare" },
                    { id: "styling-products" },
                    { id: "hair-tools" },
                    { id: "hair-treatment-products" },
                ],
            },
            {
                id: "makeup",
                children: [
                    { id: "face-makeup" },
                    { id: "eye-makeup" },
                    { id: "lip-products" },
                    { id: "makeup-tools-accessories" },
                ],
            },
            {
                id: "personal-care",
                children: [
                    { id: "body-care" },
                    { id: "deodorants" },
                    { id: "shaving-grooming" },
                    { id: "feminine-care" },
                ],
            },
            {
                id: "medical-supplies",
                children: [
                    { id: "first-aid-medical" },
                    { id: "mobility-support" },
                    { id: "diagnostic-devices" },
                    { id: "daily-care-medical-consumables" },
                ],
            },
            {
                id: "oral-care",
                children: [
                    { id: "toothbrushes" },
                    { id: "toothpaste-mouthwash" },
                    { id: "floss-interdental-care" },
                ],
            },
            {
                id: "fragrances",
                children: [
                    { id: "womens-fragrance" },
                    { id: "mens-fragrance" },
                    { id: "unisex-fragrance" },
                ],
            },
        ],
    },
    {
        id: "home-garden",
        children: [
            {
                id: "kitchen-dining",
                children: [
                    { id: "cookware-bakeware" },
                    { id: "small-kitchen-appliances" },
                    { id: "dinnerware-cutlery" },
                    { id: "food-storage-containers" },
                ],
            },
            {
                id: "home-decor",
                children: [
                    { id: "lighting-lamps" },
                    { id: "wall-art-mirrors" },
                    { id: "rugs-textiles" },
                    { id: "seasonal-home-decor" },
                ],
            },
            {
                id: "cleaning-supplies",
                children: [
                    { id: "surface-cleaners-disinfectants" },
                    { id: "vacuum-floorcare" },
                    { id: "mops-brooms-buckets" },
                    { id: "trash-bags-liners" },
                ],
            },
            {
                id: "gardening",
                children: [
                    { id: "plants-seeds-gardening" },
                    { id: "soil-fertilizer" },
                    { id: "irrigation-hoses-watering" },
                    { id: "garden-tools-equipment" },
                    { id: "outdoor-pest-control" },
                ],
            },
            {
                id: "windows-doors",
                children: [
                    { id: "window-frames-panes" },
                    { id: "interior-doors-frames" },
                    { id: "exterior-doors-security-doors" },
                    { id: "window-door-hardware" },
                ],
            },
            {
                id: "bathroom",
                children: [
                    { id: "bathroom-fixtures" },
                    { id: "bathroom-storage" },
                    { id: "towels-bath-textiles" },
                    { id: "shower-bath-accessories" },
                ],
            },
            {
                id: "bedding",
                children: [
                    { id: "bed-sheets-pillowcases" },
                    { id: "duvets-comforters" },
                    { id: "pillows-cushions" },
                    { id: "mattress-protectors" },
                ],
            },
            {
                id: "laundry-care",
                children: [
                    { id: "laundry-detergent-softener" },
                    { id: "stain-removers" },
                    { id: "drying-racks-ironing" },
                    { id: "laundry-baskets-organizers" },
                ],
            },
        ],
    },
    {
        id: "luggage-bags",
        children: [
            { id: "suitcases" },
            { id: "backpacks" },
            { id: "handbags" },
            { id: "travel-accessories" },
            { id: "laptop-bags" },
            { id: "sports-bags" },
        ],
    },
    {
        id: "media",
        children: [
            {
                id: "books",
                children: [
                    { id: "fiction-books" },
                    { id: "non-fiction-books" },
                    { id: "children-books" },
                    { id: "educational-textbooks" },
                ],
            },
            {
                id: "movies",
                children: [
                    { id: "blu-ray-dvd" },
                    { id: "digital-movie-codes" },
                    { id: "documentaries-movies" },
                ],
            },
            {
                id: "music",
                children: [
                    { id: "vinyl-records" },
                    { id: "cds" },
                    { id: "digital-music-codes" },
                    { id: "sheet-music" },
                ],
            },
            {
                id: "magazines",
                children: [
                    { id: "print-magazines" },
                    { id: "digital-magazine-subscriptions" },
                ],
            },
        ],
    },
    {
        id: "office-supplies",
        children: [
            {
                id: "paper-products",
                children: [
                    { id: "printer-copy-paper" },
                    { id: "notebooks-notepads" },
                    { id: "labels-stickers" },
                ],
            },
            {
                id: "writing-correction",
                children: [
                    { id: "pens-pencils" },
                    { id: "markers-highlighters" },
                    { id: "erasers-correction-tools" },
                ],
            },
            {
                id: "desk-supplies",
                children: [
                    { id: "staplers-hole-punches" },
                    { id: "organizers-trays" },
                    { id: "adhesive-tapes-dispensers" },
                ],
            },
            {
                id: "school-supplies",
                children: [
                    { id: "back-to-school-kits" },
                    { id: "student-stationery" },
                    { id: "classroom-learning-tools" },
                ],
            },
            {
                id: "ink-toner",
                children: [
                    { id: "ink-cartridges" },
                    { id: "toner-cartridges" },
                    { id: "drum-maintenance-kits" },
                ],
            },
            {
                id: "presentation-supplies",
                children: [
                    { id: "whiteboards-flipcharts" },
                    { id: "projector-accessories-office" },
                    { id: "presentation-boards-displays" },
                ],
            },
        ],
    },
    {
        id: "religious-ceremonial",
        children: [
            { id: "religious-items" },
            { id: "ceremonial-decor" },
            { id: "ritual-supplies" },
        ],
    },
    {
        id: "software",
        children: [
            {
                id: "business-software",
                children: [
                    { id: "accounting-erp-software" },
                    { id: "crm-sales-software" },
                    { id: "project-management-software" },
                    { id: "hr-payroll-software" },
                ],
            },
            {
                id: "creative-software",
                children: [
                    { id: "design-illustration-software" },
                    { id: "photo-editing-software" },
                    { id: "video-editing-software" },
                    { id: "audio-production-software" },
                ],
            },
            {
                id: "security-software",
                children: [
                    { id: "antivirus-endpoint-security" },
                    { id: "vpn-security-tools" },
                    { id: "password-management-software" },
                ],
            },
            {
                id: "educational-software",
                children: [
                    { id: "language-learning-software" },
                    { id: "stem-learning-software" },
                    { id: "classroom-management-software" },
                ],
            },
        ],
    },
    {
        id: "sporting-goods",
        children: [
            {
                id: "cycling",
                children: [
                    {
                        id: "bicycles",
                        children: [
                            { id: "road-bikes" },
                            { id: "mountain-bikes" },
                            { id: "gravel-bikes" },
                            { id: "triathlon-time-trial-bikes" },
                            { id: "city-commuter-bikes" },
                            { id: "electric-bikes" },
                            { id: "bmx-bikes" },
                            { id: "kids-bikes" },
                        ],
                    },
                    {
                        id: "bike-components",
                        children: [
                            {
                                id: "drivetrain-components",
                                children: [
                                    { id: "chains" },
                                    { id: "cassettes-freewheels" },
                                    { id: "chainrings-cranksets" },
                                    { id: "derailleurs-shifters" },
                                ],
                            },
                            {
                                id: "wheel-components",
                                children: [
                                    { id: "wheelsets" },
                                    { id: "rims-spokes-hubs" },
                                    { id: "bike-tires-tubes" },
                                ],
                            },
                            {
                                id: "braking-components",
                                children: [
                                    { id: "disc-brakes-calipers" },
                                    { id: "rim-brakes" },
                                    { id: "brake-pads-rotors" },
                                ],
                            },
                            { id: "cockpit-components" },
                            { id: "saddles-seatposts" },
                            { id: "pedals-cleats" },
                        ],
                    },
                    {
                        id: "bike-maintenance",
                        children: [
                            { id: "bike-cleaning-care" },
                            { id: "chain-lube-grease" },
                            { id: "bike-tools-workshop" },
                            { id: "repair-kits-spares" },
                        ],
                    },
                    {
                        id: "cycling-accessories",
                        children: [
                            { id: "cycling-helmets" },
                            { id: "bike-lights" },
                            { id: "bike-computers-gps" },
                            { id: "bottles-cages-hydration" },
                            { id: "cycling-bags-packs" },
                        ],
                    },
                    {
                        id: "indoor-cycling",
                        children: [
                            { id: "smart-trainers" },
                            { id: "roller-trainers" },
                            { id: "trainer-accessories" },
                            { id: "indoor-bike-accessories" },
                        ],
                    },
                ],
            },
            {
                id: "fitness",
                children: [
                    { id: "cardio-equipment" },
                    { id: "strength-training" },
                    { id: "fitness-accessories" },
                    { id: "recovery-mobility" },
                ],
            },
            {
                id: "team-sports",
                children: [
                    { id: "football-equipment" },
                    { id: "basketball-equipment" },
                    { id: "soccer-equipment" },
                    { id: "baseball-softball-equipment" },
                    { id: "volleyball-equipment" },
                ],
            },
            {
                id: "outdoor-recreation",
                children: [
                    { id: "camping-hiking" },
                    { id: "climbing-equipment" },
                    { id: "fishing-equipment" },
                    { id: "hunting-equipment" },
                ],
            },
            {
                id: "water-sports",
                children: [
                    { id: "swimming-gear" },
                    { id: "surf-paddle-equipment" },
                    { id: "kayak-canoe-gear" },
                    { id: "dive-snorkel-equipment" },
                ],
            },
            {
                id: "winter-sports",
                children: [
                    { id: "ski-equipment" },
                    { id: "snowboard-equipment" },
                    { id: "winter-sport-apparel" },
                    { id: "ice-skates-hockey-gear" },
                ],
            },
            {
                id: "racket-sports",
                children: [
                    { id: "tennis-equipment" },
                    { id: "badminton-equipment" },
                    { id: "padel-equipment" },
                    { id: "squash-equipment" },
                    { id: "table-tennis-equipment" },
                ],
            },
        ],
    },
    {
        id: "toys-games",
        children: [
            {
                id: "board-games",
                children: [
                    { id: "strategy-board-games" },
                    { id: "family-board-games" },
                    { id: "party-board-games" },
                    { id: "card-games-trading-cards" },
                ],
            },
            {
                id: "video-games",
                children: [
                    { id: "console-video-games" },
                    { id: "pc-video-games" },
                    { id: "portable-handheld-games" },
                ],
            },
            {
                id: "action-figures",
                children: [
                    { id: "licensed-action-figures" },
                    { id: "collectible-figures" },
                    { id: "playset-figures" },
                ],
            },
            {
                id: "educational-toys",
                children: [
                    { id: "stem-educational-toys" },
                    { id: "montessori-learning-toys" },
                    { id: "language-learning-toys" },
                ],
            },
            {
                id: "puzzles",
                children: [
                    { id: "jigsaw-puzzles" },
                    { id: "logic-puzzles-brainteasers" },
                    { id: "3d-puzzles" },
                ],
            },
            {
                id: "hobby-kits",
                children: [
                    { id: "model-building-kits" },
                    { id: "science-experiment-kits" },
                    { id: "diy-craft-kits" },
                ],
            },
            {
                id: "dolls-plush",
                children: [
                    { id: "fashion-dolls" },
                    { id: "baby-dolls" },
                    { id: "plush-soft-toys" },
                ],
            },
        ],
    },
    {
        id: "vehicles-parts",
        children: [
            {
                id: "automotive-parts",
                children: [
                    { id: "automotive-engine-parts" },
                    { id: "automotive-brakes-suspension" },
                    { id: "automotive-electrical-lighting" },
                    { id: "automotive-filters-fluids" },
                ],
            },
            {
                id: "motorcycles",
                children: [
                    {
                        id: "sport-bikes",
                        children: [
                            {
                                id: "supersport-600",
                                children: [
                                    { id: "yamaha-yzf-r6" },
                                    { id: "kawasaki-ninja-zx6r" },
                                    { id: "honda-cbr600rr" },
                                    { id: "triumph-daytona-675" },
                                ],
                            },
                            {
                                id: "superbike-1000",
                                children: [
                                    { id: "yamaha-yzf-r1" },
                                    { id: "honda-cbr1000rr-r" },
                                    { id: "kawasaki-ninja-zx10r" },
                                    { id: "bmw-s1000rr" },
                                    { id: "ducati-panigale-v4" },
                                    { id: "suzuki-gsx-r1000" },
                                ],
                            },
                            { id: "sport-touring-bikes" },
                            { id: "track-only-bikes" },
                        ],
                    },
                    { id: "naked-bikes" },
                    { id: "adventure-bikes" },
                    { id: "touring-bikes" },
                    { id: "cruisers" },
                    { id: "scooters-mopeds" },
                ],
            },
            {
                id: "motorcycle-parts",
                children: [
                    { id: "motorcycle-engine-parts" },
                    { id: "motorcycle-fairings-bodywork" },
                    { id: "motorcycle-exhaust-systems" },
                    { id: "motorcycle-brakes-suspension" },
                    { id: "motorcycle-electronics-lighting" },
                ],
            },
            {
                id: "bicycle-parts",
                children: [
                    { id: "frames-forks" },
                    { id: "bike-drivetrain-parts" },
                    { id: "bike-wheel-parts" },
                    { id: "bike-brake-parts" },
                ],
            },
            {
                id: "vehicle-accessories",
                children: [
                    { id: "interior-accessories" },
                    { id: "exterior-accessories" },
                    { id: "navigation-phone-mounts" },
                    { id: "cargo-storage-solutions" },
                ],
            },
            {
                id: "tires-wheels",
                children: [
                    { id: "car-tires" },
                    { id: "motorcycle-tires" },
                    { id: "bicycle-tires" },
                    { id: "alloy-wheels-rims" },
                ],
            },
            {
                id: "engine-components",
                children: [
                    { id: "intake-fuel-system" },
                    { id: "ignition-engine-management" },
                    { id: "cooling-system-components" },
                    { id: "gaskets-seals-bearings" },
                ],
            },
        ],
    },
    {
        id: "gift-cards",
        children: [
            { id: "physical-gift-cards" },
            { id: "digital-gift-cards" },
        ],
    },
    {
        id: "services",
        children: [
            {
                id: "maintenance-services",
                children: [
                    { id: "preventive-maintenance" },
                    { id: "scheduled-maintenance" },
                    { id: "on-site-maintenance" },
                ],
            },
            {
                id: "consulting-services",
                children: [
                    { id: "business-consulting" },
                    { id: "it-consulting" },
                    { id: "operations-consulting" },
                ],
            },
            {
                id: "installation-services",
                children: [
                    { id: "on-site-installation" },
                    { id: "remote-installation" },
                    { id: "configuration-commissioning" },
                ],
            },
            {
                id: "training-services",
                children: [
                    { id: "onboarding-training" },
                    { id: "technical-training" },
                    { id: "certification-training" },
                ],
            },
            {
                id: "repair-services",
                children: [
                    { id: "warranty-repairs" },
                    { id: "out-of-warranty-repairs" },
                    { id: "emergency-repairs" },
                ],
            },
            {
                id: "rental-services",
                children: [
                    { id: "short-term-rental" },
                    { id: "long-term-rental" },
                    { id: "rent-to-own" },
                ],
            },
        ],
    },
    {
        id: "bundles",
        children: [
            {
                id: "starter-kits",
                children: [
                    { id: "beginner-starter-kits" },
                    { id: "pro-starter-kits" },
                    { id: "team-starter-kits" },
                ],
            },
            {
                id: "seasonal-bundles",
                children: [
                    { id: "holiday-bundles" },
                    { id: "summer-bundles" },
                    { id: "winter-bundles" },
                ],
            },
            {
                id: "custom-bundles",
                children: [
                    { id: "build-your-own-bundle" },
                    { id: "curated-bundles" },
                    { id: "subscription-bundles" },
                ],
            },
        ],
    },
    {
        id: "entertainment",
        children: [
            {
                id: "tickets-events",
                children: [
                    { id: "concert-tickets" },
                    { id: "sports-event-tickets" },
                    { id: "festival-tickets" },
                    { id: "theater-cinema-tickets" },
                ],
            },
            {
                id: "collectibles",
                children: [
                    { id: "sports-collectibles" },
                    { id: "movie-anime-collectibles" },
                    { id: "coins-stamps-collectibles" },
                ],
            },
            {
                id: "streaming-subscriptions",
                children: [
                    { id: "video-streaming-subscriptions" },
                    { id: "music-streaming-subscriptions" },
                    { id: "gaming-streaming-subscriptions" },
                ],
            },
            {
                id: "party-supplies",
                children: [
                    { id: "decorations-balloons" },
                    { id: "tableware-party-disposables" },
                    { id: "party-favors-gifts" },
                ],
            },
            {
                id: "arcade-equipment",
                children: [
                    { id: "arcade-machines" },
                    { id: "pinball-machines" },
                    { id: "arcade-parts-accessories" },
                ],
            },
        ],
    },
    {
        id: "arts-crafts-sewing",
        children: [
            {
                id: "art-supplies",
                children: [
                    { id: "painting-supplies" },
                    { id: "drawing-illustration-supplies" },
                    { id: "canvas-paper-panels" },
                    { id: "art-storage-studio-tools" },
                ],
            },
            {
                id: "craft-materials",
                children: [
                    { id: "paper-craft-materials" },
                    { id: "beads-jewelry-craft" },
                    { id: "adhesives-embellishments" },
                    { id: "resin-mold-craft" },
                ],
            },
            {
                id: "fabric-sewing",
                children: [
                    { id: "sewing-machines-sergers" },
                    { id: "fabric-by-type" },
                    { id: "patterns-notions" },
                    { id: "thread-needles-tools" },
                ],
            },
            {
                id: "knitting-crochet",
                children: [
                    { id: "yarn-fiber" },
                    { id: "knitting-needles-sets" },
                    { id: "crochet-hooks-sets" },
                    { id: "stitch-markers-tools" },
                ],
            },
        ],
    },
    {
        id: "construction-heavy-equipment",
        children: [
            {
                id: "heavy-machinery",
                children: [
                    { id: "excavators-loaders" },
                    { id: "compactors-rollers" },
                    { id: "cranes-lifting-machinery" },
                    { id: "heavy-machinery-attachments" },
                ],
            },
            {
                id: "site-safety",
                children: [
                    { id: "site-ppe-safety-gear" },
                    { id: "barriers-signage" },
                    { id: "fall-protection" },
                    { id: "site-emergency-kits" },
                ],
            },
            {
                id: "surveying-equipment",
                children: [
                    { id: "laser-levels" },
                    { id: "gps-gnss-survey-tools" },
                    { id: "total-stations" },
                    { id: "survey-tripods-rods" },
                ],
            },
            {
                id: "concrete-masonry-tools",
                children: [
                    { id: "concrete-mixers-vibrators" },
                    { id: "masonry-cutting-grinding" },
                    { id: "trowels-finishing-tools" },
                    { id: "formwork-rebar-accessories" },
                ],
            },
        ],
    },
    {
        id: "energy-solar",
        children: [
            {
                id: "solar-panels",
                children: [
                    { id: "residential-solar-panels" },
                    { id: "commercial-solar-panels" },
                    { id: "portable-solar-panels" },
                ],
            },
            {
                id: "inverters",
                children: [
                    { id: "string-inverters" },
                    { id: "microinverters" },
                    { id: "hybrid-inverters" },
                ],
            },
            {
                id: "battery-storage",
                children: [
                    { id: "home-battery-storage" },
                    { id: "commercial-battery-storage" },
                    { id: "battery-management-components" },
                ],
            },
            {
                id: "ev-charging",
                children: [
                    { id: "home-ev-chargers" },
                    { id: "commercial-ev-chargers" },
                    { id: "ev-cables-adapters" },
                ],
            },
        ],
    },
    {
        id: "agriculture-farming",
        children: [
            {
                id: "seeds-plants",
                children: [
                    { id: "vegetable-seeds" },
                    { id: "field-crop-seeds" },
                    { id: "nursery-plants-saplings" },
                    { id: "greenhouse-seeds-plugs" },
                ],
            },
            {
                id: "fertilizers",
                children: [
                    { id: "organic-fertilizers" },
                    { id: "synthetic-fertilizers" },
                    { id: "soil-conditioners" },
                ],
            },
            {
                id: "irrigation",
                children: [
                    { id: "drip-irrigation" },
                    { id: "sprinkler-irrigation" },
                    { id: "irrigation-pumps-controllers" },
                ],
            },
            {
                id: "farm-equipment",
                children: [
                    { id: "small-farm-tractors" },
                    { id: "tillage-implements" },
                    { id: "harvesting-equipment" },
                    { id: "greenhouse-farm-tools" },
                ],
            },
        ],
    },
    {
        id: "measurement-test-equipment",
        children: [
            {
                id: "multimeters-testers",
                children: [
                    { id: "digital-multimeters" },
                    { id: "clamp-meters" },
                    { id: "electrical-test-kits" },
                    { id: "oscilloscopes-analyzers" },
                ],
            },
            {
                id: "scales-balances",
                children: [
                    { id: "precision-lab-scales" },
                    { id: "retail-industrial-scales" },
                    { id: "shipping-scales" },
                ],
            },
            {
                id: "temperature-humidity-meters",
                children: [
                    { id: "thermometers-probes" },
                    { id: "hygrometers" },
                    { id: "data-loggers" },
                ],
            },
            {
                id: "calibration-tools",
                children: [
                    { id: "calibration-weights-standards" },
                    { id: "electrical-calibration-tools" },
                    { id: "temperature-pressure-calibration-tools" },
                ],
            },
        ],
    },
];

const PRODUCT_TYPE_LABELS: Record<LanguageCode, Record<string, string>> = {
    en: {
        "uncategorized": "Uncategorized",
        "animals-pet-supplies": "Animals & Pet Supplies",
        "pet-food-treats": "Pet Food & Treats",
        "pet-health-care": "Pet Health Care",
        "pet-housing": "Pet Housing",
        "pet-toys": "Pet Toys",
        "livestock": "Livestock",
        "accessories-apparel": "Accessories & Apparel",
        "clothing": "Clothing",
        "footwear": "Footwear",
        "fashion-accessories": "Fashion Accessories",
        "jewelry": "Jewelry",
        "business-industrial": "Business & Industrial",
        "lab-science": "Lab & Science",
        "safety-security": "Safety & Security",
        "manufacturing-supplies": "Manufacturing Supplies",
        "restaurant-hospitality": "Restaurant & Hospitality",
        "camera-optics": "Camera & Optics",
        "cameras": "Cameras",
        "lenses": "Lenses",
        "camera-accessories": "Camera Accessories",
        "binoculars-scopes": "Binoculars & Scopes",
        "electronics": "Electronics",
        "computers": "Computers",
        "laptops": "Laptops",
        "desktops": "Desktops",
        "components": "Components",
        "monitors": "Monitors",
        "printers": "Printers",
        "phones": "Phones",
        "smartphones": "Smartphones",
        "feature-phones": "Feature Phones",
        "phone-cases": "Phone Cases",
        "phone-chargers": "Phone Chargers",
        "audio": "Audio",
        "headphones": "Headphones",
        "speakers": "Speakers",
        "microphones": "Microphones",
        "video-gaming": "Video Gaming",
        "game-consoles": "Game Consoles",
        "game-accessories": "Game Accessories",
        "game-software": "Game Software",
        "tv-video": "TV & Video",
        "televisions": "Televisions",
        "streaming-devices": "Streaming Devices",
        "projectors": "Projectors",
        "food-beverages-tobacco": "Food, Beverages & Tobacco",
        "food": "Food",
        "beverages": "Beverages",
        "tobacco": "Tobacco",
        "supplements": "Supplements",
        "furniture": "Furniture",
        "living-room-furniture": "Living Room Furniture",
        "bedroom-furniture": "Bedroom Furniture",
        "office-furniture": "Office Furniture",
        "outdoor-furniture": "Outdoor Furniture",
        "hardware": "Hardware",
        "hand-tools": "Hand Tools",
        "power-tools": "Power Tools",
        "building-materials": "Building Materials",
        "plumbing": "Plumbing",
        "electrical-hardware": "Electrical Hardware",
        "health-beauty": "Health & Beauty",
        "skincare": "Skincare",
        "hair-care": "Hair Care",
        "makeup": "Makeup",
        "personal-care": "Personal Care",
        "medical-supplies": "Medical Supplies",
        "home-garden": "Home & Garden",
        "kitchen-dining": "Kitchen & Dining",
        "home-decor": "Home Decor",
        "cleaning-supplies": "Cleaning Supplies",
        "gardening": "Gardening",
        "windows-doors": "Windows & Doors",
        "luggage-bags": "Luggage & Bags",
        "suitcases": "Suitcases",
        "backpacks": "Backpacks",
        "handbags": "Handbags",
        "travel-accessories": "Travel Accessories",
        "media": "Media",
        "books": "Books",
        "movies": "Movies",
        "music": "Music",
        "magazines": "Magazines",
        "office-supplies": "Office Supplies",
        "paper-products": "Paper Products",
        "writing-correction": "Writing & Correction",
        "desk-supplies": "Desk Supplies",
        "school-supplies": "School Supplies",
        "religious-ceremonial": "Religious & Ceremonial",
        "religious-items": "Religious Items",
        "ceremonial-decor": "Ceremonial Decor",
        "ritual-supplies": "Ritual Supplies",
        "software": "Software",
        "business-software": "Business Software",
        "creative-software": "Creative Software",
        "security-software": "Security Software",
        "educational-software": "Educational Software",
        "sporting-goods": "Sporting Goods",
        "cycling": "Cycling",
        "fitness": "Fitness",
        "team-sports": "Team Sports",
        "outdoor-recreation": "Outdoor Recreation",
        "toys-games": "Toys & Games",
        "board-games": "Board Games",
        "video-games": "Video Games",
        "action-figures": "Action Figures",
        "educational-toys": "Educational Toys",
        "vehicles-parts": "Vehicles & Parts",
        "automotive-parts": "Automotive Parts",
        "motorcycle-parts": "Motorcycle Parts",
        "bicycle-parts": "Bicycle Parts",
        "vehicle-accessories": "Vehicle Accessories",
        "gift-cards": "Gift Cards",
        "physical-gift-cards": "Physical Gift Cards",
        "digital-gift-cards": "Digital Gift Cards",
        "services": "Services",
        "maintenance-services": "Maintenance Services",
        "consulting-services": "Consulting Services",
        "installation-services": "Installation Services",
        "training-services": "Training Services",
        "bundles": "Bundles",
        "starter-kits": "Starter Kits",
        "seasonal-bundles": "Seasonal Bundles",
        "custom-bundles": "Custom Bundles",
        "entertainment": "Entertainment",
        "tickets-events": "Tickets & Events",
        "collectibles": "Collectibles",
        "streaming-subscriptions": "Streaming Subscriptions",
        "pet-grooming": "Pet Grooming",
        "aquatic": "Aquatic",
        "equine": "Equine",
        "workwear-uniforms": "Workwear & Uniforms",
        "watches": "Watches",
        "protective-gear": "Protective Gear",
        "material-handling": "Material Handling",
        "packaging-shipping": "Packaging & Shipping",
        "janitorial-sanitation": "Janitorial & Sanitation",
        "tripods-supports": "Tripods & Supports",
        "lighting-studio": "Lighting & Studio",
        "drones-aerial": "Drones & Aerial",
        "networking": "Networking",
        "routers": "Routers",
        "switches": "Switches",
        "modems": "Modems",
        "network-cables": "Network Cables",
        "smart-home": "Smart Home",
        "smart-lighting": "Smart Lighting",
        "smart-locks": "Smart Locks",
        "smart-sensors": "Smart Sensors",
        "smart-speakers-hubs": "Smart Speakers & Hubs",
        "wearables": "Wearables",
        "smartwatches": "Smartwatches",
        "fitness-trackers": "Fitness Trackers",
        "wearable-accessories": "Wearable Accessories",
        "fresh-produce": "Fresh Produce",
        "frozen-food": "Frozen Food",
        "coffee-tea": "Coffee & Tea",
        "storage-furniture": "Storage Furniture",
        "kids-furniture": "Kids Furniture",
        "paint-supplies": "Paint Supplies",
        "fasteners": "Fasteners",
        "adhesives-sealants": "Adhesives & Sealants",
        "oral-care": "Oral Care",
        "fragrances": "Fragrances",
        "bathroom": "Bathroom",
        "bedding": "Bedding",
        "laundry-care": "Laundry Care",
        "laptop-bags": "Laptop Bags",
        "sports-bags": "Sports Bags",
        "ink-toner": "Ink & Toner",
        "presentation-supplies": "Presentation Supplies",
        "water-sports": "Water Sports",
        "winter-sports": "Winter Sports",
        "racket-sports": "Racket Sports",
        "puzzles": "Puzzles",
        "hobby-kits": "Hobby Kits",
        "dolls-plush": "Dolls & Plush",
        "tires-wheels": "Tires & Wheels",
        "engine-components": "Engine Components",
        "repair-services": "Repair Services",
        "rental-services": "Rental Services",
        "party-supplies": "Party Supplies",
        "arcade-equipment": "Arcade Equipment",
        "arts-crafts-sewing": "Arts, Crafts & Sewing",
        "art-supplies": "Art Supplies",
        "craft-materials": "Craft Materials",
        "fabric-sewing": "Fabric & Sewing",
        "knitting-crochet": "Knitting & Crochet",
        "construction-heavy-equipment": "Construction & Heavy Equipment",
        "heavy-machinery": "Heavy Machinery",
        "site-safety": "Site Safety",
        "surveying-equipment": "Surveying Equipment",
        "concrete-masonry-tools": "Concrete & Masonry Tools",
        "energy-solar": "Energy & Solar",
        "solar-panels": "Solar Panels",
        "inverters": "Inverters",
        "battery-storage": "Battery Storage",
        "ev-charging": "EV Charging",
        "agriculture-farming": "Agriculture & Farming",
        "seeds-plants": "Seeds & Plants",
        "fertilizers": "Fertilizers",
        "irrigation": "Irrigation",
        "farm-equipment": "Farm Equipment",
        "measurement-test-equipment": "Measurement & Test Equipment",
        "multimeters-testers": "Multimeters & Testers",
        "scales-balances": "Scales & Balances",
        "temperature-humidity-meters": "Temperature & Humidity Meters",
        "calibration-tools": "Calibration Tools",
    },
    da: {
        "uncategorized": "Ukategoriseret",
        "animals-pet-supplies": "Dyr og kæledyrsartikler",
        "accessories-apparel": "Tilbehør og beklædning",
        "business-industrial": "Erhverv og industri",
        "camera-optics": "Kamera og optik",
        "electronics": "Elektronik",
        "food-beverages-tobacco": "Mad, drikkevarer og tobak",
        "furniture": "Møbler",
        "hardware": "Værktøj og byggematerialer",
        "health-beauty": "Sundhed og skønhed",
        "home-garden": "Hjem og have",
        "luggage-bags": "Bagage og tasker",
        "media": "Medier",
        "office-supplies": "Kontorartikler",
        "religious-ceremonial": "Religiøst og ceremonielt",
        "software": "Software",
        "sporting-goods": "Sportsudstyr",
        "toys-games": "Legetøj og spil",
        "vehicles-parts": "Køretøjer og dele",
        "gift-cards": "Gavekort",
        "services": "Tjenester",
        "bundles": "Bundles",
        "entertainment": "Underholdning",
        "arts-crafts-sewing": "Kunst, hobby og syning",
        "construction-heavy-equipment": "Byggeri og tungt udstyr",
        "energy-solar": "Energi og sol",
        "agriculture-farming": "Landbrug og dyrkning",
        "measurement-test-equipment": "Måle- og testudstyr",
    },
    de: {
        "uncategorized": "Nicht kategorisiert",
        "animals-pet-supplies": "Tiere und Tierbedarf",
        "accessories-apparel": "Accessoires und Bekleidung",
        "business-industrial": "Gewerbe und Industrie",
        "camera-optics": "Kamera und Optik",
        "electronics": "Elektronik",
        "food-beverages-tobacco": "Lebensmittel, Getränke und Tabak",
        "furniture": "Möbel",
        "hardware": "Werkzeuge und Baumaterial",
        "health-beauty": "Gesundheit und Schönheit",
        "home-garden": "Haus und Garten",
        "luggage-bags": "Gepäck und Taschen",
        "media": "Medien",
        "office-supplies": "Bürobedarf",
        "religious-ceremonial": "Religiös und zeremoniell",
        "software": "Software",
        "sporting-goods": "Sportartikel",
        "toys-games": "Spielzeug und Spiele",
        "vehicles-parts": "Fahrzeuge und Teile",
        "gift-cards": "Geschenkkarten",
        "services": "Dienstleistungen",
        "bundles": "Bundles",
        "entertainment": "Unterhaltung",
        "arts-crafts-sewing": "Kunst, Handwerk und Nähen",
        "construction-heavy-equipment": "Bau und schwere Ausrüstung",
        "energy-solar": "Energie und Solar",
        "agriculture-farming": "Landwirtschaft",
        "measurement-test-equipment": "Mess- und Prüfgeräte",
    },
    fr: {
        "uncategorized": "Non classé",
        "animals-pet-supplies": "Animaux et fournitures pour animaux",
        "accessories-apparel": "Accessoires et vêtements",
        "business-industrial": "Entreprise et industrie",
        "camera-optics": "Caméra et optique",
        "electronics": "Électronique",
        "food-beverages-tobacco": "Alimentation, boissons et tabac",
        "furniture": "Meubles",
        "hardware": "Outillage et matériaux",
        "health-beauty": "Santé et beauté",
        "home-garden": "Maison et jardin",
        "luggage-bags": "Bagages et sacs",
        "media": "Médias",
        "office-supplies": "Fournitures de bureau",
        "religious-ceremonial": "Religieux et cérémoniel",
        "software": "Logiciels",
        "sporting-goods": "Articles de sport",
        "toys-games": "Jouets et jeux",
        "vehicles-parts": "Véhicules et pièces",
        "gift-cards": "Cartes cadeaux",
        "services": "Services",
        "bundles": "Packs",
        "entertainment": "Divertissement",
        "arts-crafts-sewing": "Arts, artisanat et couture",
        "construction-heavy-equipment": "Construction et équipements lourds",
        "energy-solar": "Énergie et solaire",
        "agriculture-farming": "Agriculture",
        "measurement-test-equipment": "Mesure et instruments de test",
    },
    es: {
        "uncategorized": "Sin categoría",
        "animals-pet-supplies": "Animales y artículos para mascotas",
        "accessories-apparel": "Accesorios y ropa",
        "business-industrial": "Negocios e industria",
        "camera-optics": "Cámara y óptica",
        "electronics": "Electrónica",
        "food-beverages-tobacco": "Alimentos, bebidas y tabaco",
        "furniture": "Muebles",
        "hardware": "Herramientas y materiales",
        "health-beauty": "Salud y belleza",
        "home-garden": "Hogar y jardín",
        "luggage-bags": "Equipaje y bolsos",
        "media": "Medios",
        "office-supplies": "Material de oficina",
        "religious-ceremonial": "Religioso y ceremonial",
        "software": "Software",
        "sporting-goods": "Artículos deportivos",
        "toys-games": "Juguetes y juegos",
        "vehicles-parts": "Vehículos y repuestos",
        "gift-cards": "Tarjetas regalo",
        "services": "Servicios",
        "bundles": "Paquetes",
        "entertainment": "Entretenimiento",
        "arts-crafts-sewing": "Arte, manualidades y costura",
        "construction-heavy-equipment": "Construcción y maquinaria pesada",
        "energy-solar": "Energía y solar",
        "agriculture-farming": "Agricultura",
        "measurement-test-equipment": "Medición y equipos de prueba",
    },
    zh: {
        "uncategorized": "未分类",
        "animals-pet-supplies": "动物与宠物用品",
        "accessories-apparel": "配饰与服饰",
        "business-industrial": "商业与工业",
        "camera-optics": "相机与光学",
        "electronics": "电子产品",
        "food-beverages-tobacco": "食品、饮料与烟草",
        "furniture": "家具",
        "hardware": "五金建材",
        "health-beauty": "健康与美容",
        "home-garden": "家居与园艺",
        "luggage-bags": "行李与包袋",
        "media": "媒体",
        "office-supplies": "办公用品",
        "religious-ceremonial": "宗教与礼仪",
        "software": "软件",
        "sporting-goods": "体育用品",
        "toys-games": "玩具与游戏",
        "vehicles-parts": "车辆与配件",
        "gift-cards": "礼品卡",
        "services": "服务",
        "bundles": "组合包",
        "entertainment": "娱乐",
        "arts-crafts-sewing": "艺术、手工与缝纫",
        "construction-heavy-equipment": "建筑与重型设备",
        "energy-solar": "能源与太阳能",
        "agriculture-farming": "农业与种植",
        "measurement-test-equipment": "测量与测试设备",
    },
};

function humanizeId(id: string) {
    return id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

const NODE_BY_ID = new Map<string, ProductTypeNode>();
const PARENT_BY_ID = new Map<string, string | null>();
const PRODUCT_TYPE_DEFAULT_TAX_PERCENT_BY_ID: Record<string, number> = {
    uncategorized: 0,
    "gift-cards": 0,
    services: 25,
    "food-beverages-tobacco": 12,
    tobacco: 25,
};

function indexNodes(nodes: ProductTypeNode[], parentId: string | null) {
    nodes.forEach((node) => {
        NODE_BY_ID.set(node.id, node);
        PARENT_BY_ID.set(node.id, parentId);
        if (node.children && node.children.length > 0) {
            indexNodes(node.children, node.id);
        }
    });
}

indexNodes(PRODUCT_TYPE_TREE, null);

export function getProductTypeLabel(language: LanguageCode, id: string) {
    const languageLabels = PRODUCT_TYPE_LABELS[language] ?? PRODUCT_TYPE_LABELS.en;
    return languageLabels[id] ?? PRODUCT_TYPE_LABELS.en[id] ?? humanizeId(id);
}

export function getProductTypeNode(id: string) {
    return NODE_BY_ID.get(id) ?? null;
}

export function getProductTypeChildren(path: string[]) {
    if (path.length === 0) return PRODUCT_TYPE_TREE;
    const currentId = path[path.length - 1];
    const node = getProductTypeNode(currentId);
    return node?.children ?? [];
}

export function normalizeProductTypePath(path: string[]) {
    const normalized = path.map((entry) => entry.trim()).filter(Boolean);
    if (normalized.length === 0) return ["uncategorized"];

    const next: string[] = [];
    let options = PRODUCT_TYPE_TREE;
    for (const entry of normalized) {
        const matched = options.find((node) => node.id === entry);
        if (!matched) break;
        next.push(matched.id);
        options = matched.children ?? [];
    }

    return next.length > 0 ? next : ["uncategorized"];
}

export function getProductTypePathLabels(path: string[], language: LanguageCode) {
    return normalizeProductTypePath(path).map((entry) => getProductTypeLabel(language, entry));
}

export function getProductTypePathLabel(path: string[], language: LanguageCode) {
    return getProductTypePathLabels(path, language).join(" > ");
}

export function buildProductTypePathTo(id: string) {
    if (!NODE_BY_ID.has(id)) return ["uncategorized"];
    const path: string[] = [];
    let current: string | null = id;
    while (current) {
        path.unshift(current);
        current = PARENT_BY_ID.get(current) ?? null;
    }
    return normalizeProductTypePath(path);
}

export function getDefaultTaxPercentForProductType(path: string[]) {
    const normalized = normalizeProductTypePath(path);
    for (let index = normalized.length - 1; index >= 0; index -= 1) {
        const tax = PRODUCT_TYPE_DEFAULT_TAX_PERCENT_BY_ID[normalized[index]];
        if (typeof tax === "number" && Number.isFinite(tax)) {
            return Math.max(0, Math.min(100, tax));
        }
    }
    return 0;
}
