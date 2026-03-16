import { parseCurrency } from "@/i18n/portal";

export type PurchaseOrderStatus = "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export type PurchaseOrderAdjustmentType =
    | "DISCOUNT"
    | "SHIPPING"
    | "INSURANCE"
    | "FOREIGN_TRANSACTION_FEE"
    | "RUSH_FEE"
    | "OTHER";

export type PurchaseOrderAdjustment = {
    id: string;
    type: PurchaseOrderAdjustmentType;
    label: string;
    amount: number;
    currency: string;
};

export type SupplierDirectoryEntry = {
    id: string;
    company: string;
    region: string;
    street?: string;
    houseNumber?: string;
    apartmentSuite?: string;
    postalCode?: string;
    city?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    createdAt: string;
    updatedAt: string;
};

export type PurchaseOrderLine = {
    id: string;
    productId: string;
    sku: string;
    supplierName: string;
    quantity: number;
    unitCost: number;
    taxPercent: number;
    variantValues: Record<string, string>;
    maintenanceEntries?: PurchaseOrderLineMaintenanceEntry[];
};

export type PurchaseOrderLineMaintenanceEntry = {
    id: string;
    description: string;
    currency: string;
    amount: number;
    createdAt: string;
};

export type PurchaseOrder = {
    id: string;
    poNumber: string;
    supplierName: string;
    destinationStoreId: string;
    paymentTerms: string;
    supplierCurrency: string;
    purchaseDate: string;
    shippingCarrier: string;
    trackingNumber: string;
    status: PurchaseOrderStatus;
    expectedPackages: number;
    receivedPackages: number;
    referenceNumber?: string;
    notesToSupplier?: string;
    lines: PurchaseOrderLine[];
    adjustments: PurchaseOrderAdjustment[];
    createdAt: string;
    updatedAt: string;
};

export const DEFAULT_PO_PAYMENT_TERMS = [
    "None",
    "Cash on delivery",
    "Payment on receipt",
    "Payment in advance",
    "Net 7",
    "Net 15",
    "Net 30",
    "Net 45",
    "Net 60",
] as const;

export const DEFAULT_SUPPLIERS = [
    "Amazon Business",
    "B2B Distribution Group",
    "Bike Parts Wholesale",
    "DHL Supply Chain",
    "EV Components Global",
    "FedEx Trade Networks",
    "Global Outdoor Imports",
    "Nordic Supplier House",
    "ProParts Industrial",
    "UPS Supply Solutions",
] as const;

export const DEFAULT_SHIPMENT_CARRIERS = [
    "DHL",
    "DPD",
    "FedEx",
    "GLS",
    "UPS",
    "USPS",
    "PostNord",
    "Royal Mail",
    "Canada Post",
    "Australia Post",
    "La Poste",
    "Deutsche Post",
    "Japan Post",
    "SF Express",
    "Yamato Transport",
    "Ninja Van",
    "Hermes",
    "Evri",
    "Aramex",
    "TNT",
    "Purolator",
    "China Post",
    "Correos",
    "Swiss Post",
    "BRT",
    "Delhivery",
    "XPO Logistics",
    "DB Schenker",
    "Maersk",
    "MSC",
    "Hapag-Lloyd",
    "CMA CGM",
] as const;

