import type { LanguageCode } from "@/i18n/portal";

type WidgetMeta = {
    title: string;
    category: string;
    subtitle: string;
};

export type DashboardMessages = {
    sectionLabel: string;
    overviewLabel: string;
    lastUpdatedAt: string;
    lastEditedJustNow: string;
    lastEditedMinutesAgo: string;
    lastEditedHoursAgo: string;
    lastEditedOn: string;
    addSection: string;
    reorderSections: string;
    resetToDefault: string;
    finishDashboardEditing: string;
    editDashboardAndDragWidgets: string;
    editDashboard: string;
    exitFullscreenDashboard: string;
    expandDashboardToFullscreen: string;
    openAnalytics: string;
    noSectionsVisible: string;
    dropWidgetsHere: string;
    cancelEditingSection: string;
    renameSection: string;
    deleteSection: string;
    expandSection: string;
    collapseSection: string;
    removeWidget: string;
    resizeWidget: string;
    reorderTitle: string;
    closeReorder: string;
    reorderHint: string;
    cancel: string;
    save: string;
    widgetPreviewUnavailable: string;
    widgetMeta: Record<string, WidgetMeta>;
    widgetBody: {
        growthSnapshotDetail: string;
        ordersTodayDetail: string;
        conversionRateDetail: string;
        activeCartsDetail: string;
        savedFiltersIntro: string;
        salesBreakdownLabels: [string, string, string, string];
        savedFilterSegments: [string, string, string];
        inventoryDetails: [string, string, string];
        fulfillmentLabels: [string, string, string];
        storefrontLabels: [string, string, string, string];
        supportLabels: [string, string, string];
        teamTasks: [string, string, string, string];
        marketingDays: [string, string, string];
        marketingTasks: [string, string, string];
        trafficLabels: [string, string, string, string];
        returnLabels: [string, string, string, string];
    };
};

const EN_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "Active carts", category: "Checkout", subtitle: "Pending checkout sessions" },
    "conversion-rate": { title: "Conversion rate", category: "Checkout", subtitle: "Storefront conversion" },
    "fulfillment-health": { title: "Fulfillment health", category: "Operations", subtitle: "Packing, shipping, and SLA" },
    "growth-snapshot": { title: "Growth snapshot", category: "Sales", subtitle: "Compared with previous period" },
    "inventory-watch": { title: "Inventory watch", category: "Operations", subtitle: "Low stock and risk items" },
    "marketing-calendar": { title: "Marketing calendar", category: "Marketing", subtitle: "Upcoming launches and promos" },
    "orders-today": { title: "Orders today", category: "Checkout", subtitle: "Live order intake" },
    "sales-breakdown": { title: "Sales breakdown", category: "Sales", subtitle: "Gross, discounts, returns, net" },
    "sales-over-time": { title: "Sales over time", category: "Sales", subtitle: "Trailing 30 days" },
    "saved-filter-performance": { title: "Saved filter performance", category: "Sales", subtitle: "Ready for future saved filters" },
    "storefront-performance": { title: "Storefront performance", category: "Marketing", subtitle: "Sessions, speed, and bounce" },
    "support-inbox": { title: "Support inbox", category: "Operations", subtitle: "Customer threads by urgency" },
    "team-priority": { title: "Team priority queue", category: "Operations", subtitle: "Operational tasks today" },
    "total-sales-by-product": { title: "Total sales by product", category: "Sales", subtitle: "Top products this month" },
    "traffic-source-mix": { title: "Traffic source mix", category: "Marketing", subtitle: "Acquisition channels" },
    "returns-watch": { title: "Returns watch", category: "Operations", subtitle: "Recent returns and reasons" },
};

const DA_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "Aktive kurve", category: "Checkout", subtitle: "Afventende checkout-sessioner" },
    "conversion-rate": { title: "Konverteringsrate", category: "Checkout", subtitle: "Konvertering i webshop" },
    "fulfillment-health": { title: "Fulfillment-status", category: "Drift", subtitle: "Pakning, forsendelse og SLA" },
    "growth-snapshot": { title: "Vaekstoverblik", category: "Salg", subtitle: "Sammenlignet med forrige periode" },
    "inventory-watch": { title: "Lageroverblik", category: "Drift", subtitle: "Lav lagerbeholdning og risiko" },
    "marketing-calendar": { title: "Marketingkalender", category: "Marketing", subtitle: "Kommende lanceringer og kampagner" },
    "orders-today": { title: "Ordrer i dag", category: "Checkout", subtitle: "Live ordreindtag" },
    "sales-breakdown": { title: "Salgsfordeling", category: "Salg", subtitle: "Brutto, rabatter, retur, netto" },
    "sales-over-time": { title: "Salg over tid", category: "Salg", subtitle: "Seneste 30 dage" },
    "saved-filter-performance": { title: "Gemte filtrers performance", category: "Salg", subtitle: "Klar til fremtidige gemte filtre" },
    "storefront-performance": { title: "Webshop-performance", category: "Marketing", subtitle: "Sessioner, hastighed og bounce" },
    "support-inbox": { title: "Support-indbakke", category: "Drift", subtitle: "Kundetraade efter hastighed" },
    "team-priority": { title: "Teamets prioriteringsko", category: "Drift", subtitle: "Operationelle opgaver i dag" },
    "total-sales-by-product": { title: "Samlet salg per produkt", category: "Salg", subtitle: "Topprodukter denne maaned" },
    "traffic-source-mix": { title: "Trafikkilder", category: "Marketing", subtitle: "Anskaffelseskanaler" },
    "returns-watch": { title: "Returoverblik", category: "Drift", subtitle: "Seneste returer og aarsager" },
};

const DE_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "Aktive Warenkorbe", category: "Checkout", subtitle: "Ausstehende Checkout-Sitzungen" },
    "conversion-rate": { title: "Konversionsrate", category: "Checkout", subtitle: "Storefront-Konversion" },
    "fulfillment-health": { title: "Fulfillment-Status", category: "Betrieb", subtitle: "Packen, Versand und SLA" },
    "growth-snapshot": { title: "Wachstumsubersicht", category: "Vertrieb", subtitle: "Verglichen mit dem vorherigen Zeitraum" },
    "inventory-watch": { title: "Bestandsuberblick", category: "Betrieb", subtitle: "Niedriger Bestand und Risiken" },
    "marketing-calendar": { title: "Marketingkalender", category: "Marketing", subtitle: "Kommende Launches und Aktionen" },
    "orders-today": { title: "Bestellungen heute", category: "Checkout", subtitle: "Live-Bestelleingang" },
    "sales-breakdown": { title: "Umsatzaufschlusselung", category: "Vertrieb", subtitle: "Brutto, Rabatte, Retouren, Netto" },
    "sales-over-time": { title: "Umsatz im Zeitverlauf", category: "Vertrieb", subtitle: "Letzte 30 Tage" },
    "saved-filter-performance": { title: "Leistung gespeicherter Filter", category: "Vertrieb", subtitle: "Bereit fur zukunftige gespeicherte Filter" },
    "storefront-performance": { title: "Storefront-Leistung", category: "Marketing", subtitle: "Sitzungen, Geschwindigkeit und Bounce" },
    "support-inbox": { title: "Support-Postfach", category: "Betrieb", subtitle: "Kundenanfragen nach Dringlichkeit" },
    "team-priority": { title: "Team-Prioritatsliste", category: "Betrieb", subtitle: "Operative Aufgaben heute" },
    "total-sales-by-product": { title: "Gesamtumsatz nach Produkt", category: "Vertrieb", subtitle: "Top-Produkte dieses Monats" },
    "traffic-source-mix": { title: "Traffic-Quellenmix", category: "Marketing", subtitle: "Akquisekanale" },
    "returns-watch": { title: "Retourenuberblick", category: "Betrieb", subtitle: "Aktuelle Retouren und Grunde" },
};

const FR_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "Paniers actifs", category: "Paiement", subtitle: "Sessions de paiement en attente" },
    "conversion-rate": { title: "Taux de conversion", category: "Paiement", subtitle: "Conversion de la boutique" },
    "fulfillment-health": { title: "Sante logistique", category: "Operations", subtitle: "Preparation, expedition et SLA" },
    "growth-snapshot": { title: "Apercu de croissance", category: "Ventes", subtitle: "Compare a la periode precedente" },
    "inventory-watch": { title: "Suivi du stock", category: "Operations", subtitle: "Faible stock et risque" },
    "marketing-calendar": { title: "Calendrier marketing", category: "Marketing", subtitle: "Lancements et promos a venir" },
    "orders-today": { title: "Commandes du jour", category: "Paiement", subtitle: "Flux de commandes en direct" },
    "sales-breakdown": { title: "Repartition des ventes", category: "Ventes", subtitle: "Brut, remises, retours, net" },
    "sales-over-time": { title: "Ventes dans le temps", category: "Ventes", subtitle: "30 derniers jours" },
    "saved-filter-performance": { title: "Performance des filtres enregistres", category: "Ventes", subtitle: "Pret pour les filtres enregistres futurs" },
    "storefront-performance": { title: "Performance de la boutique", category: "Marketing", subtitle: "Sessions, vitesse et rebond" },
    "support-inbox": { title: "Boite support", category: "Operations", subtitle: "Conversations clients par urgence" },
    "team-priority": { title: "File de priorites equipe", category: "Operations", subtitle: "Taches operationnelles du jour" },
    "total-sales-by-product": { title: "Ventes totales par produit", category: "Ventes", subtitle: "Meilleurs produits du mois" },
    "traffic-source-mix": { title: "Mix des sources de trafic", category: "Marketing", subtitle: "Canaux d'acquisition" },
    "returns-watch": { title: "Suivi des retours", category: "Operations", subtitle: "Retours recents et raisons" },
};