function normalizeKey(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function sanitizeString(value: unknown, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeDateOnly(value: unknown, fallback: string) {
    const text = sanitizeString(value, "");
    if (!text) return fallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString().slice(0, 10);
}

function sanitizeIsoDateTime(value: unknown, fallback: string) {
    const text = sanitizeString(value, "");
    if (!text) return fallback;
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toISOString();
}

function sanitizeCurrency(value: unknown, fallback: string) {
    const parsed = parseCurrency(typeof value === "string" ? value : null);
    return parsed ?? fallback;
}

function sanitizePositiveInt(value: unknown, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    return fallback;
}

function sanitizeMoney(value: unknown, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
    return fallback;
}

function sanitizeTaxPercent(value: unknown, fallback = 0) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.max(0, Math.min(100, value));
}

function sanitizeStatus(value: unknown): PurchaseOrderStatus {
    if (value === "DRAFT" || value === "ORDERED" || value === "PARTIAL" || value === "RECEIVED" || value === "CANCELLED") {
        return value;
    }
    return "DRAFT";
}

function sanitizeSupplierDirectoryEntry(raw: unknown, index: number): SupplierDirectoryEntry | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<SupplierDirectoryEntry>;
    const company = sanitizeString(record.company, "");
    const region = sanitizeString(record.region, "");
    if (!company || !region) return null;

    const createdAt = sanitizeIsoDateTime(record.createdAt, new Date().toISOString());
    const updatedAt = sanitizeIsoDateTime(record.updatedAt, createdAt);

    return {
        id: sanitizeString(record.id, "") || `supplier-${index + 1}`,
        company,
        region,
        street: sanitizeString(record.street, "") || undefined,
        houseNumber: sanitizeString(record.houseNumber, "") || undefined,
        apartmentSuite: sanitizeString(record.apartmentSuite, "") || undefined,
        postalCode: sanitizeString(record.postalCode, "") || undefined,
        city: sanitizeString(record.city, "") || undefined,
        contactName: sanitizeString(record.contactName, "") || undefined,
        email: sanitizeString(record.email, "") || undefined,
        phone: sanitizeString(record.phone, "") || undefined,
        createdAt,
        updatedAt,
    };
}

export function sanitizeSupplierDirectory(raw: unknown, fallback: SupplierDirectoryEntry[] = []) {
    if (!Array.isArray(raw)) return fallback;

    const seenIds = new Set<string>();
    const seenCompanies = new Set<string>();
    const sanitized: SupplierDirectoryEntry[] = [];

    raw.forEach((entry, index) => {
        const normalized = sanitizeSupplierDirectoryEntry(entry, index);
        if (!normalized) return;
        const companyKey = normalizeKey(normalized.company);
        if (!companyKey) return;
        if (seenIds.has(normalized.id) || seenCompanies.has(companyKey)) return;
        seenIds.add(normalized.id);
        seenCompanies.add(companyKey);
        sanitized.push(normalized);
    });

    return sanitized;
}

function sanitizeAdjustmentType(value: unknown): PurchaseOrderAdjustmentType {
    if (
        value === "DISCOUNT"
        || value === "SHIPPING"
        || value === "INSURANCE"
        || value === "FOREIGN_TRANSACTION_FEE"
        || value === "RUSH_FEE"
        || value === "OTHER"
    ) {
        return value;
    }
    return "OTHER";
}

function sanitizeVariantValueMap(raw: unknown) {
    if (!raw || typeof raw !== "object") return {} as Record<string, string>;
    return Object.fromEntries(
        Object.entries(raw)
            .filter(([key, value]) => typeof key === "string" && typeof value === "string")
            .map(([key, value]) => [normalizeKey(key), value.trim()])
            .filter(([key, value]) => key.length > 0 && value.length > 0)
    );
}