const ES_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "Carritos activos", category: "Checkout", subtitle: "Sesiones de checkout pendientes" },
    "conversion-rate": { title: "Tasa de conversion", category: "Checkout", subtitle: "Conversion de la tienda" },
    "fulfillment-health": { title: "Estado de fulfillment", category: "Operaciones", subtitle: "Empaque, envio y SLA" },
    "growth-snapshot": { title: "Resumen de crecimiento", category: "Ventas", subtitle: "Comparado con el periodo anterior" },
    "inventory-watch": { title: "Monitoreo de inventario", category: "Operaciones", subtitle: "Bajo stock y riesgo" },
    "marketing-calendar": { title: "Calendario de marketing", category: "Marketing", subtitle: "Lanzamientos y promociones proximas" },
    "orders-today": { title: "Pedidos de hoy", category: "Checkout", subtitle: "Entrada de pedidos en vivo" },
    "sales-breakdown": { title: "Desglose de ventas", category: "Ventas", subtitle: "Brutas, descuentos, devoluciones, netas" },
    "sales-over-time": { title: "Ventas en el tiempo", category: "Ventas", subtitle: "Ultimos 30 dias" },
    "saved-filter-performance": { title: "Rendimiento de filtros guardados", category: "Ventas", subtitle: "Listo para futuros filtros guardados" },
    "storefront-performance": { title: "Rendimiento de la tienda", category: "Marketing", subtitle: "Sesiones, velocidad y rebote" },
    "support-inbox": { title: "Bandeja de soporte", category: "Operaciones", subtitle: "Hilos de clientes por urgencia" },
    "team-priority": { title: "Cola prioritaria del equipo", category: "Operaciones", subtitle: "Tareas operativas de hoy" },
    "total-sales-by-product": { title: "Ventas totales por producto", category: "Ventas", subtitle: "Productos top del mes" },
    "traffic-source-mix": { title: "Mezcla de fuentes de trafico", category: "Marketing", subtitle: "Canales de adquisicion" },
    "returns-watch": { title: "Monitoreo de devoluciones", category: "Operaciones", subtitle: "Devoluciones recientes y motivos" },
};

const ZH_WIDGET_META: Record<string, WidgetMeta> = {
    "active-carts": { title: "活跃购物车", category: "结账", subtitle: "待结账会话" },
    "conversion-rate": { title: "转化率", category: "结账", subtitle: "店铺转化" },
    "fulfillment-health": { title: "履约健康度", category: "运营", subtitle: "打包、发货与 SLA" },
    "growth-snapshot": { title: "增长快照", category: "销售", subtitle: "与上一周期对比" },
    "inventory-watch": { title: "库存监控", category: "运营", subtitle: "低库存与风险商品" },
    "marketing-calendar": { title: "营销日历", category: "营销", subtitle: "即将上线与促销" },
    "orders-today": { title: "今日订单", category: "结账", subtitle: "实时订单流入" },
    "sales-breakdown": { title: "销售拆分", category: "销售", subtitle: "总销售、折扣、退货、净销售" },
    "sales-over-time": { title: "销售趋势", category: "销售", subtitle: "最近 30 天" },
    "saved-filter-performance": { title: "已保存筛选表现", category: "销售", subtitle: "为未来筛选保存做准备" },
    "storefront-performance": { title: "店铺表现", category: "营销", subtitle: "会话、速度与跳出率" },
    "support-inbox": { title: "支持收件箱", category: "运营", subtitle: "按紧急程度的客户会话" },
    "team-priority": { title: "团队优先队列", category: "运营", subtitle: "今日运营任务" },
    "total-sales-by-product": { title: "按产品总销售", category: "销售", subtitle: "本月热销产品" },
    "traffic-source-mix": { title: "流量来源构成", category: "营销", subtitle: "获客渠道" },
    "returns-watch": { title: "退货监控", category: "运营", subtitle: "近期退货与原因" },
};