function sanitizeOrderLineMaintenanceEntries(raw: unknown, fallbackCurrency: string) {
    if (!Array.isArray(raw)) return undefined;

    const seenIds = new Set<string>();
    const sanitized: PurchaseOrderLineMaintenanceEntry[] = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Partial<PurchaseOrderLineMaintenanceEntry>;
        const description = sanitizeString(record.description, "");
        if (!description) return;

        const amount = sanitizeMoney(record.amount, Number.NaN);
        if (!Number.isFinite(amount)) return;

        const id = sanitizeString(record.id, "") || `po-line-maint-${index + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        sanitized.push({
            id,
            description,
            currency: sanitizeCurrency(record.currency, fallbackCurrency),
            amount,
            createdAt: sanitizeIsoDateTime(record.createdAt, new Date().toISOString()),
        });
    });

    return sanitized.length > 0 ? sanitized : undefined;
}

function normalizeAdjustmentAmount(type: PurchaseOrderAdjustmentType, amount: number) {
    if (type === "DISCOUNT") return amount > 0 ? -amount : amount;
    return amount < 0 ? Math.abs(amount) : amount;
}

function sanitizeOrderLine(raw: unknown, fallbackCurrency: string, index: number): PurchaseOrderLine | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<PurchaseOrderLine>;
    const productId = sanitizeString(record.productId, "");
    if (!productId) return null;

    const sku = sanitizeString(record.sku, "");
    const supplierName = sanitizeString(record.supplierName, "");
    const quantity = sanitizePositiveInt(record.quantity, 0);
    if (quantity <= 0) return null;

    return {
        id: sanitizeString(record.id, "") || `po-line-${index + 1}`,
        productId,
        sku,
        supplierName,
        quantity,
        unitCost: sanitizeMoney(record.unitCost, 0),
        taxPercent: sanitizeTaxPercent(record.taxPercent, 0),
        variantValues: sanitizeVariantValueMap(record.variantValues),
        maintenanceEntries: sanitizeOrderLineMaintenanceEntries(
            (record as { maintenanceEntries?: unknown }).maintenanceEntries,
            fallbackCurrency
        ),
    };
}

function sanitizeOrderAdjustment(raw: unknown, fallbackCurrency: string, index: number): PurchaseOrderAdjustment | null {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Partial<PurchaseOrderAdjustment>;
    const type = sanitizeAdjustmentType(record.type);
    const label = sanitizeString(record.label, "");
    if (!label) return null;
    const amount = typeof record.amount === "number" && Number.isFinite(record.amount) ? record.amount : Number.NaN;
    if (!Number.isFinite(amount)) return null;
    return {
        id: sanitizeString(record.id, "") || `po-adjustment-${index + 1}`,
        type,
        label,
        amount: normalizeAdjustmentAmount(type, amount),
        currency: sanitizeCurrency(record.currency, fallbackCurrency),
    };
}

export function sanitizePurchaseOrders(raw: unknown, fallback: PurchaseOrder[] = []) {
    if (!Array.isArray(raw)) return fallback;

    const nowIso = new Date().toISOString();
    const fallbackDate = nowIso.slice(0, 10);
    const seenIds = new Set<string>();
    const sanitized: PurchaseOrder[] = [];

    raw.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") return;
        const record = entry as Partial<PurchaseOrder>;
        const id = sanitizeString(record.id, "") || `po-${index + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const supplierCurrency = sanitizeCurrency(record.supplierCurrency, "EUR");
        const lines = Array.isArray(record.lines)
            ? record.lines
                .map((line, lineIndex) => sanitizeOrderLine(line, supplierCurrency, lineIndex))
                .filter((line): line is PurchaseOrderLine => Boolean(line))
            : [];
        const adjustments = Array.isArray(record.adjustments)
            ? record.adjustments
                .map((adjustment, adjustmentIndex) => sanitizeOrderAdjustment(adjustment, supplierCurrency, adjustmentIndex))
                .filter((adjustment): adjustment is PurchaseOrderAdjustment => Boolean(adjustment))
            : [];

        const expectedPackages = sanitizePositiveInt(record.expectedPackages, 0);
        const receivedPackages = Math.min(expectedPackages, sanitizePositiveInt(record.receivedPackages, 0));

        sanitized.push({
            id,
            poNumber: sanitizeString(record.poNumber, "") || `PO-${String(index + 1).padStart(6, "0")}`,
            supplierName: sanitizeString(record.supplierName, ""),
            destinationStoreId: sanitizeString(record.destinationStoreId, ""),
            paymentTerms: sanitizeString(record.paymentTerms, DEFAULT_PO_PAYMENT_TERMS[0]),
            supplierCurrency,
            purchaseDate: sanitizeDateOnly(record.purchaseDate, fallbackDate),
            shippingCarrier: sanitizeString(record.shippingCarrier, ""),
            trackingNumber: sanitizeString(record.trackingNumber, ""),
            status: sanitizeStatus(record.status),
            expectedPackages,
            receivedPackages,
            referenceNumber: sanitizeString(record.referenceNumber, "") || undefined,
            notesToSupplier: sanitizeString(record.notesToSupplier, "") || undefined,
            lines,
            adjustments,
            createdAt: sanitizeIsoDateTime(record.createdAt, nowIso),
            updatedAt: sanitizeIsoDateTime(record.updatedAt, nowIso),
        });
    });

    return sanitized;
}