const BASE_WIDGET_BODY: DashboardMessages["widgetBody"] = {
    growthSnapshotDetail: "Month-over-month growth across revenue and orders.",
    ordersTodayDetail: "14 orders are currently being packed.",
    conversionRateDetail: "+0.6% compared with the same weekday last week.",
    activeCartsDetail: "28 carts are within 15 minutes of checkout.",
    savedFiltersIntro: "Once you save product filters, they appear here as dashboard widgets.",
    salesBreakdownLabels: ["Gross sales", "Discounts", "Returns", "Net sales"],
    savedFilterSegments: ["Featured road bikes", "Commuter collection", "Spring launch set"],
    inventoryDetails: ["3 left in stock", "2 left in stock", "Restock ETA 2 days"],
    fulfillmentLabels: ["Orders packed < 2h", "Shipped same day", "Delivered on promise"],
    storefrontLabels: ["Sessions", "Average page load", "Bounce rate", "Returning visitors"],
    supportLabels: ["Urgent", "Waiting for response", "Resolved today"],
    teamTasks: [
        "Approve two draft products",
        "Review returns from Copenhagen",
        "Confirm supplier lead-time update",
        "Publish weekly storefront banner",
    ],
    marketingDays: ["Mon", "Wed", "Fri"],
    marketingTasks: ["Road bike campaign launch", "Email flow review", "Weekend promotion goes live"],
    trafficLabels: ["Organic search", "Direct", "Paid social", "Email"],
    returnLabels: ["Size mismatch", "Shipping damage", "Late delivery", "Other"],
};

const DASHBOARD_MESSAGES: Record<LanguageCode, DashboardMessages> = {
    en: {
        sectionLabel: "Section",
        overviewLabel: "Overview",
        lastUpdatedAt: "Last updated: {time}",
        lastEditedJustNow: "Last edited just now",
        lastEditedMinutesAgo: "Last edited {count}m ago",
        lastEditedHoursAgo: "Last edited {count}h ago",
        lastEditedOn: "Last edited {date}",
        addSection: "Add section",
        reorderSections: "Reorder sections",
        resetToDefault: "Reset to default",
        finishDashboardEditing: "Finish dashboard editing",
        editDashboardAndDragWidgets: "Edit dashboard and drag widgets",
        editDashboard: "Edit dashboard",
        exitFullscreenDashboard: "Exit fullscreen dashboard",
        expandDashboardToFullscreen: "Expand dashboard to fullscreen",
        openAnalytics: "Open analytics",
        noSectionsVisible: "No sections are currently visible on this dashboard.",
        dropWidgetsHere: "Drop widgets here",
        cancelEditingSection: "Cancel editing {name}",
        renameSection: "Rename {name}",
        deleteSection: "Delete {name}",
        expandSection: "Expand {name}",
        collapseSection: "Collapse {name}",
        removeWidget: "Remove {name}",
        resizeWidget: "Resize {name}",
        reorderTitle: "Reorder sections",
        closeReorder: "Close reorder sections",
        reorderHint: "Drag sections to reorder them from top to bottom.",
        cancel: "Cancel",
        save: "Save",
        widgetPreviewUnavailable: "Widget preview unavailable.",
        widgetMeta: EN_WIDGET_META,
        widgetBody: {
            growthSnapshotDetail: "Monatliches Wachstum bei Umsatz und Bestellungen.",
            ordersTodayDetail: "14 Bestellungen werden derzeit gepackt.",
            conversionRateDetail: "+0,6% im Vergleich zum gleichen Wochentag der letzten Woche.",
            activeCartsDetail: "28 Warenkorbe sind weniger als 15 Minuten vom Checkout entfernt.",
            savedFiltersIntro: "Wenn du Produktfilter speicherst, erscheinen sie hier als Dashboard-Widgets.",
            salesBreakdownLabels: ["Bruttoumsatz", "Rabatte", "Retouren", "Nettoumsatz"],
            savedFilterSegments: ["Empfohlene Rennrader", "Pendler-Kollektion", "Fruhlings-Launch-Set"],
            inventoryDetails: ["Noch 3 auf Lager", "Noch 2 auf Lager", "Nachschub in 2 Tagen"],
            fulfillmentLabels: ["Bestellungen gepackt < 2h", "Am selben Tag versendet", "Punktlich geliefert"],
            storefrontLabels: ["Sitzungen", "Durchschnittliche Ladezeit", "Absprungrate", "Wiederkehrende Besucher"],
            supportLabels: ["Dringend", "Wartet auf Antwort", "Heute gelost"],
            teamTasks: [
                "Zwei Entwurfsprodukte freigeben",
                "Retouren aus Kopenhagen prufen",
                "Aktualisierte Lieferzeit beim Lieferanten bestatigen",
                "Wochentliches Storefront-Banner veroffentlichen",
            ],
            marketingDays: ["Mo", "Mi", "Fr"],
            marketingTasks: ["Rennrad-Kampagne startet", "E-Mail-Flow uberprufen", "Wochenendaktion geht live"],
            trafficLabels: ["Organische Suche", "Direkt", "Bezahlte Social Ads", "E-Mail"],
            returnLabels: ["GroBe passt nicht", "Versandschaden", "Verspatete Lieferung", "Sonstiges"],
        },
    },
    da: {
        sectionLabel: "Sektion",
        overviewLabel: "Overblik",
        lastUpdatedAt: "Sidst opdateret: {time}",
        lastEditedJustNow: "Sidst redigeret lige nu",
        lastEditedMinutesAgo: "Sidst redigeret for {count}m siden",
        lastEditedHoursAgo: "Sidst redigeret for {count}t siden",
        lastEditedOn: "Sidst redigeret {date}",
        addSection: "Tilfoj sektion",
        reorderSections: "Omarranger sektioner",
        resetToDefault: "Nulstil til standard",
        finishDashboardEditing: "Afslut dashboard-redigering",
        editDashboardAndDragWidgets: "Rediger dashboard og traek widgets",
        editDashboard: "Rediger dashboard",
        exitFullscreenDashboard: "Afslut fuldskaerms-dashboard",
        expandDashboardToFullscreen: "Udvid dashboard til fuldskaerm",
        openAnalytics: "Aben analyse",
        noSectionsVisible: "Ingen sektioner er synlige pa dette dashboard.",
        dropWidgetsHere: "Slip widgets her",
        cancelEditingSection: "Annuller redigering af {name}",
        renameSection: "Omdob {name}",
        deleteSection: "Slet {name}",
        expandSection: "Udvid {name}",
        collapseSection: "Skjul {name}",
        removeWidget: "Fjern {name}",
        resizeWidget: "Aendr storrelse pa {name}",
        reorderTitle: "Omarranger sektioner",
        closeReorder: "Luk omarrangering af sektioner",
        reorderHint: "Traek sektioner for at aendre raekkefolgen fra top til bund.",
        cancel: "Annuller",
        save: "Gem",
        widgetPreviewUnavailable: "Widget-forhaandsvisning er ikke tilgaengelig.",
        widgetMeta: DA_WIDGET_META,
        widgetBody: {
            growthSnapshotDetail: "Maned-over-maned vaekst pa tvaers af omsaetning og ordrer.",
            ordersTodayDetail: "14 ordrer er i gang med at blive pakket.",
            conversionRateDetail: "+0,6% sammenlignet med samme ugedag sidste uge.",
            activeCartsDetail: "28 kurve er inden for 15 minutter fra checkout.",
            savedFiltersIntro: "Nar du gemmer produktfiltre, vises de her som dashboard-widgets.",
            salesBreakdownLabels: ["Bruttosalg", "Rabatter", "Returer", "Nettosalg"],
            savedFilterSegments: ["Fremhaevede racercykler", "Pendlersamling", "Forarslancering"],
            inventoryDetails: ["3 tilbage pa lager", "2 tilbage pa lager", "Forventet genopfyldning om 2 dage"],
            fulfillmentLabels: ["Ordrer pakket < 2t", "Afsendt samme dag", "Leveret som lovet"],
            storefrontLabels: ["Sessioner", "Gns. sideindlaesning", "Bounce rate", "Tilbagevendende besoegende"],
            supportLabels: ["Akut", "Afventer svar", "Lost i dag"],
            teamTasks: [
                "Godkend to kladdeprodukter",
                "Gennemga returer fra Kobenhavn",
                "Bekraeft opdatering af leverandor-leveringstid",
                "Udgiv ugentlig webshop-banner",
            ],
            marketingDays: ["Man", "Ons", "Fre"],
            marketingTasks: ["Lancering af racercykel-kampagne", "Gennemga email-flow", "Weekendkampagne gaar live"],
            trafficLabels: ["Organisk sogning", "Direkte", "Betalt social", "Email"],
            returnLabels: ["Forkert storrelse", "Fragtskade", "Forsinket levering", "Andet"],
        },
    },
    de: {
        sectionLabel: "Abschnitt",
        overviewLabel: "Ubersicht",
        lastUpdatedAt: "Zuletzt aktualisiert: {time}",
        lastEditedJustNow: "Gerade bearbeitet",
        lastEditedMinutesAgo: "Vor {count} Min. bearbeitet",
        lastEditedHoursAgo: "Vor {count} Std. bearbeitet",
        lastEditedOn: "Zuletzt bearbeitet: {date}",
        addSection: "Abschnitt hinzufugen",
        reorderSections: "Abschnitte neu anordnen",
        resetToDefault: "Auf Standard zurucksetzen",
        finishDashboardEditing: "Dashboard-Bearbeitung beenden",
        editDashboardAndDragWidgets: "Dashboard bearbeiten und Widgets verschieben",
        editDashboard: "Dashboard bearbeiten",
        exitFullscreenDashboard: "Vollbild-Dashboard verlassen",
        expandDashboardToFullscreen: "Dashboard im Vollbild anzeigen",
        openAnalytics: "Analytics offnen",
        noSectionsVisible: "Auf diesem Dashboard sind derzeit keine Abschnitte sichtbar.",
        dropWidgetsHere: "Widgets hier ablegen",
        cancelEditingSection: "Bearbeiten von {name} abbrechen",
        renameSection: "{name} umbenennen",
        deleteSection: "{name} loschen",
        expandSection: "{name} ausklappen",
        collapseSection: "{name} einklappen",
        removeWidget: "{name} entfernen",
        resizeWidget: "{name} groBe andern",
        reorderTitle: "Abschnitte neu anordnen",
        closeReorder: "Neuordnung der Abschnitte schlieBen",
        reorderHint: "Ziehe Abschnitte, um sie von oben nach unten neu zu sortieren.",
        cancel: "Abbrechen",
        save: "Speichern",
        widgetPreviewUnavailable: "Widget-Vorschau nicht verfugbar.",
        widgetMeta: DE_WIDGET_META,
        widgetBody: {
            growthSnapshotDetail: "Croissance mensuelle sur le chiffre d'affaires et les commandes.",
            ordersTodayDetail: "14 commandes sont en cours de preparation.",
            conversionRateDetail: "+0,6% par rapport au meme jour de la semaine derniere.",
            activeCartsDetail: "28 paniers sont a moins de 15 minutes du paiement.",
            savedFiltersIntro: "Une fois les filtres produits enregistres, ils apparaissent ici comme widgets.",
            salesBreakdownLabels: ["Ventes brutes", "Remises", "Retours", "Ventes nettes"],
            savedFilterSegments: ["Velos route vedettes", "Collection de ville", "Pack lancement printemps"],
            inventoryDetails: ["3 restants en stock", "2 restants en stock", "Reappro prevue dans 2 jours"],
            fulfillmentLabels: ["Commandes preparees < 2h", "Expediees le jour meme", "Livrees dans les delais"],
            storefrontLabels: ["Sessions", "Temps moyen de chargement", "Taux de rebond", "Visiteurs recurrents"],
            supportLabels: ["Urgent", "En attente de reponse", "Resolus aujourd'hui"],
            teamTasks: [
                "Approuver deux produits brouillons",
                "Revoir les retours de Copenhague",
                "Confirmer la mise a jour du delai fournisseur",
                "Publier la banniere hebdomadaire de la boutique",
            ],
            marketingDays: ["Lun", "Mer", "Ven"],
            marketingTasks: ["Lancement campagne velo route", "Revue du flux e-mail", "Promotion week-end en ligne"],
            trafficLabels: ["Recherche organique", "Direct", "Social payant", "E-mail"],
            returnLabels: ["Probleme de taille", "Dommage de livraison", "Livraison en retard", "Autre"],
        },
    },
    fr: {
        sectionLabel: "Section",
        overviewLabel: "Apercu",
        lastUpdatedAt: "Derniere mise a jour : {time}",
        lastEditedJustNow: "Modifie a l'instant",
        lastEditedMinutesAgo: "Modifie il y a {count} min",
        lastEditedHoursAgo: "Modifie il y a {count} h",
        lastEditedOn: "Derniere modification : {date}",
        addSection: "Ajouter une section",
        reorderSections: "Reordonner les sections",
        resetToDefault: "Reinitialiser par defaut",
        finishDashboardEditing: "Terminer l'edition du tableau de bord",
        editDashboardAndDragWidgets: "Editer le tableau de bord et glisser des widgets",
        editDashboard: "Editer le tableau de bord",
        exitFullscreenDashboard: "Quitter le plein ecran",
        expandDashboardToFullscreen: "Passer en plein ecran",
        openAnalytics: "Ouvrir l'analytique",
        noSectionsVisible: "Aucune section n'est visible sur ce tableau de bord.",
        dropWidgetsHere: "Deposez les widgets ici",
        cancelEditingSection: "Annuler la modification de {name}",
        renameSection: "Renommer {name}",
        deleteSection: "Supprimer {name}",
        expandSection: "Developper {name}",
        collapseSection: "Reduire {name}",
        removeWidget: "Retirer {name}",
        resizeWidget: "Redimensionner {name}",
        reorderTitle: "Reordonner les sections",
        closeReorder: "Fermer le reordonnancement des sections",
        reorderHint: "Faites glisser les sections pour les reordonner de haut en bas.",
        cancel: "Annuler",
        save: "Enregistrer",
        widgetPreviewUnavailable: "Apercu du widget indisponible.",
        widgetMeta: FR_WIDGET_META,
        widgetBody: {
            growthSnapshotDetail: "Crecimiento mensual en ingresos y pedidos.",
            ordersTodayDetail: "14 pedidos se estan preparando ahora mismo.",
            conversionRateDetail: "+0,6% frente al mismo dia de la semana pasada.",
            activeCartsDetail: "28 carritos estan a menos de 15 minutos del checkout.",
            savedFiltersIntro: "Cuando guardes filtros de producto, apareceran aqui como widgets del panel.",
            salesBreakdownLabels: ["Ventas brutas", "Descuentos", "Devoluciones", "Ventas netas"],
            savedFilterSegments: ["Bicicletas de ruta destacadas", "Coleccion urbana", "Set de lanzamiento de primavera"],
            inventoryDetails: ["Quedan 3 en stock", "Quedan 2 en stock", "Reposicion estimada en 2 dias"],
            fulfillmentLabels: ["Pedidos empaquetados < 2h", "Enviados el mismo dia", "Entregados a tiempo"],
            storefrontLabels: ["Sesiones", "Carga media de pagina", "Tasa de rebote", "Visitantes recurrentes"],
            supportLabels: ["Urgente", "Esperando respuesta", "Resueltos hoy"],
            teamTasks: [
                "Aprobar dos productos en borrador",
                "Revisar devoluciones de Copenhague",
                "Confirmar actualizacion de plazos del proveedor",
                "Publicar banner semanal de la tienda",
            ],
            marketingDays: ["Lun", "Mie", "Vie"],
            marketingTasks: ["Lanzamiento de campana de ruta", "Revision del flujo de correo", "Promocion de fin de semana en vivo"],
            trafficLabels: ["Busqueda organica", "Directo", "Social de pago", "Correo"],
            returnLabels: ["Talla incorrecta", "Dano en envio", "Entrega tardia", "Otro"],
        },
    },
    es: {
        sectionLabel: "Seccion",
        overviewLabel: "Resumen",
        lastUpdatedAt: "Ultima actualizacion: {time}",
        lastEditedJustNow: "Editado hace un momento",
        lastEditedMinutesAgo: "Editado hace {count} min",
        lastEditedHoursAgo: "Editado hace {count} h",
        lastEditedOn: "Editado: {date}",
        addSection: "Agregar seccion",
        reorderSections: "Reordenar secciones",
        resetToDefault: "Restablecer por defecto",
        finishDashboardEditing: "Finalizar edicion del panel",
        editDashboardAndDragWidgets: "Editar panel y arrastrar widgets",
        editDashboard: "Editar panel",
        exitFullscreenDashboard: "Salir de pantalla completa",
        expandDashboardToFullscreen: "Expandir panel a pantalla completa",
        openAnalytics: "Abrir analitica",
        noSectionsVisible: "No hay secciones visibles en este panel.",
        dropWidgetsHere: "Suelta widgets aqui",
        cancelEditingSection: "Cancelar edicion de {name}",
        renameSection: "Renombrar {name}",
        deleteSection: "Eliminar {name}",
        expandSection: "Expandir {name}",
        collapseSection: "Contraer {name}",
        removeWidget: "Quitar {name}",
        resizeWidget: "Redimensionar {name}",
        reorderTitle: "Reordenar secciones",
        closeReorder: "Cerrar reorden de secciones",
        reorderHint: "Arrastra las secciones para reordenarlas de arriba hacia abajo.",
        cancel: "Cancelar",
        save: "Guardar",
        widgetPreviewUnavailable: "Vista previa del widget no disponible.",
        widgetMeta: ES_WIDGET_META,
        widgetBody: {
            growthSnapshotDetail: "收入与订单的月度增长。",
            ordersTodayDetail: "当前有 14 个订单正在打包。",
            conversionRateDetail: "相比上周同一工作日提升 +0.6%。",
            activeCartsDetail: "28 个购物车将在 15 分钟内进入结账。",
            savedFiltersIntro: "当你保存产品筛选后，它们会显示在这里作为仪表盘组件。",
            salesBreakdownLabels: ["总销售额", "折扣", "退货", "净销售额"],
            savedFilterSegments: ["精选公路车", "通勤系列", "春季上新组合"],
            inventoryDetails: ["库存剩余 3 件", "库存剩余 2 件", "预计 2 天后补货"],
            fulfillmentLabels: ["2 小时内完成打包", "当天发货", "按承诺送达"],
            storefrontLabels: ["会话数", "平均页面加载", "跳出率", "回访访客"],
            supportLabels: ["紧急", "等待回复", "今日已解决"],
            teamTasks: [
                "批准两个草稿产品",
                "复核来自哥本哈根的退货",
                "确认供应商交期更新",
                "发布每周店铺横幅",
            ],
            marketingDays: ["周一", "周三", "周五"],
            marketingTasks: ["公路车活动上线", "检查邮件流程", "周末促销上线"],
            trafficLabels: ["自然搜索", "直接访问", "付费社媒", "邮件"],
            returnLabels: ["尺码不匹配", "运输损坏", "延迟送达", "其他"],
        },
    },
    zh: {
        sectionLabel: "分区",
        overviewLabel: "概览",
        lastUpdatedAt: "最后更新：{time}",
        lastEditedJustNow: "刚刚编辑",
        lastEditedMinutesAgo: "{count} 分钟前编辑",
        lastEditedHoursAgo: "{count} 小时前编辑",
        lastEditedOn: "上次编辑：{date}",
        addSection: "添加分区",
        reorderSections: "重排分区",
        resetToDefault: "重置为默认",
        finishDashboardEditing: "完成仪表盘编辑",
        editDashboardAndDragWidgets: "编辑仪表盘并拖拽组件",
        editDashboard: "编辑仪表盘",
        exitFullscreenDashboard: "退出全屏仪表盘",
        expandDashboardToFullscreen: "全屏显示仪表盘",
        openAnalytics: "打开分析",
        noSectionsVisible: "当前仪表盘没有可见分区。",
        dropWidgetsHere: "将组件拖到这里",
        cancelEditingSection: "取消编辑 {name}",
        renameSection: "重命名 {name}",
        deleteSection: "删除 {name}",
        expandSection: "展开 {name}",
        collapseSection: "收起 {name}",
        removeWidget: "移除 {name}",
        resizeWidget: "调整 {name} 大小",
        reorderTitle: "重排分区",
        closeReorder: "关闭分区重排",
        reorderHint: "拖动分区可从上到下重新排序。",
        cancel: "取消",
        save: "保存",
        widgetPreviewUnavailable: "组件预览不可用。",
        widgetMeta: ZH_WIDGET_META,
        widgetBody: BASE_WIDGET_BODY,
    },
};

// Normalize locale widget body mapping (content drift had shifted these by one locale).
const DE_WIDGET_BODY = DASHBOARD_MESSAGES.en.widgetBody;
const FR_WIDGET_BODY = DASHBOARD_MESSAGES.de.widgetBody;
const ES_WIDGET_BODY = DASHBOARD_MESSAGES.fr.widgetBody;
const ZH_WIDGET_BODY = DASHBOARD_MESSAGES.es.widgetBody;

DASHBOARD_MESSAGES.en.widgetBody = BASE_WIDGET_BODY;
DASHBOARD_MESSAGES.de.widgetBody = DE_WIDGET_BODY;
DASHBOARD_MESSAGES.fr.widgetBody = FR_WIDGET_BODY;
DASHBOARD_MESSAGES.es.widgetBody = ES_WIDGET_BODY;
DASHBOARD_MESSAGES.zh.widgetBody = ZH_WIDGET_BODY;

export function getDashboardMessages(language: LanguageCode) {
    return DASHBOARD_MESSAGES[language] ?? DASHBOARD_MESSAGES.en;
}