export function createPurchaseOrderId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `po_${crypto.randomUUID()}`;
    }
    return `po_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

export function createPurchaseOrderLineId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `po_line_${crypto.randomUUID()}`;
    }
    return `po_line_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

export function createPurchaseOrderAdjustmentId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `po_adjustment_${crypto.randomUUID()}`;
    }
    return `po_adjustment_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

export function createSupplierDirectoryId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `supplier_${crypto.randomUUID()}`;
    }
    return `supplier_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

const TRACKING_URL_TEMPLATES: Record<string, string> = {
    DHL: "https://www.dhl.com/global-en/home/tracking.html?tracking-id={tracking}",
    DPD: "https://www.dpd.com/tracking/{tracking}",
    FedEx: "https://www.fedex.com/fedextrack/?tracknumbers={tracking}",
    GLS: "https://gls-group.com/EU/en/parcel-tracking?match={tracking}",
    UPS: "https://www.ups.com/track?loc=en_US&tracknum={tracking}",
    USPS: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}",
    PostNord: "https://www.postnord.com/track-and-trace?shipmentId={tracking}",
    "Royal Mail": "https://www.royalmail.com/track-your-item#/tracking-results/{tracking}",
    "Canada Post": "https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={tracking}",
    "Australia Post": "https://auspost.com.au/mypost/track/#/details/{tracking}",
    "Deutsche Post": "https://www.dhl.de/en/privatkunden/dhl-sendungsverfolgung.html?piececode={tracking}",
    "Japan Post": "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1={tracking}",
    "SF Express": "https://www.sf-international.com/us/en/dynamic_function/waybill/#search/bill-number/{tracking}",
    "Yamato Transport": "https://track.kuronekoyamato.co.jp/english/tracking?number={tracking}",
    "Ninja Van": "https://www.ninjavan.co/en-my/tracking?id={tracking}",
    Hermes: "https://new.myhermes.co.uk/track.html#/parcel/{tracking}/details",
    Evri: "https://www.evri.com/track/parcel/{tracking}/details",
    Aramex: "https://www.aramex.com/track/results?ShipmentNumber={tracking}",
    TNT: "https://www.tnt.com/express/en_us/site/shipping-tools/tracking.html?searchType=con&cons={tracking}",
    Purolator: "https://www.purolator.com/en/shipping/tracker?pin={tracking}",
    "China Post": "https://track-chinapost.com/result-china-post.php?trackno={tracking}",
    Correos: "https://www.correos.es/es/en/tools/track?search={tracking}",
    "Swiss Post": "https://service.post.ch/ekp-web/ui/list/detail/{tracking}",
    Delhivery: "https://www.delhivery.com/track-v2/package/{tracking}",
};

export function buildTrackingUrl(carrier: string, trackingNumber: string) {
    const normalizedCarrier = carrier.trim();
    const normalizedTracking = trackingNumber.trim();
    if (!normalizedCarrier || !normalizedTracking) return null;

    const template = TRACKING_URL_TEMPLATES[normalizedCarrier];
    if (!template) {
        return `https://www.google.com/search?q=${encodeURIComponent(`${normalizedCarrier} tracking ${normalizedTracking}`)}`;
    }

    return template.replace("{tracking}", encodeURIComponent(normalizedTracking));
}

export function buildNextPurchaseOrderNumber(existingOrders: PurchaseOrder[]) {
    const maxSequence = existingOrders.reduce((max, order) => {
        const match = /PO-(\d+)/i.exec(order.poNumber);
        if (!match) return max;
        const next = Number.parseInt(match[1] || "", 10);
        if (!Number.isFinite(next)) return max;
        return Math.max(max, next);
    }, 0);
    return `PO-${String(maxSequence + 1).padStart(6, "0")}`;
}

export function getOrderedQuantityByProductId(purchaseOrders: PurchaseOrder[]) {
    const map = new Map<string, number>();
    purchaseOrders.forEach((order) => {
        order.lines.forEach((line) => {
            map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
        });
    });
    return map;
}
