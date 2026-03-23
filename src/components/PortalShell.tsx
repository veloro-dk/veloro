"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type DragEvent as ReactDragEvent,
    type MouseEvent as ReactMouseEvent,
} from "react";
import {
    ArrowLeft,
    ArrowUpRight,
    Bell,
    Bot,
    Check,
    CircleCheck,
    ChevronDown,
    Lightbulb,
    LogOut,
    Maximize2,
    Menu,
    MessageSquare,
    Minimize2,
    Monitor,
    Moon,
    Pencil,
    Search,
    Sparkles,
    Sun,
    Trash2,
    TriangleAlert,
    X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { PortalNavigationProvider } from "@/components/PortalNavigationContext";
import { PortalHeaderPopover } from "@/components/PortalHeaderPopover";
import {
    PortalSearchDialog,
    PortalSearchTrigger,
    type PortalSearchDisplayItem,
    type PortalSearchDisplaySection,
} from "@/components/PortalSearch";
import { renderPortalPageIcon } from "@/components/portalPageIcons";
import { Spinner } from "@/components/Spinner";
import { Tooltip } from "@/components/Tooltip";
import { VeloroLogo } from "@/components/VeloroLogo";
import {
    DASHBOARD_WIDGET_DRAG_DATASET_KEY,
    DASHBOARD_WIDGET_DRAG_MIME,
    DASHBOARD_WIDGET_MENU_EVENT,
    isDashboardWidgetMenuEventDetail,
    type DashboardWidgetMenuEventDetail,
} from "@/components/dashboardEditorEvents";
import {
    DASHBOARD_PENDING_CHANGES_DATASET_KEY,
    PENDING_DISCARD_LABEL_DATASET_KEY,
    PENDING_SAVE_DISABLED_DATASET_KEY,
    PENDING_CHANGES_ACTION_EVENT,
    PENDING_CHANGES_ATTENTION_EVENT,
    PRODUCT_CREATE_PENDING_CHANGES_DATASET_KEY,
    SETTINGS_PENDING_CHANGES_DATASET_KEY,
    type PendingChangesActionEventDetail,
    type PendingDiscardLabelVariant,
    type PendingChangesScope,
} from "@/components/pendingChangesEvents";
import {
    notifyPortalAction,
} from "@/components/portalActionNotifications";
import {
    ASSISTANT_ACTIVE_CONVERSATION_STORAGE_KEY,
    ASSISTANT_CHAT_ENABLED,
    ASSISTANT_CONVERSATIONS_STORAGE_KEY,
    ASSISTANT_MEMORY_STORAGE_KEY,
    ASSISTANT_PANEL_STATE_STORAGE_KEY,
    CATEGORY_CREATE_PENDING_COPY,
    CATEGORY_EDIT_PENDING_COPY,
    INVENTORY_CREATE_PENDING_COPY,
    LAST_NON_SETTINGS_PATH_STORAGE_KEY,
    MAX_RECENT_SEARCHES,
    PORTAL_INLINE_NOTIFICATION_HIDDEN_CLASS,
    PORTAL_INLINE_NOTIFICATION_SELECTOR,
    PRODUCT_CREATE_PENDING_COPY,
    PRODUCT_EDIT_PENDING_COPY,
    PURCHASE_ORDER_CREATE_PENDING_COPY,
    PURCHASE_ORDER_EDIT_PENDING_COPY,
    ROLE_LABELS,
    ROUTE_LOAD_SHOW_DELAY_MS,
    SEARCH_ATTENTION_SHAKE_COOLDOWN_MS,
    SEARCH_ATTENTION_SHAKE_DURATION_MS,
    SEARCH_ATTENTION_TINT_START_DELAY_MS,
    SEARCH_ATTENTION_TINT_VISIBLE_MS,
    SEARCH_CONTENT_IGNORE_SELECTOR,
    SEARCH_CONTENT_ROOT_SELECTORS,
    SEARCH_CONTENT_SELECTOR,
    SEARCH_INDEX_CACHE_VERSION,
    SEARCH_COPY,
    SEARCH_FEATURED_IDS,
    SEARCH_PAGE_DEFINITIONS,
    SEARCH_RECENT_STORAGE_KEY,
    SIDEBAR_SCENE_SWAP_MS,
    THEME_STORAGE_KEY,
    UNSAVED_ACTION_COPY,
    type AssistantConversation,
    type FeedbackKindValue,
    type FeedbackStep,
    type HeaderPopoverId,
    type NavItem,
    type SearchIndexCachePayload,
    type SearchItem,
    type SidebarScenesPhase,
    type SystemStatus,
    type ThemePreference,
} from "@/components/shell/viewConfig";
import {
    applySearchIndexContent,
    buildSearchSnippet,
    createAssistantConversation,
    escapeRegExp,
    formatAssistantTimestamp,
    formatSearchTemplate,
    getShortcutLabel,
    getSearchIndexCacheKey,
    inferPortalActionNotificationTone,
    isThemePreference,
    nextTheme,
    normalizePathname,
    normalizeNotificationMessage,
    normalizeSearchText,
    parseAssistantConversations,
    parseSearchIndexCache,
    parseSearchPageId,
    resolveSearchPageTitle,
    scoreSearchItem,
    splitSearchContentIntoChunks,
    type SearchDebugItem,
    type SearchDebugPayload,
} from "@/components/shell/viewHelpers";
import { type PortalShellProps } from "@/components/shell/viewTypes";
import {
    type LanguageCode,
    PORTAL_MESSAGES,
} from "@/i18n/portal";
import { PortalI18nProvider } from "@/i18n/PortalI18nContext";
import { getCachedCatalogStateSnapshot, primeCatalogStateCache } from "@/lib/catalogStateClient";
import { cn } from "@/lib/cn";
import { isSearchPageEnabled } from "@/lib/portalFeatureFlags";
import { preloadPortalRouteData, routeRequiresCatalogState } from "@/lib/portalRouteLoading";
import { normalizePortalPublicPathname } from "@/lib/portalRoutes";

export function PortalShell({ children, user, language, currency, storeCurrency, stores, activeStoreId, featureFlags }: PortalShellProps) {
    const pathname = normalizePortalPublicPathname(usePathname());
    const searchParams = useSearchParams();
    const router = useRouter();
    const searchParamsString = searchParams.toString();
    const currentRouteKey = useMemo(() => {
        const normalizedPath = normalizePathname(pathname);
        return searchParamsString ? `${normalizedPath}?${searchParamsString}` : normalizedPath;
    }, [pathname, searchParamsString]);
    const isSettingsRoute = pathname === "/settings" || pathname.startsWith("/settings/");
    const isProductCreateRoute = pathname === "/products/new" || pathname.startsWith("/products/new/");
    const isInventoryCreateRoute = pathname === "/products/inventory/new" || pathname.startsWith("/products/inventory/new/");
    const isInventoryDetailRoute = /^\/products\/inventory\/[^/]+(?:\/.*)?$/.test(pathname)
        && !pathname.startsWith("/products/inventory/new");
    const isPurchaseOrderCreateRoute = pathname === "/products/purchase-orders/new" || pathname.startsWith("/products/purchase-orders/new/");
    const isPurchaseOrderEditRoute = /^\/products\/purchase-orders\/[^/]+(?:\/.*)?$/.test(pathname)
        && !pathname.startsWith("/products/purchase-orders/new");
    const isCategoryCreateRoute = pathname === "/products/categories/new" || pathname.startsWith("/products/categories/new/");
    const isCategoryEditRoute = /^\/products\/categories\/[^/]+(?:\/.*)?$/.test(pathname)
        && !pathname.startsWith("/products/categories/new");
    const isProductEditRoute = /^\/products\/[^/]+(?:\/.*)?$/.test(pathname)
        && !pathname.startsWith("/products/new")
        && !pathname.startsWith("/products/categories")
        && !pathname.startsWith("/products/inventory")
        && !pathname.startsWith("/products/purchase-orders")
        && !pathname.startsWith("/products/variants");

    const [openPopover, setOpenPopover] = useState<HeaderPopoverId>(null);
    const [signingOut, setSigningOut] = useState(false);
    const [systemStatus, setSystemStatus] = useState<SystemStatus>("operational");
    const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>("select");
    const [feedbackKind, setFeedbackKind] = useState<FeedbackKindValue | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackSending, setFeedbackSending] = useState(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchActiveIndex, setSearchActiveIndex] = useState(0);
    const [searchIndexing, setSearchIndexing] = useState(false);
    const [searchKeyboardNavigation, setSearchKeyboardNavigation] = useState(false);
    const [recentSearchIds, setRecentSearchIds] = useState<string[]>([]);
    const [pageSearchItems, setPageSearchItems] = useState<SearchItem[]>([]);
    const [routeLoadVisible, setRouteLoadVisible] = useState(false);
    const [routeLoadProgress, setRouteLoadProgress] = useState(0);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [pendingChangesScope, setPendingChangesScope] = useState<PendingChangesScope | null>(null);
    const [pendingDiscardLabelVariant, setPendingDiscardLabelVariant] = useState<PendingDiscardLabelVariant>("discard");
    const [pendingSaveDisabled, setPendingSaveDisabled] = useState(false);
    const [searchAttentionShake, setSearchAttentionShake] = useState(false);
    const [searchAttentionTint, setSearchAttentionTint] = useState(false);
    const [dashboardWidgetMenuState, setDashboardWidgetMenuState] = useState<DashboardWidgetMenuEventDetail>({
        open: false,
        items: [],
    });
    const [dashboardWidgetSearchQuery, setDashboardWidgetSearchQuery] = useState("");
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [assistantFullWidth, setAssistantFullWidth] = useState(false);
    const [assistantMemoryEnabled, setAssistantMemoryEnabled] = useState(false);
    const [assistantConversationMenuOpen, setAssistantConversationMenuOpen] = useState(false);
    const [assistantConversationSearchQuery, setAssistantConversationSearchQuery] = useState("");
    const [assistantConversations, setAssistantConversations] = useState<AssistantConversation[]>([
        { id: "assistant-default", title: "New conversation", updatedAt: 0 },
    ]);
    const [assistantActiveConversationId, setAssistantActiveConversationId] = useState("assistant-default");
    const [assistantDraft, setAssistantDraft] = useState("");
    const headerActionsRef = useRef<HTMLDivElement | null>(null);
    const assistantConversationMenuRef = useRef<HTMLDivElement | null>(null);
    const assistantConversationButtonRef = useRef<HTMLButtonElement | null>(null);
    const feedbackTextRef = useRef<HTMLTextAreaElement | null>(null);
    const inlineNotificationObserverFrameRef = useRef<number | null>(null);
    const themePrefRef = useRef<ThemePreference>("system");
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const routeLoadShowTimerRef = useRef<number | null>(null);
    const routeLoadHideTimerRef = useRef<number | null>(null);
    const routeLoadAdvanceTimerRef = useRef<number | null>(null);
    const routeLoadFailSafeTimerRef = useRef<number | null>(null);
    const routeLoadVisibleRef = useRef(false);
    const routeLoadProgressRef = useRef(0);
    const routeLoadActiveRef = useRef(false);
    const routeLoadTargetRouteKeyRef = useRef<string | null>(null);
    const routeLoadTransitionIdRef = useRef(0);
    const routeLoadPreviousRouteKeyRef = useRef(currentRouteKey);
    const initialRouteLoadHandledRef = useRef(false);
    const searchAttentionShakeTimeoutRef = useRef<number | null>(null);
    const searchAttentionLastShakeAtRef = useRef(0);
    const searchAttentionTintStartTimeoutRef = useRef<number | null>(null);
    const searchAttentionTintHideTimeoutRef = useRef<number | null>(null);
    const searchShortcutLabel = useMemo(() => getShortcutLabel(), []);

    const nav = useMemo<NavItem[]>(() => {
        const items: NavItem[] = [
            { key: "home", href: "/" },
            {
                key: "products",
                href: "/products",
                children: [
                    { key: "categories", href: "/products/categories" },
                    { key: "inventory", href: "/products/inventory" },
                    { key: "purchaseOrders", href: "/products/purchase-orders" },
                    { key: "variants", href: "/products/variants" },
                ],
            },
        ];

        if (featureFlags.finance) {
            items.push({ key: "finance", href: "/finance" });
        }

        if (featureFlags.analytics) {
            const analyticsChildren: Array<{ key: "reports" | "liveView"; href: string }> = [];
            if (featureFlags.analyticsReports) {
                analyticsChildren.push({ key: "reports", href: "/analytics/reports" });
            }
            if (featureFlags.analyticsLiveView) {
                analyticsChildren.push({ key: "liveView", href: "/analytics/live-view" });
            }

            items.push({
                key: "analytics",
                href: "/analytics",
                ...(analyticsChildren.length > 0 ? { children: analyticsChildren } : {}),
            });
        }

        return items;
    }, [featureFlags]);

    const isActive = useCallback(
        (href: string) => {
            if (href === "/") return pathname === "/";
            return pathname === href || pathname.startsWith(href + "/");
        },
        [pathname]
    );

    const activeParentHref = useMemo(() => {
        const match = nav.find((item) => {
            if (!item.children?.length) return false;
            return pathname === item.href || pathname.startsWith(item.href + "/");
        });
        return match?.href ?? null;
    }, [nav, pathname]);

    const [openSubmenuHrefs, setOpenSubmenuHrefs] = useState<string[]>([]);
    const isDashboardWidgetMenuTargetActive = pathname === "/"
        && dashboardWidgetMenuState.open
        && !isSettingsRoute
        && !isMobileViewport;
    const [sidebarScenesPhase, setSidebarScenesPhase] = useState<SidebarScenesPhase>(() => (
        isDashboardWidgetMenuTargetActive ? "widgets" : "nav"
    ));
    const isDashboardWidgetMode = sidebarScenesPhase !== "nav";
    const isDashboardWidgetMenuVisible = sidebarScenesPhase === "widgets" || sidebarScenesPhase === "widgets-exit";

    const readPendingChangesScope = useCallback((): PendingChangesScope | null => {
        if (typeof document === "undefined") return null;

        const settingsPending = document.body.dataset[SETTINGS_PENDING_CHANGES_DATASET_KEY] === "1";
        const dashboardPending = document.body.dataset[DASHBOARD_PENDING_CHANGES_DATASET_KEY] === "1";
        const productCreatePending = document.body.dataset[PRODUCT_CREATE_PENDING_CHANGES_DATASET_KEY] === "1";

        if (isSettingsRoute && settingsPending) return "settings";
        if ((isProductCreateRoute || isInventoryCreateRoute || isInventoryDetailRoute || isPurchaseOrderCreateRoute || isPurchaseOrderEditRoute || isCategoryCreateRoute || isCategoryEditRoute || isProductEditRoute) && productCreatePending) return "productCreate";
        if (pathname === "/" && dashboardPending) return "dashboard";
        return null;
    }, [isCategoryCreateRoute, isCategoryEditRoute, isInventoryCreateRoute, isInventoryDetailRoute, isProductCreateRoute, isProductEditRoute, isPurchaseOrderCreateRoute, isPurchaseOrderEditRoute, isSettingsRoute, pathname]);

    const readPendingDiscardLabelVariant = useCallback((): PendingDiscardLabelVariant => {
        if (typeof document === "undefined") return "discard";
        const raw = document.body.dataset[PENDING_DISCARD_LABEL_DATASET_KEY];
        return raw === "cancel" ? "cancel" : "discard";
    }, []);

    const readPendingSaveDisabled = useCallback(() => {
        if (typeof document === "undefined") return false;
        return document.body.dataset[PENDING_SAVE_DISABLED_DATASET_KEY] === "1";
    }, []);

    const triggerSearchAttention = useCallback(() => {
        const now = Date.now();
        const canTriggerShake = (now - searchAttentionLastShakeAtRef.current) >= SEARCH_ATTENTION_SHAKE_COOLDOWN_MS;

        if (canTriggerShake) {
            searchAttentionLastShakeAtRef.current = now;

            if (searchAttentionShakeTimeoutRef.current !== null) {
                window.clearTimeout(searchAttentionShakeTimeoutRef.current);
                searchAttentionShakeTimeoutRef.current = null;
            }
            setSearchAttentionShake(false);

            window.requestAnimationFrame(() => {
                setSearchAttentionShake(true);
            });

            searchAttentionShakeTimeoutRef.current = window.setTimeout(() => {
                setSearchAttentionShake(false);
                searchAttentionShakeTimeoutRef.current = null;
            }, SEARCH_ATTENTION_SHAKE_DURATION_MS);
        }

        const scheduleTintHide = () => {
            if (searchAttentionTintHideTimeoutRef.current !== null) {
                window.clearTimeout(searchAttentionTintHideTimeoutRef.current);
            }

            searchAttentionTintHideTimeoutRef.current = window.setTimeout(() => {
                setSearchAttentionTint(false);
                searchAttentionTintHideTimeoutRef.current = null;
            }, SEARCH_ATTENTION_TINT_VISIBLE_MS);
        };

        if (searchAttentionTint) {
            scheduleTintHide();
            return;
        }

        if (searchAttentionTintStartTimeoutRef.current === null) {
            searchAttentionTintStartTimeoutRef.current = window.setTimeout(() => {
                searchAttentionTintStartTimeoutRef.current = null;
                setSearchAttentionTint(true);
                scheduleTintHide();
            }, SEARCH_ATTENTION_TINT_START_DELAY_MS);
        }
    }, [searchAttentionTint]);

    const hasBlockingPendingChanges = pendingChangesScope !== null;

    const triggerBlockingPendingShake = useCallback(() => {
        triggerSearchAttention();
    }, [triggerSearchAttention]);

    const dispatchPendingAction = useCallback((action: PendingChangesActionEventDetail["action"]) => {
        if (typeof window === "undefined") return;
        if (!pendingChangesScope) return;

        const detail: PendingChangesActionEventDetail = { scope: pendingChangesScope, action };
        window.dispatchEvent(new CustomEvent(PENDING_CHANGES_ACTION_EVENT, { detail }));
    }, [pendingChangesScope]);

    const processInlineNotificationElement = useCallback((element: Element, forceRepeat = false) => {
        if (!(element instanceof HTMLElement)) return;

        const message = normalizeNotificationMessage(element.textContent ?? "");
        if (!message) return;

        const previousMessage = element.dataset.portalInlineNotifyMessage;
        if (!forceRepeat && previousMessage === message) return;
        element.dataset.portalInlineNotifyMessage = message;

        const tone = inferPortalActionNotificationTone(element.className, message);
        notifyPortalAction({ message, tone });

        element.classList.add(PORTAL_INLINE_NOTIFICATION_HIDDEN_CLASS);
        element.setAttribute("aria-hidden", "true");
    }, []);

    const scanInlineNotifications = useCallback((forceRepeat = false) => {
        if (typeof document === "undefined") return;
        const root = document.querySelector(".portalShell__A1b2C3");
        if (!root) return;

        const elements = root.querySelectorAll(PORTAL_INLINE_NOTIFICATION_SELECTOR);
        for (const element of elements) {
            processInlineNotificationElement(element, forceRepeat);
        }
    }, [processInlineNotificationElement]);

    const [themePreference, setThemePreference] = useState<ThemePreference>("system");
    const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(language);
    const [currentStoreId, setCurrentStoreId] = useState(activeStoreId);
    const [updatingStoreId, setUpdatingStoreId] = useState<string | null>(null);
    const [storeUpdateError, setStoreUpdateError] = useState<string | null>(null);

    useEffect(() => {
        setCurrentLanguage(language);
    }, [language]);

    useEffect(() => {
        setCurrentStoreId(activeStoreId);
    }, [activeStoreId]);

    useEffect(() => {
        if (typeof document === "undefined") return;
        const syncPendingChangesScope = () => {
            setPendingChangesScope(readPendingChangesScope());
            setPendingDiscardLabelVariant(readPendingDiscardLabelVariant());
            setPendingSaveDisabled(readPendingSaveDisabled());
        };

        syncPendingChangesScope();

        const observer = new MutationObserver(syncPendingChangesScope);
        observer.observe(document.body, { attributes: true });

        return () => observer.disconnect();
    }, [readPendingChangesScope, readPendingDiscardLabelVariant, readPendingSaveDisabled]);

    useEffect(() => {
        const onPendingAttention = () => {
            triggerSearchAttention();
        };

        window.addEventListener(PENDING_CHANGES_ATTENTION_EVENT, onPendingAttention);
        return () => {
            window.removeEventListener(PENDING_CHANGES_ATTENTION_EVENT, onPendingAttention);
        };
    }, [triggerSearchAttention]);

    useEffect(() => {
        if (typeof document === "undefined") return;

        const scheduleScan = (forceRepeat = false) => {
            if (inlineNotificationObserverFrameRef.current !== null) return;
            inlineNotificationObserverFrameRef.current = window.requestAnimationFrame(() => {
                inlineNotificationObserverFrameRef.current = null;
                scanInlineNotifications(forceRepeat);
            });
        };

        scheduleScan();

        const observer = new MutationObserver(() => {
            scheduleScan();
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true,
        });

        const scheduleForcedScan = () => {
            window.setTimeout(() => {
                scanInlineNotifications(true);
            }, 0);
        };

        const onSubmitCapture = () => {
            scheduleForcedScan();
        };

        const onButtonCapture = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target) return;
            if (!target.closest("button,[role='button'],input[type='submit']")) return;

            const root = document.querySelector(".portalShell__A1b2C3");
            if (!root?.querySelector(`.${PORTAL_INLINE_NOTIFICATION_HIDDEN_CLASS}`)) return;
            scheduleForcedScan();
        };

        document.addEventListener("submit", onSubmitCapture, true);
        document.addEventListener("click", onButtonCapture, true);

        return () => {
            observer.disconnect();
            document.removeEventListener("submit", onSubmitCapture, true);
            document.removeEventListener("click", onButtonCapture, true);
            if (inlineNotificationObserverFrameRef.current !== null) {
                window.cancelAnimationFrame(inlineNotificationObserverFrameRef.current);
                inlineNotificationObserverFrameRef.current = null;
            }
        };
    }, [scanInlineNotifications]);

    useEffect(() => {
        return () => {
            if (searchAttentionShakeTimeoutRef.current !== null) {
                window.clearTimeout(searchAttentionShakeTimeoutRef.current);
                searchAttentionShakeTimeoutRef.current = null;
            }
            if (searchAttentionTintStartTimeoutRef.current !== null) {
                window.clearTimeout(searchAttentionTintStartTimeoutRef.current);
                searchAttentionTintStartTimeoutRef.current = null;
            }
            if (searchAttentionTintHideTimeoutRef.current !== null) {
                window.clearTimeout(searchAttentionTintHideTimeoutRef.current);
                searchAttentionTintHideTimeoutRef.current = null;
            }
            if (inlineNotificationObserverFrameRef.current !== null) {
                window.cancelAnimationFrame(inlineNotificationObserverFrameRef.current);
                inlineNotificationObserverFrameRef.current = null;
            }
            delete document.body.dataset[DASHBOARD_WIDGET_DRAG_DATASET_KEY];
        };
    }, []);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 768px)");
        const syncMobileViewport = () => {
            const nextIsMobile = media.matches;
            setIsMobileViewport(nextIsMobile);
            if (!nextIsMobile) {
                setMobileNavOpen(false);
            }
        };

        syncMobileViewport();
        media.addEventListener("change", syncMobileViewport);

        return () => {
            media.removeEventListener("change", syncMobileViewport);
        };
    }, []);

    useEffect(() => {
        function onDashboardWidgetMenu(event: Event) {
            const detail = (event as CustomEvent<unknown>).detail;
            if (!isDashboardWidgetMenuEventDetail(detail)) return;
            setDashboardWidgetMenuState(detail);
        }

        window.addEventListener(DASHBOARD_WIDGET_MENU_EVENT, onDashboardWidgetMenu as EventListener);
        return () => {
            window.removeEventListener(DASHBOARD_WIDGET_MENU_EVENT, onDashboardWidgetMenu as EventListener);
        };
    }, []);

    useEffect(() => {
        if (pathname === "/") return;
        if (!dashboardWidgetMenuState.open) return;

        setDashboardWidgetMenuState((current) => ({ ...current, open: false }));
    }, [dashboardWidgetMenuState.open, pathname]);

    useEffect(() => {
        if (isDashboardWidgetMenuTargetActive) return;
        setDashboardWidgetSearchQuery("");
    }, [isDashboardWidgetMenuTargetActive]);

    useEffect(() => {
        let timeoutId: number | null = null;

        if (isDashboardWidgetMenuTargetActive) {
            setSidebarScenesPhase((current) => (current === "widgets" ? current : "nav-exit"));
            timeoutId = window.setTimeout(() => {
                setSidebarScenesPhase("widgets");
            }, SIDEBAR_SCENE_SWAP_MS);
        } else {
            setSidebarScenesPhase((current) => (current === "nav" ? current : "widgets-exit"));
            timeoutId = window.setTimeout(() => {
                setSidebarScenesPhase("nav");
            }, SIDEBAR_SCENE_SWAP_MS);
        }

        return () => {
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };
    }, [isDashboardWidgetMenuTargetActive]);

    useEffect(() => {
        routeLoadVisibleRef.current = routeLoadVisible;
    }, [routeLoadVisible]);

    const clearRouteLoadShowTimer = useCallback(() => {
        if (routeLoadShowTimerRef.current !== null) {
            window.clearTimeout(routeLoadShowTimerRef.current);
            routeLoadShowTimerRef.current = null;
        }
    }, []);

    const clearRouteLoadHideTimer = useCallback(() => {
        if (routeLoadHideTimerRef.current !== null) {
            window.clearTimeout(routeLoadHideTimerRef.current);
            routeLoadHideTimerRef.current = null;
        }
    }, []);

    const clearRouteLoadAdvanceTimer = useCallback(() => {
        if (routeLoadAdvanceTimerRef.current !== null) {
            window.clearInterval(routeLoadAdvanceTimerRef.current);
            routeLoadAdvanceTimerRef.current = null;
        }
    }, []);

    const clearRouteLoadFailSafeTimer = useCallback(() => {
        if (routeLoadFailSafeTimerRef.current !== null) {
            window.clearTimeout(routeLoadFailSafeTimerRef.current);
            routeLoadFailSafeTimerRef.current = null;
        }
    }, []);

    const finishRouteTransitionLoad = useCallback(() => {
        if (!routeLoadActiveRef.current) return;

        routeLoadActiveRef.current = false;
        routeLoadTargetRouteKeyRef.current = null;
        clearRouteLoadShowTimer();
        clearRouteLoadAdvanceTimer();
        clearRouteLoadFailSafeTimer();

        if (!routeLoadVisibleRef.current) {
            routeLoadProgressRef.current = 0;
            setRouteLoadProgress(0);
            return;
        }

        routeLoadProgressRef.current = 1;
        setRouteLoadProgress(1);

        clearRouteLoadHideTimer();
        routeLoadHideTimerRef.current = window.setTimeout(() => {
            setRouteLoadVisible(false);
            routeLoadVisibleRef.current = false;
            routeLoadProgressRef.current = 0;
            setRouteLoadProgress(0);
        }, 220);
    }, [clearRouteLoadAdvanceTimer, clearRouteLoadFailSafeTimer, clearRouteLoadHideTimer, clearRouteLoadShowTimer]);

    const startRouteTransitionLoad = useCallback((targetRouteKey: string | null) => {
        routeLoadTransitionIdRef.current += 1;
        const transitionId = routeLoadTransitionIdRef.current;

        routeLoadActiveRef.current = true;
        routeLoadTargetRouteKeyRef.current = targetRouteKey;
        routeLoadProgressRef.current = 0.04;
        setRouteLoadProgress(0.04);

        clearRouteLoadHideTimer();
        clearRouteLoadShowTimer();
        clearRouteLoadAdvanceTimer();
        clearRouteLoadFailSafeTimer();

        routeLoadVisibleRef.current = false;
        setRouteLoadVisible(false);

        routeLoadShowTimerRef.current = window.setTimeout(() => {
            if (!routeLoadActiveRef.current) return;
            if (transitionId !== routeLoadTransitionIdRef.current) return;
            routeLoadVisibleRef.current = true;
            setRouteLoadVisible(true);
        }, ROUTE_LOAD_SHOW_DELAY_MS);

        routeLoadAdvanceTimerRef.current = window.setInterval(() => {
            if (!routeLoadActiveRef.current) return;
            const current = routeLoadProgressRef.current;
            const easedIncrement = (0.92 - current) * 0.2;
            const next = Math.min(0.92, current + Math.max(0.01, easedIncrement));
            if (next <= current) return;
            routeLoadProgressRef.current = next;
            setRouteLoadProgress(next);
        }, 120);

        routeLoadFailSafeTimerRef.current = window.setTimeout(() => {
            finishRouteTransitionLoad();
        }, 10000);
        return transitionId;
    }, [clearRouteLoadAdvanceTimer, clearRouteLoadFailSafeTimer, clearRouteLoadHideTimer, clearRouteLoadShowTimer, finishRouteTransitionLoad]);

    const navigateTo = useCallback(async (href: string, options?: { replace?: boolean }) => {
        if (typeof window === "undefined") return;

        let url: URL;
        try {
            url = new URL(href, window.location.origin);
        } catch {
            if (options?.replace) {
                router.replace(href);
            } else {
                router.push(href);
            }
            return;
        }

        if (url.origin !== window.location.origin || url.pathname.startsWith("/api")) {
            window.location.assign(url.toString());
            return;
        }

        const nextPath = normalizePathname(normalizePortalPublicPathname(url.pathname));
        const nextRouteKey = url.search ? `${nextPath}${url.search}` : nextPath;
        if (nextRouteKey === currentRouteKey) return;

        const transitionId = startRouteTransitionLoad(nextRouteKey);

        try {
            await preloadPortalRouteData(nextPath);
        } catch {
            // Keep navigation moving even if preloading fails.
        }

        if (transitionId !== routeLoadTransitionIdRef.current) return;
        if (options?.replace) {
            router.replace(href);
        } else {
            router.push(href);
        }
    }, [currentRouteKey, router, startRouteTransitionLoad]);

    useEffect(() => {
        if (initialRouteLoadHandledRef.current) return;
        initialRouteLoadHandledRef.current = true;

        let cancelled = false;

        if (!routeRequiresCatalogState(pathname) || getCachedCatalogStateSnapshot()) {
            void primeCatalogStateCache().catch(() => undefined);
            return;
        }

        const transitionId = startRouteTransitionLoad(currentRouteKey);
        void preloadPortalRouteData(pathname)
            .catch(() => undefined)
            .finally(() => {
                if (cancelled) return;
                if (transitionId !== routeLoadTransitionIdRef.current) return;
                finishRouteTransitionLoad();
            });

        return () => {
            cancelled = true;
        };
    }, [currentRouteKey, finishRouteTransitionLoad, pathname, startRouteTransitionLoad]);

    useEffect(() => {
        const previousRouteKey = routeLoadPreviousRouteKeyRef.current;
        routeLoadPreviousRouteKeyRef.current = currentRouteKey;

        if (!routeLoadActiveRef.current) return;
        const targetRouteKey = routeLoadTargetRouteKeyRef.current;

        if (targetRouteKey) {
            if (targetRouteKey !== currentRouteKey) return;
            finishRouteTransitionLoad();
            return;
        }

        if (previousRouteKey !== currentRouteKey) {
            finishRouteTransitionLoad();
        }
    }, [currentRouteKey, finishRouteTransitionLoad]);

    useEffect(() => {
        return () => {
            clearRouteLoadShowTimer();
            clearRouteLoadHideTimer();
            clearRouteLoadAdvanceTimer();
            clearRouteLoadFailSafeTimer();
        };
    }, [clearRouteLoadAdvanceTimer, clearRouteLoadFailSafeTimer, clearRouteLoadHideTimer, clearRouteLoadShowTimer]);

    const routeLoadBarStyle = useMemo<CSSProperties>(() => {
        const progress = Math.max(0, Math.min(routeLoadProgress, 1));
        const scaledProgress = routeLoadVisible ? Math.max(progress, 0.04) : progress;
        const opacity = routeLoadVisible ? 0.15 + progress * 0.85 : 0;
        const blueWeight = progress;
        const glowOpacity = 0.14 + blueWeight * 0.5;
        const glowSize = 4 + blueWeight * 16;
        const leftBlue = Math.round(112 + blueWeight * 28);
        const leftAlpha = 0.28 + blueWeight * 0.22;
        const midBlue = Math.round(166 + blueWeight * 34);
        const midAlpha = 0.56 + blueWeight * 0.26;
        const rightBlue = Math.round(226 + blueWeight * 29);
        const rightAlpha = 0.82 + blueWeight * 0.18;

        return {
            transform: `scaleX(${scaledProgress})`,
            opacity,
            filter: `saturate(${1 + blueWeight * 0.62})`,
            boxShadow: `0 0 ${glowSize}px rgba(0, 122, 255, ${glowOpacity})`,
            ["--route-load-left" as never]: `rgba(122, 132, ${leftBlue}, ${leftAlpha})`,
            ["--route-load-mid" as never]: `rgba(72, 152, ${midBlue}, ${midAlpha})`,
            ["--route-load-right" as never]: `rgba(22, 122, ${rightBlue}, ${rightAlpha})`,
        };
    }, [routeLoadProgress, routeLoadVisible]);

    const messages = useMemo(() => PORTAL_MESSAGES[currentLanguage], [currentLanguage]);
    const searchCopy = useMemo(() => SEARCH_COPY[currentLanguage], [currentLanguage]);
    const unsavedCopy = useMemo(() => UNSAVED_ACTION_COPY[currentLanguage] ?? UNSAVED_ACTION_COPY.en, [currentLanguage]);
    const productCreatePendingCopy = useMemo(
        () => PRODUCT_CREATE_PENDING_COPY[currentLanguage] ?? PRODUCT_CREATE_PENDING_COPY.en,
        [currentLanguage]
    );
    const inventoryCreatePendingCopy = useMemo(
        () => INVENTORY_CREATE_PENDING_COPY[currentLanguage] ?? INVENTORY_CREATE_PENDING_COPY.en,
        [currentLanguage]
    );
    const categoryCreatePendingCopy = useMemo(
        () => CATEGORY_CREATE_PENDING_COPY[currentLanguage] ?? CATEGORY_CREATE_PENDING_COPY.en,
        [currentLanguage]
    );
    const categoryEditPendingCopy = useMemo(
        () => CATEGORY_EDIT_PENDING_COPY[currentLanguage] ?? CATEGORY_EDIT_PENDING_COPY.en,
        [currentLanguage]
    );
    const productEditPendingCopy = useMemo(
        () => PRODUCT_EDIT_PENDING_COPY[currentLanguage] ?? PRODUCT_EDIT_PENDING_COPY.en,
        [currentLanguage]
    );
    const purchaseOrderCreatePendingCopy = useMemo(
        () => PURCHASE_ORDER_CREATE_PENDING_COPY[currentLanguage] ?? PURCHASE_ORDER_CREATE_PENDING_COPY.en,
        [currentLanguage]
    );
    const purchaseOrderEditPendingCopy = useMemo(
        () => PURCHASE_ORDER_EDIT_PENDING_COPY[currentLanguage] ?? PURCHASE_ORDER_EDIT_PENDING_COPY.en,
        [currentLanguage]
    );
    const isCategoryCreatePending = pendingChangesScope === "productCreate" && isCategoryCreateRoute;
    const isInventoryCreatePending = pendingChangesScope === "productCreate" && isInventoryCreateRoute;
    const isCategoryEditPending = pendingChangesScope === "productCreate" && isCategoryEditRoute;
    const isProductEditPending = pendingChangesScope === "productCreate" && (isProductEditRoute || isInventoryDetailRoute);
    const isPurchaseOrderCreatePending = pendingChangesScope === "productCreate" && isPurchaseOrderCreateRoute;
    const isPurchaseOrderEditPending = pendingChangesScope === "productCreate" && isPurchaseOrderEditRoute;
    const pendingDiscardLabel = pendingDiscardLabelVariant === "cancel" ? unsavedCopy.cancel : unsavedCopy.discard;
    const pendingSearchLabel = pendingChangesScope === "productCreate"
        ? (
            isCategoryCreatePending
                ? categoryCreatePendingCopy.label
                : isInventoryCreatePending
                    ? inventoryCreatePendingCopy.label
                : isPurchaseOrderCreatePending
                    ? purchaseOrderCreatePendingCopy.label
                : isPurchaseOrderEditPending
                    ? purchaseOrderEditPendingCopy.label
                : isCategoryEditPending
                    ? categoryEditPendingCopy.label
                    : isProductEditPending
                        ? productEditPendingCopy.label
                        : productCreatePendingCopy.label
        )
        : unsavedCopy.label;
    const pendingSaveLabel = pendingChangesScope === "productCreate"
        ? (
            isCategoryCreatePending
                ? categoryCreatePendingCopy.save
                : isInventoryCreatePending
                    ? inventoryCreatePendingCopy.save
                : isPurchaseOrderCreatePending
                    ? purchaseOrderCreatePendingCopy.save
                : isPurchaseOrderEditPending
                    ? purchaseOrderEditPendingCopy.save
                : isCategoryEditPending
                    ? categoryEditPendingCopy.save
                    : isProductEditPending
                        ? productEditPendingCopy.save
                        : productCreatePendingCopy.save
        )
        : unsavedCopy.save;
    const pendingDiscardActionLabel = pendingChangesScope === "productCreate"
        ? (
            isCategoryCreatePending
                ? categoryCreatePendingCopy.cancel
                : isInventoryCreatePending
                    ? inventoryCreatePendingCopy.cancel
                : isPurchaseOrderCreatePending
                    ? purchaseOrderCreatePendingCopy.cancel
                : isPurchaseOrderEditPending
                    ? purchaseOrderEditPendingCopy.cancel
                : isCategoryEditPending
                    ? categoryEditPendingCopy.cancel
                    : isProductEditPending
                        ? productEditPendingCopy.cancel
                        : productCreatePendingCopy.cancel
        )
        : pendingDiscardLabel;

    const i18nValue = useMemo(
        () => ({ language: currentLanguage, currency, storeCurrency, messages, setLanguage: setCurrentLanguage }),
        [currentLanguage, currency, storeCurrency, messages]
    );

    const normalizedDashboardWidgetSearchQuery = useMemo(
        () => normalizeSearchText(dashboardWidgetSearchQuery),
        [dashboardWidgetSearchQuery]
    );

    const dashboardWidgetMenuGroups = useMemo(() => {
        const groups = new Map<string, DashboardWidgetMenuEventDetail["items"]>();

        for (const item of dashboardWidgetMenuState.items) {
            if (normalizedDashboardWidgetSearchQuery) {
                const widgetSearchText = normalizeSearchText(`${item.title} ${item.category}`);
                if (!widgetSearchText.includes(normalizedDashboardWidgetSearchQuery)) continue;
            }

            const category = item.category.trim() || "Other";
            const categoryItems = groups.get(category);
            if (categoryItems) {
                categoryItems.push(item);
            } else {
                groups.set(category, [item]);
            }
        }

        return Array.from(groups.entries())
            .sort(([leftCategory], [rightCategory]) => leftCategory.localeCompare(rightCategory, undefined, { sensitivity: "base" }))
            .map(([category, items]) => ({
                category,
                items: [...items].sort((leftItem, rightItem) => leftItem.title.localeCompare(rightItem.title, undefined, { sensitivity: "base" })),
            }));
    }, [dashboardWidgetMenuState.items, normalizedDashboardWidgetSearchQuery]);

    const dashboardWidgetMenuItemCount = useMemo(
        () => dashboardWidgetMenuGroups.reduce((total, group) => total + group.items.length, 0),
        [dashboardWidgetMenuGroups]
    );
    const assistantIsAvailable = featureFlags.assistant && pendingChangesScope === null;
    const assistantIsVisible = assistantIsAvailable && assistantOpen;
    const activeAssistantConversation = useMemo(
        () => assistantConversations.find((conversation) => conversation.id === assistantActiveConversationId) ?? assistantConversations[0] ?? null,
        [assistantActiveConversationId, assistantConversations]
    );
    const normalizedAssistantConversationSearchQuery = useMemo(
        () => normalizeSearchText(assistantConversationSearchQuery),
        [assistantConversationSearchQuery]
    );
    const filteredAssistantConversations = useMemo(() => {
        const candidates = normalizedAssistantConversationSearchQuery
            ? assistantConversations.filter((conversation) => (
                normalizeSearchText(conversation.title).includes(normalizedAssistantConversationSearchQuery)
            ))
            : assistantConversations;

        return [...candidates].sort((left, right) => {
            if (left.updatedAt !== right.updatedAt) return right.updatedAt - left.updatedAt;
            return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
        });
    }, [assistantConversations, normalizedAssistantConversationSearchQuery]);

    const assistantConversationCountLabel = useMemo(() => {
        if (!assistantMemoryEnabled) return "Memory off";
        if (assistantConversations.length === 1) return "1 conversation";
        return `${assistantConversations.length} conversations`;
    }, [assistantConversations.length, assistantMemoryEnabled]);

    const activeAssistantConversationLabel = activeAssistantConversation?.title || "New conversation";

    const pageSearchBaseItems = useMemo<SearchItem[]>(() => {
        const enabledPages = SEARCH_PAGE_DEFINITIONS.filter((definition) => (
            isSearchPageEnabled(definition.id, featureFlags)
        ));

        return enabledPages.map((definition) => {
            const title = resolveSearchPageTitle(definition, messages);
            const description = searchCopy.pageDescriptions[definition.id] ?? definition.description;
            const baseText = [title, description, ...definition.keywords].join(" ");
            return {
                id: `page:${definition.id}`,
                type: "page",
                title,
                description,
                icon: definition.icon,
                href: definition.href,
                content: `${title}. ${description}`,
                searchText: normalizeSearchText(baseText),
            };
        });
    }, [featureFlags, messages, searchCopy]);

    const settingSearchItems = useMemo<SearchItem[]>(() => {
        const activeThemeLabel = messages.themeValues[themePreference];

        return [
            {
                id: "setting:open-settings",
                type: "setting",
                title: messages.nav.settings,
                description: searchCopy.settingOpenDescription,
                icon: "settings",
                action: "open-settings",
                content: searchCopy.settingOpenContent,
                searchText: normalizeSearchText(
                    `${searchCopy.settingOpenKeywords} ${messages.nav.settings}`
                ),
            },
            {
                id: "setting:theme-system",
                type: "setting",
                title: `${messages.menu.theme}: ${messages.themeValues.system}`,
                description:
                    themePreference === "system"
                        ? formatSearchTemplate(searchCopy.themeSystemCurrent, { theme: activeThemeLabel })
                        : searchCopy.themeSystemDefault,
                icon: "settings",
                action: "theme-system",
                content: `${messages.menu.theme}: ${messages.themeValues.system}`,
                searchText: normalizeSearchText(searchCopy.themeSystemKeywords),
            },
            {
                id: "setting:theme-light",
                type: "setting",
                title: `${messages.menu.theme}: ${messages.themeValues.light}`,
                description: themePreference === "light" ? searchCopy.themeLightCurrent : searchCopy.themeLightDefault,
                icon: "settings",
                action: "theme-light",
                content: `${messages.menu.theme}: ${messages.themeValues.light}`,
                searchText: normalizeSearchText(searchCopy.themeLightKeywords),
            },
            {
                id: "setting:theme-dark",
                type: "setting",
                title: `${messages.menu.theme}: ${messages.themeValues.dark}`,
                description: themePreference === "dark" ? searchCopy.themeDarkCurrent : searchCopy.themeDarkDefault,
                icon: "settings",
                action: "theme-dark",
                content: `${messages.menu.theme}: ${messages.themeValues.dark}`,
                searchText: normalizeSearchText(searchCopy.themeDarkKeywords),
            },
        ];
    }, [messages, searchCopy, themePreference]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mapDebugItem = (item: SearchItem): SearchDebugItem => ({
            id: item.id,
            type: item.type,
            title: item.title,
            href: item.href,
            action: item.action,
            chunks: splitSearchContentIntoChunks(item.content),
        });

        const payload: SearchDebugPayload = {
            generatedAt: new Date().toISOString(),
            language: currentLanguage,
            includeSelector: SEARCH_CONTENT_SELECTOR,
            ignoreSelector: SEARCH_CONTENT_IGNORE_SELECTOR,
            rootSelectors: SEARCH_CONTENT_ROOT_SELECTORS,
            pages: pageSearchItems.map(mapDebugItem),
            settings: settingSearchItems.map(mapDebugItem),
        };

        const debugWindow = window as Window & {
            __veloroSearchDebug?: SearchDebugPayload;
            __veloroPrintSearchDebug?: () => void;
        };

        debugWindow.__veloroSearchDebug = payload;
        debugWindow.__veloroPrintSearchDebug = () => {
            // Browser-console helper for quick curation of what is indexed.
            console.log("Veloro Search Debug", payload);
        };
    }, [currentLanguage, pageSearchItems, settingSearchItems]);

    const searchItemsById = useMemo(() => {
        const map = new Map<string, SearchItem>();
        for (const item of [...pageSearchItems, ...settingSearchItems]) {
            map.set(item.id, item);
        }
        return map;
    }, [pageSearchItems, settingSearchItems]);

    const featuredSearchItems = useMemo(() => {
        return pageSearchItems.filter((item) => {
            const pageId = parseSearchPageId(item.id);
            return pageId ? SEARCH_FEATURED_IDS.has(pageId) : false;
        });
    }, [pageSearchItems]);

    const recentSearchItems = useMemo(() => {
        return recentSearchIds
            .map((id) => searchItemsById.get(id))
            .filter((item): item is SearchItem => Boolean(item));
    }, [recentSearchIds, searchItemsById]);

    const initials = useMemo(() => {
        const source = (user.name?.trim() || user.employeeId).replace(/[^a-zA-Z0-9 ]/g, " ").trim();
        const words = source.split(/\s+/).filter(Boolean);
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();

        const raw = source.replace(/\s+/g, "");
        if (!raw) return "U";
        return raw.slice(0, 2).toUpperCase();
    }, [user.employeeId, user.name]);

    const displayName = useMemo(() => user.name?.trim() || user.employeeId, [user.employeeId, user.name]);
    const canSwitchStores = stores.length > 1;
    const currentStore = useMemo(() => {
        if (stores.length === 0) return null;
        return stores.find((store) => store.id === currentStoreId) ?? stores[0];
    }, [currentStoreId, stores]);

    useEffect(() => {
        setOpenSubmenuHrefs(activeParentHref ? [activeParentHref] : []);
    }, [activeParentHref, pathname]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!isSettingsRoute && pathname !== "/login" && pathname !== "/password-reset") {
            window.sessionStorage.setItem(LAST_NON_SETTINGS_PATH_STORAGE_KEY, pathname);
        }
    }, [isSettingsRoute, pathname]);

    useEffect(() => {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchActiveIndex(0);
        setSearchKeyboardNavigation(false);
        setOpenPopover(null);
        setAssistantConversationMenuOpen(false);
        setAssistantConversationSearchQuery("");
        setMobileNavOpen(false);
        setFeedbackStep("select");
        setFeedbackKind(null);
        setFeedbackText("");
        setFeedbackError(null);
        setStoreUpdateError(null);
    }, [pathname]);

    useEffect(() => {
        if (featureFlags.assistant) return;
        setAssistantOpen(false);
        setAssistantConversationMenuOpen(false);
        setAssistantConversationSearchQuery("");
    }, [featureFlags.assistant]);

    useEffect(() => {
        if (featureFlags.notifications) return;
        setOpenPopover((current) => (current === "notifications" ? null : current));
    }, [featureFlags.notifications]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const panelRaw = window.sessionStorage.getItem(ASSISTANT_PANEL_STATE_STORAGE_KEY);
        if (panelRaw) {
            try {
                const panel = JSON.parse(panelRaw) as { open?: unknown; fullWidth?: unknown };
                setAssistantOpen(Boolean(panel.open));
                setAssistantFullWidth(Boolean(panel.fullWidth));
            } catch {
                setAssistantOpen(false);
                setAssistantFullWidth(false);
            }
        }

        setAssistantMemoryEnabled(window.localStorage.getItem(ASSISTANT_MEMORY_STORAGE_KEY) === "1");

        const storedConversations = parseAssistantConversations(window.localStorage.getItem(ASSISTANT_CONVERSATIONS_STORAGE_KEY));
        if (storedConversations.length > 0) {
            setAssistantConversations(storedConversations);
            const storedConversationId = window.localStorage.getItem(ASSISTANT_ACTIVE_CONVERSATION_STORAGE_KEY);
            if (storedConversationId && storedConversations.some((entry) => entry.id === storedConversationId)) {
                setAssistantActiveConversationId(storedConversationId);
            } else {
                setAssistantActiveConversationId(storedConversations[0].id);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        window.sessionStorage.setItem(
            ASSISTANT_PANEL_STATE_STORAGE_KEY,
            JSON.stringify({ open: assistantOpen, fullWidth: assistantFullWidth })
        );
    }, [assistantFullWidth, assistantOpen]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        window.localStorage.setItem(ASSISTANT_MEMORY_STORAGE_KEY, assistantMemoryEnabled ? "1" : "0");
    }, [assistantMemoryEnabled]);

    useEffect(() => {
        if (assistantConversations.length === 0) {
            const created = createAssistantConversation();
            setAssistantConversations([created]);
            setAssistantActiveConversationId(created.id);
            return;
        }

        if (!assistantConversations.some((entry) => entry.id === assistantActiveConversationId)) {
            setAssistantActiveConversationId(assistantConversations[0].id);
        }
    }, [assistantActiveConversationId, assistantConversations]);

    useEffect(() => {
        if (!assistantMemoryEnabled) return;
        if (typeof window === "undefined") return;

        window.localStorage.setItem(ASSISTANT_CONVERSATIONS_STORAGE_KEY, JSON.stringify(assistantConversations));
        window.localStorage.setItem(ASSISTANT_ACTIVE_CONVERSATION_STORAGE_KEY, assistantActiveConversationId);
    }, [assistantActiveConversationId, assistantConversations, assistantMemoryEnabled]);

    useEffect(() => {
        if (pendingChangesScope === null) return;
        setAssistantOpen(false);
        setAssistantFullWidth(false);
        setAssistantConversationMenuOpen(false);
        setAssistantConversationSearchQuery("");
    }, [pendingChangesScope]);

    useEffect(() => {
        if (assistantOpen) return;
        setAssistantConversationMenuOpen(false);
        setAssistantConversationSearchQuery("");
    }, [assistantOpen]);

    const applyThemePreference = useCallback((preference: ThemePreference) => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;

        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        root.style.colorScheme = resolved;
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedRaw = window.localStorage.getItem(THEME_STORAGE_KEY);
        const stored: ThemePreference = isThemePreference(storedRaw) ? storedRaw : "system";

        themePrefRef.current = stored;
        setThemePreference(stored);
        applyThemePreference(stored);

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onMediaChange = () => {
            if (themePrefRef.current === "system") applyThemePreference("system");
        };

        media.addEventListener("change", onMediaChange);
        return () => media.removeEventListener("change", onMediaChange);
    }, [applyThemePreference]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const raw = window.localStorage.getItem(SEARCH_RECENT_STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) return;

            const ids = parsed.filter((value): value is string => typeof value === "string");
            setRecentSearchIds(ids.slice(0, MAX_RECENT_SEARCHES));
        } catch {
            setRecentSearchIds([]);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(SEARCH_RECENT_STORAGE_KEY, JSON.stringify(recentSearchIds));
    }, [recentSearchIds]);

    useEffect(() => {
        let cancelled = false;
        setPageSearchItems(pageSearchBaseItems);
        setSearchIndexing(false);

        const storageKey = getSearchIndexCacheKey(currentLanguage);
        const cachedContent = parseSearchIndexCache(window.localStorage.getItem(storageKey), currentLanguage);
        const hasCachedContent = Boolean(cachedContent);

        if (cachedContent) {
            setPageSearchItems(applySearchIndexContent(pageSearchBaseItems, cachedContent));
        }

        if (!hasCachedContent) {
            setSearchIndexing(true);
        }

        void (async () => {
            try {
                const response = await fetch(`/api/search/index?language=${encodeURIComponent(currentLanguage)}`, {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store",
                });

                if (!response.ok) throw new Error("Search index API fetch failed.");

                const rawPayload = await response.json().catch(() => null);
                if (!rawPayload || typeof rawPayload !== "object") {
                    throw new Error("Invalid search index payload.");
                }

                const payload = rawPayload as Partial<SearchIndexCachePayload> & { contentById?: unknown; createdAt?: unknown };
                if (!payload.contentById || typeof payload.contentById !== "object") {
                    throw new Error("Invalid search index content payload.");
                }

                const indexedContentById: Record<string, string> = {};
                for (const [id, content] of Object.entries(payload.contentById)) {
                    if (typeof content === "string" && content.trim().length > 0) {
                        indexedContentById[id] = content.slice(0, 7000);
                    }
                }

                if (cancelled) return;

                setPageSearchItems(applySearchIndexContent(pageSearchBaseItems, indexedContentById));

                const cachePayload: SearchIndexCachePayload = {
                    version: SEARCH_INDEX_CACHE_VERSION,
                    language: currentLanguage,
                    createdAt: typeof payload.createdAt === "number" ? payload.createdAt : Date.now(),
                    contentById: indexedContentById,
                };
                try {
                    window.localStorage.setItem(storageKey, JSON.stringify(cachePayload));
                } catch {
                    // Ignore quota/storage errors; search still works with in-memory index.
                }
            } catch {
                if (cancelled) return;
                if (!hasCachedContent) {
                    setPageSearchItems(pageSearchBaseItems);
                }
            } finally {
                if (!cancelled) setSearchIndexing(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentLanguage, pageSearchBaseItems]);

    useEffect(() => {
        if (!searchOpen) return;
        let frameA = 0;
        let frameB = 0;
        const focusSearchInput = () => {
            const input = searchInputRef.current;
            if (!input) return;
            input.focus();
            const cursor = input.value.length;
            input.setSelectionRange(cursor, cursor);
        };

        frameA = window.requestAnimationFrame(() => {
            focusSearchInput();
            frameB = window.requestAnimationFrame(focusSearchInput);
        });
        const timeout = window.setTimeout(focusSearchInput, 80);

        return () => {
            window.cancelAnimationFrame(frameA);
            window.cancelAnimationFrame(frameB);
            window.clearTimeout(timeout);
        };
    }, [searchOpen]);

    useEffect(() => {
        function onGlobalSearchToggle(event: KeyboardEvent) {
            const pressedK = event.key.toLowerCase() === "k";
            if ((event.metaKey || event.ctrlKey) && pressedK) {
                if (hasBlockingPendingChanges) {
                    event.preventDefault();
                    triggerBlockingPendingShake();
                    return;
                }
                event.preventDefault();
                setOpenPopover(null);
                setSearchOpen((open) => {
                    const next = !open;
                    setSearchQuery("");
                    setSearchActiveIndex(0);
                    setSearchKeyboardNavigation(false);
                    return next;
                });
                return;
            }

            if (event.key === "Escape" && searchOpen) {
                event.preventDefault();
                setSearchOpen(false);
                setSearchQuery("");
                setSearchActiveIndex(0);
                setSearchKeyboardNavigation(false);
            }
        }

        document.addEventListener("keydown", onGlobalSearchToggle);
        return () => document.removeEventListener("keydown", onGlobalSearchToggle);
    }, [hasBlockingPendingChanges, searchOpen, triggerBlockingPendingShake]);

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (!headerActionsRef.current) return;
            if (!headerActionsRef.current.contains(e.target as Node)) setOpenPopover(null);
        }
        if (openPopover) document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [openPopover]);

    useEffect(() => {
        if (!assistantConversationMenuOpen) return;

        function onDown(event: MouseEvent) {
            const target = event.target as Node;
            if (assistantConversationMenuRef.current?.contains(target)) return;
            if (assistantConversationButtonRef.current?.contains(target)) return;
            setAssistantConversationMenuOpen(false);
        }

        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [assistantConversationMenuOpen]);

    useEffect(() => {
        function onEscape(e: KeyboardEvent) {
            if (e.key !== "Escape") return;
            setOpenPopover(null);
            setAssistantConversationMenuOpen(false);
            setMobileNavOpen(false);
        }

        if (openPopover || mobileNavOpen || assistantConversationMenuOpen) {
            document.addEventListener("keydown", onEscape);
        }
        return () => document.removeEventListener("keydown", onEscape);
    }, [assistantConversationMenuOpen, mobileNavOpen, openPopover]);

    useEffect(() => {
        if (!isMobileViewport || !mobileNavOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileViewport, mobileNavOpen]);

    useEffect(() => {
        if (openPopover !== "feedback" || feedbackStep !== "compose") return;
        const frame = window.requestAnimationFrame(() => {
            feedbackTextRef.current?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [feedbackStep, openPopover]);

    const checkSystemHealth = useCallback(async () => {
        try {
            const res = await fetch("/api/system/health", { method: "GET", cache: "no-store" });
            if (!res.ok) throw new Error("Health endpoint failed");

            const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
            setSystemStatus(data?.ok ? "operational" : "error");
        } catch {
            setSystemStatus("error");
        }
    }, []);

    useEffect(() => {
        void checkSystemHealth();

        const id = window.setInterval(() => {
            void checkSystemHealth();
        }, 120000);

        return () => window.clearInterval(id);
    }, [checkSystemHealth]);

    async function onSignOut() {
        if (signingOut) return;
        setSigningOut(true);

        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            setSigningOut(false);
            setOpenPopover(null);
            startRouteTransitionLoad("/login");
            router.replace("/login");
            router.refresh();
        }
    }

    const resetFeedbackComposer = useCallback(() => {
        setFeedbackStep("select");
        setFeedbackKind(null);
        setFeedbackText("");
        setFeedbackError(null);
    }, []);

    function togglePopover(target: Exclude<HeaderPopoverId, null>) {
        if (target === "notifications" && !featureFlags.notifications) {
            return;
        }

        setOpenPopover((current) => {
            if (current === target) return null;
            if (target === "feedback") {
                resetFeedbackComposer();
            }
            return target;
        });
    }

    function onSelectFeedbackKind(next: FeedbackKindValue) {
        setFeedbackKind(next);
        setFeedbackStep("compose");
        setFeedbackError(null);
    }

    async function onSubmitFeedback() {
        if (!feedbackKind || feedbackSending) return;
        const message = feedbackText.trim();
        if (message.length < 8) {
            setFeedbackError("Please provide a bit more detail before sending.");
            return;
        }

        setFeedbackSending(true);
        setFeedbackError(null);

        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    kind: feedbackKind,
                    pagePath: pathname,
                    message,
                }),
            });

            const rawBody = await res.text();
            let payload: { ok?: boolean; message?: string } | null = null;
            try {
                payload = (rawBody ? JSON.parse(rawBody) : null) as { ok?: boolean; message?: string } | null;
            } catch {
                payload = null;
            }
            if (!res.ok || !payload?.ok) {
                throw new Error(payload?.message || `Unable to send feedback right now (HTTP ${res.status}).`);
            }

            setFeedbackStep("success");
            setFeedbackText("");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to send feedback right now.";
            setFeedbackError(message);
        } finally {
            setFeedbackSending(false);
        }
    }

    const onSetTheme = useCallback(
        (next: ThemePreference) => {
            themePrefRef.current = next;
            setThemePreference(next);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(THEME_STORAGE_KEY, next);
            }
            applyThemePreference(next);
        },
        [applyThemePreference]
    );

    function onToggleTheme() {
        onSetTheme(nextTheme(themePrefRef.current));
    }

    async function onSelectStore(nextStoreId: string) {
        if (!nextStoreId || updatingStoreId) return;
        if (nextStoreId === currentStoreId) return;
        if (!canSwitchStores) return;

        const previousStoreId = currentStoreId;
        setStoreUpdateError(null);
        setCurrentStoreId(nextStoreId);
        setUpdatingStoreId(nextStoreId);

        try {
            const res = await fetch("/api/user/stores/select", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ storeId: nextStoreId }),
            });

            const payload = (await res.json().catch(() => null)) as
                | { ok?: boolean; message?: string; activeStoreId?: string }
                | null;

            if (!res.ok || !payload?.ok || typeof payload.activeStoreId !== "string") {
                throw new Error(payload?.message || "Unable to switch store right now.");
            }

            setCurrentStoreId(payload.activeStoreId);
            router.refresh();
        } catch (error: unknown) {
            setCurrentStoreId(previousStoreId);
            setStoreUpdateError(error instanceof Error ? error.message : "Unable to switch store right now.");
        } finally {
            setUpdatingStoreId(null);
        }
    }

    const normalizedSearchQuery = normalizeSearchText(searchQuery);

    const pageSearchResults = useMemo(() => {
        if (!normalizedSearchQuery) return [];

        return pageSearchItems
            .filter((item) => item.searchText.includes(normalizedSearchQuery))
            .sort((a, b) => scoreSearchItem(b, normalizedSearchQuery) - scoreSearchItem(a, normalizedSearchQuery))
            .slice(0, 12);
    }, [normalizedSearchQuery, pageSearchItems]);

    const settingSearchResults = useMemo(() => {
        if (!normalizedSearchQuery) return [];

        return settingSearchItems
            .filter((item) => item.searchText.includes(normalizedSearchQuery))
            .sort((a, b) => scoreSearchItem(b, normalizedSearchQuery) - scoreSearchItem(a, normalizedSearchQuery))
            .slice(0, 6);
    }, [normalizedSearchQuery, settingSearchItems]);

    const featuredWithoutRecent = useMemo(() => {
        const recentIds = new Set(recentSearchItems.map((item) => item.id));
        return featuredSearchItems.filter((item) => !recentIds.has(item.id)).slice(0, 4);
    }, [featuredSearchItems, recentSearchItems]);

    const visibleSearchItems = useMemo(() => {
        if (normalizedSearchQuery) return [...pageSearchResults, ...settingSearchResults];
        return [...recentSearchItems, ...featuredWithoutRecent];
    }, [featuredWithoutRecent, normalizedSearchQuery, pageSearchResults, recentSearchItems, settingSearchResults]);

    const searchItemIndexById = useMemo(() => {
        const indexMap = new Map<string, number>();
        visibleSearchItems.forEach((item, index) => {
            indexMap.set(item.id, index);
        });
        return indexMap;
    }, [visibleSearchItems]);

    const activeSearchItem = visibleSearchItems[searchActiveIndex] ?? null;

    useEffect(() => {
        if (visibleSearchItems.length === 0) {
            setSearchActiveIndex(0);
            return;
        }
        setSearchActiveIndex((current) => Math.min(current, visibleSearchItems.length - 1));
    }, [visibleSearchItems.length]);

    const closeSearch = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchActiveIndex(0);
        setSearchKeyboardNavigation(false);
    }, []);

    const openSearch = useCallback(() => {
        if (hasBlockingPendingChanges) {
            triggerBlockingPendingShake();
            return;
        }
        setOpenPopover(null);
        setMobileNavOpen(false);
        setSearchOpen(true);
        setSearchQuery("");
        setSearchActiveIndex(0);
        setSearchKeyboardNavigation(false);
        window.requestAnimationFrame(() => {
            searchInputRef.current?.focus();
        });
    }, [hasBlockingPendingChanges, triggerBlockingPendingShake]);

    const rememberSearchSelection = useCallback((itemId: string) => {
        setRecentSearchIds((current) => {
            const next = [itemId, ...current.filter((id) => id !== itemId)].slice(0, MAX_RECENT_SEARCHES);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(SEARCH_RECENT_STORAGE_KEY, JSON.stringify(next));
            }
            return next;
        });
    }, []);

    const executeSearchItem = useCallback(
        (item: SearchItem) => {
            rememberSearchSelection(item.id);

            if (item.type === "page" && item.href) {
                closeSearch();
                void navigateTo(item.href);
                return;
            }

            if (item.action === "open-settings") {
                closeSearch();
                void navigateTo("/settings");
                return;
            }

            if (item.action === "theme-system") {
                onSetTheme("system");
                closeSearch();
                return;
            }

            if (item.action === "theme-light") {
                onSetTheme("light");
                closeSearch();
                return;
            }

            if (item.action === "theme-dark") {
                onSetTheme("dark");
                closeSearch();
            }
        },
        [closeSearch, navigateTo, onSetTheme, rememberSearchSelection]
    );

    const onSearchInputKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (visibleSearchItems.length === 0) return;
                setSearchKeyboardNavigation(true);
                setSearchActiveIndex((current) => (current + 1) % visibleSearchItems.length);
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (visibleSearchItems.length === 0) return;
                setSearchKeyboardNavigation(true);
                setSearchActiveIndex((current) => (current - 1 + visibleSearchItems.length) % visibleSearchItems.length);
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                if (!activeSearchItem) return;
                executeSearchItem(activeSearchItem);
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
            }
        },
        [activeSearchItem, closeSearch, executeSearchItem, visibleSearchItems.length]
    );

    const renderHighlightedText = useCallback((text: string, query: string) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) return text;

        const parts = text.split(new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig"));
        if (parts.length === 1) return text;

        return parts.map((part, index) => (
            index % 2 === 1
                ? (
                    <mark key={`m-${index}-${part}`} className="portalSearchMark__P2k7R5">
                        {part}
                    </mark>
                )
                : (
                    <span key={`t-${index}-${part}`}>{part}</span>
                )
        ));
    }, []);

    const showNoSearchResults = normalizedSearchQuery.length > 0
        && !searchIndexing
        && pageSearchResults.length === 0
        && settingSearchResults.length === 0;

    const mapSearchItemsToDisplay = useCallback(
        (items: SearchItem[]): PortalSearchDisplayItem[] => {
            return items.map((item) => ({
                id: item.id,
                icon: item.icon,
                title: item.title,
                snippet: buildSearchSnippet(item.content, searchQuery, item.description),
            }));
        },
        [searchQuery]
    );

    const searchSections = useMemo<PortalSearchDisplaySection[]>(() => {
        if (!normalizedSearchQuery) {
            const sections: PortalSearchDisplaySection[] = [];
            if (recentSearchItems.length > 0) {
                sections.push({
                    id: "recent",
                    title: searchCopy.sections.recent,
                    items: mapSearchItemsToDisplay(recentSearchItems),
                });
            }

            if (featuredWithoutRecent.length > 0) {
                sections.push({
                    id: "suggested",
                    title: searchCopy.sections.suggested,
                    items: mapSearchItemsToDisplay(featuredWithoutRecent),
                });
            }

            return sections;
        }

        const sections: PortalSearchDisplaySection[] = [];
        if (pageSearchResults.length > 0) {
            sections.push({
                id: "results",
                title: searchCopy.sections.results,
                items: mapSearchItemsToDisplay(pageSearchResults),
            });
        }

        if (settingSearchResults.length > 0) {
            sections.push({
                id: "actions",
                title: searchCopy.sections.actions,
                items: mapSearchItemsToDisplay(settingSearchResults),
            });
        }

        return sections;
    }, [
        featuredWithoutRecent,
        mapSearchItemsToDisplay,
        normalizedSearchQuery,
        pageSearchResults,
        recentSearchItems,
        searchCopy,
        settingSearchResults,
    ]);

    const emptySearchLabel = useMemo(() => {
        if (showNoSearchResults) return formatSearchTemplate(searchCopy.noResults, { query: searchQuery.trim() });
        if (!normalizedSearchQuery && searchSections.length === 0) return searchCopy.emptyHistory;
        return null;
    }, [normalizedSearchQuery, searchCopy, searchQuery, searchSections.length, showNoSearchResults]);

    const onSearchItemSelect = useCallback(
        (itemId: string) => {
            const item = searchItemsById.get(itemId);
            if (!item) return;
            executeSearchItem(item);
        },
        [executeSearchItem, searchItemsById]
    );

    const onSearchItemHover = useCallback(
        (itemId: string) => {
            const itemIndex = searchItemIndexById.get(itemId);
            if (itemIndex === undefined) return;
            setSearchKeyboardNavigation(false);
            setSearchActiveIndex(itemIndex);
        },
        [searchItemIndexById]
    );

    const onSearchItemFocus = useCallback(
        (itemId: string) => {
            const itemIndex = searchItemIndexById.get(itemId);
            if (itemIndex === undefined) return;
            setSearchActiveIndex(itemIndex);
        },
        [searchItemIndexById]
    );

    const onSidebarLinkClick = useCallback(
        (event: ReactMouseEvent<HTMLAnchorElement>) => {
            if (hasBlockingPendingChanges) {
                event.preventDefault();
                triggerBlockingPendingShake();
                return;
            }

            if (
                event.currentTarget.target !== "_blank"
                && event.button === 0
                && !event.metaKey
                && !event.ctrlKey
                && !event.shiftKey
                && !event.altKey
            ) {
                event.preventDefault();
                void navigateTo(event.currentTarget.href);
            }
            setMobileNavOpen(false);
        },
        [hasBlockingPendingChanges, navigateTo, triggerBlockingPendingShake]
    );

    const toggleAssistantPanel = useCallback(() => {
        if (!assistantIsAvailable) return;
        setOpenPopover(null);
        setAssistantConversationMenuOpen(false);
        setAssistantConversationSearchQuery("");
        setAssistantOpen((current) => !current);
    }, [assistantIsAvailable]);

    const toggleAssistantFullWidth = useCallback(() => {
        setAssistantFullWidth((current) => !current);
    }, []);

    const toggleAssistantMemory = useCallback(() => {
        if (!ASSISTANT_CHAT_ENABLED) return;
        setAssistantMemoryEnabled((current) => !current);
    }, []);

    const createNewAssistantConversation = useCallback(() => {
        if (!ASSISTANT_CHAT_ENABLED) return;
        const nextConversation = createAssistantConversation();
        setAssistantConversations((current) => [nextConversation, ...current]);
        setAssistantActiveConversationId(nextConversation.id);
        setAssistantConversationSearchQuery("");
    }, []);

    const selectAssistantConversation = useCallback((conversationId: string) => {
        setAssistantActiveConversationId(conversationId);
        setAssistantConversationMenuOpen(false);
    }, []);

    const renameAssistantConversation = useCallback((conversationId: string) => {
        if (!ASSISTANT_CHAT_ENABLED) return;
        const targetConversation = assistantConversations.find((entry) => entry.id === conversationId);
        if (!targetConversation) return;

        const nextName = window.prompt("Rename conversation", targetConversation.title)?.trim();
        if (!nextName) return;

        setAssistantConversations((current) => current.map((entry) => (
            entry.id === conversationId
                ? { ...entry, title: nextName }
                : entry
        )));
    }, [assistantConversations]);

    const deleteAssistantConversation = useCallback((conversationId: string) => {
        if (!ASSISTANT_CHAT_ENABLED) return;
        setAssistantConversations((current) => {
            if (current.length <= 1) return current;
            return current.filter((entry) => entry.id !== conversationId);
        });
    }, []);

    const submitAssistantPrompt = useCallback(() => {
        if (!ASSISTANT_CHAT_ENABLED) {
            notifyPortalAction({ message: "AI assistant chat is coming soon.", tone: "info" });
            return;
        }

        const nextPrompt = assistantDraft.trim();
        if (!nextPrompt) return;

        setAssistantDraft("");
        if (!assistantMemoryEnabled) return;

        setAssistantConversations((current) => {
            const now = Date.now();
            const activeId = assistantActiveConversationId;
            if (!current.some((entry) => entry.id === activeId)) {
                const created = createAssistantConversation();
                setAssistantActiveConversationId(created.id);
                return [created, ...current];
            }

            return current.map((entry) => (
                entry.id === activeId
                    ? { ...entry, updatedAt: now }
                    : entry
            ));
        });
    }, [assistantActiveConversationId, assistantDraft, assistantMemoryEnabled]);

    const onDashboardWidgetDragStart = useCallback((event: ReactDragEvent<HTMLButtonElement>, widgetId: string, widgetTitle: string, isVisible: boolean) => {
        event.dataTransfer.effectAllowed = isVisible ? "move" : "copy";
        event.dataTransfer.setData(DASHBOARD_WIDGET_DRAG_MIME, widgetId);
        event.dataTransfer.setData("text/plain", widgetId);

        if (typeof document !== "undefined") {
            document.body.dataset[DASHBOARD_WIDGET_DRAG_DATASET_KEY] = widgetId;

            const sourceRect = event.currentTarget.getBoundingClientRect();
            const dragPreview = document.createElement("div");
            dragPreview.className = "portalSidebarWidgetDragPreview__Q8m2V1";
            dragPreview.style.width = `${Math.max(140, Math.ceil(sourceRect.width))}px`;

            const title = document.createElement("span");
            title.className = "portalSidebarWidgetMenuTitle__P5m8R1";
            title.textContent = widgetTitle;

            const grip = document.createElement("span");
            grip.className = "portalSidebarWidgetMenuGrip__N8m2Q6 portalSidebarWidgetDragPreviewGrip__M8m2Q6";
            for (let index = 0; index < 6; index += 1) {
                grip.appendChild(document.createElement("span"));
            }

            dragPreview.appendChild(title);
            dragPreview.appendChild(grip);
            document.body.appendChild(dragPreview);
            event.dataTransfer.setDragImage(dragPreview, 16, Math.max(10, Math.round(sourceRect.height / 2)));
            window.setTimeout(() => {
                dragPreview.remove();
            }, 0);
        }
    }, []);

    const onDashboardWidgetDragEnd = useCallback(() => {
        if (typeof document === "undefined") return;
        delete document.body.dataset[DASHBOARD_WIDGET_DRAG_DATASET_KEY];
    }, []);

    const themeLabel = messages.themeValues[themePreference];
    const themeTooltipLabel = `${themeLabel} ${messages.menu.theme.toLowerCase()}`;
    const themeIcon = themePreference === "dark" ? <Moon aria-hidden="true" /> : themePreference === "light" ? <Sun aria-hidden="true" /> : <Monitor aria-hidden="true" />;
    const portalNavigationValue = useMemo(() => ({ navigateTo }), [navigateTo]);

    return (
        <PortalI18nProvider value={i18nValue}>
            <PortalNavigationProvider value={portalNavigationValue}>
            <div className={cn("portalShell__A1b2C3", isSettingsRoute && "portalShellSettings__K6p2T4")}>
                <header className={cn("portalHeader__R1u5J2", pendingChangesScope !== null && "portalHeaderPendingMode__B3m8Q1")}>
                    <div className={cn("portalHeaderLoadTrack__F7m2D1", routeLoadVisible && "portalHeaderLoadTrackVisible__H8n4P5")} aria-hidden="true">
                        <span className="portalHeaderLoadBar__K3m7V1" style={routeLoadBarStyle} />
                    </div>

                    <div className="portalHeaderBrand__A9c4V1" aria-hidden={pendingChangesScope !== null}>
                        <Button
                            type="button"
                            kind="toggle"
                            size="small"
                            className="portalMobileMenuButton__G4k2P8"
                            aria-label="Toggle navigation menu"
                            aria-haspopup="true"
                            aria-expanded={mobileNavOpen}
                            onClick={() => {
                                setOpenPopover(null);
                                setMobileNavOpen((current) => !current);
                            }}
                        >
                            <Menu aria-hidden="true" />
                        </Button>
                        <span className="portalHeaderLogoWrap__K9m2D6">
                            <VeloroLogo width={116} height={38} />
                        </span>
                    </div>

                    <PortalSearchTrigger
                        open={searchOpen}
                        shortcutLabel={searchShortcutLabel}
                        inputPlaceholder={searchCopy.inputPlaceholder}
                        blocked={hasBlockingPendingChanges}
                        onBlockedAttempt={triggerBlockingPendingShake}
                        pendingMode={pendingChangesScope !== null}
                        pendingLabel={pendingSearchLabel}
                        discardLabel={pendingDiscardActionLabel}
                        saveLabel={pendingSaveLabel}
                        onDiscardPending={() => dispatchPendingAction("discard")}
                        onSavePending={() => dispatchPendingAction("save")}
                        saveDisabled={pendingSaveDisabled}
                        attentionShake={searchAttentionShake}
                        attentionTint={searchAttentionTint}
                        onOpen={openSearch}
                    />

                    <div className="portalProfile__N7p3Q5" ref={headerActionsRef} aria-hidden={pendingChangesScope !== null}>
                        <div className="portalHeaderActions__K3f7P2" aria-label="Quick actions">
                            <div className="portalHeaderActionSlot__P3m8D2 portalHeaderActionSlotFeedback__N4q1R7">
                                <Button
                                    className="portalHeaderFeedbackButton__D9m1Q4"
                                    type="button"
                                    kind="toggle"
                                    size="small"
                                    aria-label="Send feedback"
                                    title="Send feedback"
                                    aria-haspopup="dialog"
                                    aria-expanded={openPopover === "feedback"}
                                    aria-pressed={openPopover === "feedback"}
                                    onClick={() => togglePopover("feedback")}
                                >
                                    <MessageSquare className="portalHeaderFeedbackIcon__M8d2Q4" aria-hidden="true" />
                                    <span className="portalHeaderFeedbackLabel__R6m1V9">Feedback</span>
                                </Button>

                                <PortalHeaderPopover
                                    open={openPopover === "feedback"}
                                    label="Send feedback"
                                    className="portalHeaderPopoverWide__J7v2L5"
                                >
                                    {feedbackStep === "select" ? (
                                        <div className="portalFeedbackSelect__C8q2M5">
                                            <div className="portalFeedbackIntro__E3p7N2">
                                                <div className="portalPopoverTitle__W8k2Q6">What would you like to share?</div>
                                            </div>
                                            <div className="portalFeedbackTypeGrid__N4m8S2">
                                                <button
                                                    type="button"
                                                    className="portalFeedbackTypeButton__D6k2V1"
                                                    onClick={() => onSelectFeedbackKind("ISSUE")}
                                                >
                                                    <span className="portalFeedbackTypeIconIssue__P9t2Q6" aria-hidden="true">
                                                        <TriangleAlert />
                                                    </span>
                                                    <span className="portalFeedbackTypeContent__A6m1V4">
                                                        <span className="portalFeedbackTypeTitle__H3r8N2">Issue</span>
                                                        <span className="portalFeedbackTypeSubtitle__B4k7P3">with my page</span>
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="portalFeedbackTypeButton__D6k2V1"
                                                    onClick={() => onSelectFeedbackKind("IDEA")}
                                                >
                                                    <span className="portalFeedbackTypeIconIdea__Q1n6D8" aria-hidden="true">
                                                        <Lightbulb />
                                                    </span>
                                                    <span className="portalFeedbackTypeContent__A6m1V4">
                                                        <span className="portalFeedbackTypeTitle__H3r8N2">Idea</span>
                                                        <span className="portalFeedbackTypeSubtitle__B4k7P3">to improve Veloro</span>
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {feedbackStep === "compose" ? (
                                        <div className="portalFeedbackCompose__Q5p1N8">
                                            <div className="portalFeedbackKind__L1k7T3">
                                                {feedbackKind === "ISSUE" ? (
                                                    <span>Issue report</span>
                                                ) : (
                                                    <span>Improvement idea</span>
                                                )}
                                            </div>
                                            <textarea
                                                ref={feedbackTextRef}
                                                className="portalFeedbackTextarea__P3t9M7"
                                                value={feedbackText}
                                                onChange={(event) => setFeedbackText(event.target.value)}
                                                placeholder={
                                                    feedbackKind === "ISSUE"
                                                        ? "Describe what went wrong on this page..."
                                                        : "Describe your idea for improving Veloro..."
                                                }
                                                maxLength={2000}
                                                rows={5}
                                            />
                                            <div className="portalFeedbackMeta__B7d4Q1">
                                                <span>Page: {pathname}</span>
                                                <span>{feedbackText.trim().length}/2000</span>
                                            </div>
                                            {feedbackError ? <div className="portalFeedbackError__R8k2V4">{feedbackError}</div> : null}
                                            <div className="portalFeedbackActions__H2q6T9">
                                                <Button type="button" kind="ghost" size="small" onClick={resetFeedbackComposer} disabled={feedbackSending}>
                                                    <ArrowLeft aria-hidden="true" />
                                                    <span>Back</span>
                                                </Button>
                                                <Button
                                                    className="portalFeedbackSubmitButton__C9m4R2"
                                                    type="button"
                                                    kind="secondary"
                                                    size="small"
                                                    onClick={onSubmitFeedback}
                                                    disabled={feedbackSending}
                                                >
                                                    {feedbackSending ? (
                                                        <span className="portalFeedbackSubmitSpinner__N5q7V1">
                                                            <Spinner size={14} />
                                                        </span>
                                                    ) : null}
                                                    <span>Send feedback</span>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {feedbackStep === "success" ? (
                                        <div className="portalFeedbackSuccess__S6m1Q5">
                                            <div className="portalFeedbackSuccessIcon__Y5q3D8" aria-hidden="true">
                                                <CircleCheck />
                                            </div>
                                            <div className="portalFeedbackSuccessTitle__A2n7K4">Your feedback was sent, thanks!</div>
                                            <div className="portalFeedbackSuccessText__W9v2P6">
                                                Thanks for sharing. Feedback is reviewed internally to improve your project experience.
                                            </div>
                                            <div className="portalFeedbackActions__H2q6T9 portalFeedbackActionsCentered__T6n4C9">
                                                <Button type="button" kind="secondary" size="small" onClick={() => setOpenPopover(null)}>
                                                    Close
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </PortalHeaderPopover>
                            </div>

                            <div className="portalHeaderActionSlot__P3m8D2 portalHeaderActionSlotTheme__C8m2P4">
                                <Tooltip content={themeTooltipLabel}>
                                    <Button
                                        className="portalHeaderAction__T8m4R1"
                                        type="button"
                                        kind="toggle"
                                        size="medium"
                                        aria-label={`${messages.menu.theme}: ${themeLabel}`}
                                        onClick={onToggleTheme}
                                    >
                                        {themeIcon}
                                    </Button>
                                </Tooltip>
                            </div>

                            {featureFlags.assistant ? (
                                <div className="portalHeaderActionSlot__P3m8D2 portalHeaderActionSlotAssistant__A5m9Q3">
                                    <Tooltip content="AI assistant (coming soon)">
                                        <Button
                                            className="portalHeaderAction__T8m4R1"
                                            type="button"
                                            kind="toggle"
                                            size="medium"
                                            aria-label="AI assistant (coming soon)"
                                            aria-pressed={assistantIsVisible}
                                            onClick={toggleAssistantPanel}
                                        >
                                            <Bot aria-hidden="true" />
                                        </Button>
                                    </Tooltip>
                                </div>
                            ) : null}

                            {featureFlags.notifications ? (
                                <div className="portalHeaderActionSlot__P3m8D2 portalHeaderActionSlotNotifications__B2m8Q1">
                                    <Tooltip content="Notifications">
                                        <Button
                                            className="portalHeaderAction__T8m4R1"
                                            type="button"
                                            kind="toggle"
                                            size="medium"
                                            aria-label="Notifications"
                                            aria-haspopup="dialog"
                                            aria-expanded={openPopover === "notifications"}
                                            aria-pressed={openPopover === "notifications"}
                                            onClick={() => togglePopover("notifications")}
                                        >
                                            <Bell aria-hidden="true" />
                                        </Button>
                                    </Tooltip>
                                    <PortalHeaderPopover
                                        open={openPopover === "notifications"}
                                        label="Notifications"
                                        className="portalHeaderPopoverAlignRight__S2m9K4"
                                    >
                                        <div className="portalHeaderShellPopover__A8m2Q5">
                                            <section className="portalShellComingSoonCard__D4m8Q2 ui-surface-card">
                                                <span className="portalComingSoonBadge__L5m2Q8">
                                                    <Sparkles aria-hidden="true" />
                                                    Coming soon
                                                </span>
                                                <h3 className="portalShellComingSoonHeading__X9m2Q6">Notifications</h3>
                                                <p className="portalShellComingSoonBody__N7m2Q4">This feature is under active development.</p>
                                            </section>
                                        </div>
                                    </PortalHeaderPopover>
                                </div>
                            ) : null}

                            <div className="portalHeaderActionSlot__P3m8D2 portalHeaderActionSlotProfile__H5t9D1">
                                <Tooltip content="Account menu">
                                    <Button
                                        className="portalProfileButton__R2k8V4"
                                        onClick={() => togglePopover("profile")}
                                        type="button"
                                        kind="toggle"
                                        size="small"
                                        aria-label="Account menu"
                                        aria-haspopup="menu"
                                        aria-expanded={openPopover === "profile"}
                                        aria-pressed={openPopover === "profile"}
                                    >
                                        <span className="portalProfileAvatar__L4x7S1" aria-hidden="true">
                                            {initials}
                                        </span>
                                    </Button>
                                </Tooltip>

                                <PortalHeaderPopover
                                    open={openPopover === "profile"}
                                    label="Account menu"
                                    className="portalHeaderPopoverAlignRight__S2m9K4"
                                >
                                    <div className="portalMenuPanel__Z9f2J6">
                                        <section className="portalMenuSection__N7m4V1">
                                            <div className="portalMenuSectionTitle__Q3p9D2">My Store</div>
                                            <div className="portalMenuStoreList__X9v2K4">
                                                {stores.map((store) => {
                                                    const active = currentStore?.id === store.id;
                                                    const switching = updatingStoreId === store.id;

                                                    return (
                                                        <button
                                                            key={store.id}
                                                            className={cn("portalMenuStoreItem__A5p8N7", active && "portalMenuStoreItemActive__G2m9R6")}
                                                            type="button"
                                                            onClick={() => void onSelectStore(store.id)}
                                                            disabled={!canSwitchStores || !!updatingStoreId}
                                                        >
                                                            <span className="portalMenuStoreAvatar__F6k2P8" aria-hidden="true">
                                                                {initials}
                                                            </span>
                                                            <span className="portalMenuStoreName__E4m7Q1">{store.name}</span>
                                                            <span className="portalMenuStoreEnd__B8q2V3" aria-hidden="true">
                                                                {switching ? <Spinner size={14} /> : active ? <Check /> : null}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {storeUpdateError ? <div className="portalMenuError__W2n8D4">{storeUpdateError}</div> : null}
                                        </section>

                                        <div className="portalMenuDivider__B1v6Q9" />

                                        <section className="portalMenuSection__N7m4V1">
                                            <div className="portalMenuSectionTitle__Q3p9D2">{displayName}</div>
                                            <div className="portalMenuEmployeeMeta__C4t9H1">Employee ID: {user.employeeId}</div>
                                            <div className="portalMenuEmployeeMeta__C4t9H1">Role: {ROLE_LABELS[user.role]}</div>
                                            <button className="portalMenuItem__A0x7N3" type="button" onClick={onSignOut} disabled={signingOut}>
                                                {signingOut ? <Spinner size={14} /> : <LogOut aria-hidden="true" />}
                                                <span>{signingOut ? "Logging out..." : "Logout"}</span>
                                            </button>
                                        </section>
                                    </div>
                                </PortalHeaderPopover>
                            </div>
                        </div>
                    </div>
                </header>

                <PortalSearchDialog
                    open={searchOpen}
                    shortcutLabel={searchShortcutLabel}
                    inputPlaceholder={searchCopy.inputPlaceholder}
                    query={searchQuery}
                    inputRef={searchInputRef}
                    indexing={searchIndexing}
                    emptyLabel={emptySearchLabel}
                    sections={searchSections}
                    activeItemId={activeSearchItem?.id ?? null}
                    keyboardNavigation={searchKeyboardNavigation}
                    onClose={closeSearch}
                    onQueryChange={(next) => {
                        setSearchQuery(next);
                        setSearchActiveIndex(0);
                        setSearchKeyboardNavigation(false);
                    }}
                    onInputKeyDown={onSearchInputKeyDown}
                    onItemSelect={onSearchItemSelect}
                    onItemHover={onSearchItemHover}
                    onItemFocus={onSearchItemFocus}
                    renderHighlightedText={renderHighlightedText}
                />

                <div
                    className={cn(
                        "portalBody__P4k8H2",
                        isSettingsRoute && "portalBodySettings__J9m3Q7"
                    )}
                >
                    <button
                        type="button"
                        className={cn("portalMobileNavOverlay__X7m2D5", mobileNavOpen && "portalMobileNavOverlayVisible__M3q8P1")}
                        onClick={() => setMobileNavOpen(false)}
                        aria-label="Close navigation menu"
                        tabIndex={mobileNavOpen ? 0 : -1}
                    />

                    <aside
                        className={cn(
                            "portalSidebar__D4e5F6",
                            isSettingsRoute && (!isMobileViewport || !mobileNavOpen) && "portalSidebarSettingsHidden__N2f8V1",
                            isDashboardWidgetMode && "portalSidebarWidgetMode__P6m2Q8",
                            mobileNavOpen && "portalSidebarMobileOpen__L2q9T4"
                        )}
                    >
                        <div className="portalSidebarInner__W9m4V2">
                            <div className={cn(
                                "portalSidebarScenes__F4m8Q2",
                                sidebarScenesPhase === "nav-exit" && "portalSidebarScenesNavExit__R2m8Q4",
                                sidebarScenesPhase === "widgets" && "portalSidebarScenesWidgetsActive__N3m8Q5",
                                sidebarScenesPhase === "widgets-exit" && "portalSidebarScenesWidgetsExit__S5m8Q2"
                            )}>
                                <div className="portalSidebarScene__D1m2Q7 portalSidebarSceneNav__N8p2R4">
                                    <nav className="portalNav__M4n5O6" aria-label={messages.a11y.navigation}>
                                        {nav.map((item) => {
                                            const hasChildren = !!item.children?.length;
                                            const parentActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                            const childActive = hasChildren && item.children!.some(
                                                (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
                                            );
                                            const activeChildIndex = hasChildren
                                                ? item.children!.findIndex(
                                                    (entry) => pathname === entry.href || pathname.startsWith(entry.href + "/")
                                                )
                                                : -1;
                                            const active = hasChildren ? parentActive || childActive : isActive(item.href);
                                            const isOpen = hasChildren && openSubmenuHrefs.includes(item.href);

                                            if (!hasChildren) {
                                                return (
                                                    <div key={item.key} className="portalSection__P7q8R9">
                                                        <Link
                                                            className={cn("portalLink__V4w5X6", active && "portalLinkActive__Y7z8A9")}
                                                            href={item.href}
                                                            prefetch={false}
                                                            aria-current={active ? "page" : undefined}
                                                            onClick={onSidebarLinkClick}
                                                        >
                                                            <span className="portalLinkContent__A3t5N9">
                                                                {renderPortalPageIcon(item.key, {
                                                                    className: "portalLinkIcon__V8p2F1",
                                                                    "aria-hidden": "true",
                                                                })}
                                                                <span>{messages.nav[item.key]}</span>
                                                            </span>
                                                        </Link>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={item.key} className="portalSection__P7q8R9">
                                                    <div className="portalLinkRow__F3k8D1">
                                                        <Link
                                                            className={cn("portalLink__V4w5X6", active && "portalLinkActive__Y7z8A9")}
                                                            href={item.href}
                                                            prefetch={false}
                                                            aria-current={active ? "page" : undefined}
                                                            onClick={onSidebarLinkClick}
                                                        >
                                                            <span className="portalLinkContent__A3t5N9">
                                                                {renderPortalPageIcon(item.key, {
                                                                    className: "portalLinkIcon__V8p2F1",
                                                                    "aria-hidden": "true",
                                                                })}
                                                                <span>{messages.nav[item.key]}</span>
                                                            </span>
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            className={cn("portalSubToggle__H7m2Q4", isOpen && "portalSubToggleOpen__K1p9S3")}
                                                            aria-label={`${isOpen ? messages.a11y.collapseSection : messages.a11y.expandSection} ${
                                                                messages.nav[item.key]
                                                            }`}
                                                            aria-expanded={isOpen}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setOpenSubmenuHrefs((current) => {
                                                                    if (current.includes(item.href)) {
                                                                        return current.filter((href) => href !== item.href);
                                                                    }
                                                                    return [...current, item.href];
                                                                });
                                                            }}
                                                        >
                                                            <ChevronDown aria-hidden="true" />
                                                        </button>
                                                    </div>

                                                    <div className={cn("portalSublinks__B8n2Q7", isOpen && "portalSublinksOpen__R8v2N6")}>
                                                        {item.children!.map((sub, subIndex) => {
                                                            const subActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                                                            const indicatorState = activeChildIndex === -1
                                                                ? "none"
                                                                : subIndex < activeChildIndex
                                                                    ? "trail"
                                                                    : subIndex === activeChildIndex
                                                                        ? "active"
                                                                        : "none";

                                                            return (
                                                                <Link
                                                                    key={sub.href}
                                                                    className={cn("portalSubLink__C4v8L2", subActive ? "portalSubLinkActive__M9t1H6" : null)}
                                                                    href={sub.href}
                                                                    prefetch={false}
                                                                    aria-current={subActive ? "page" : undefined}
                                                                    onClick={onSidebarLinkClick}
                                                                >
                                                                    <span className="portalSubLinkContent__M6p2Q9">
                                                                        <span className="portalSubIndicator__J5k8D2" data-state={indicatorState} aria-hidden="true">
                                                                            {indicatorState === "trail" ? (
                                                                                <svg
                                                                                    className="portalSubIndicatorSvg__J2m8Q4"
                                                                                    viewBox="0 0 14 20"
                                                                                    focusable="false"
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    <path
                                                                                        className="portalSubIndicatorStroke__B7m2Q6"
                                                                                        d="M7 -2 V 22"
                                                                                    />
                                                                                </svg>
                                                                            ) : null}
                                                                            {indicatorState === "active" ? (
                                                                                <svg
                                                                                    className="portalSubIndicatorSvg__J2m8Q4"
                                                                                    viewBox="0 0 14 20"
                                                                                    focusable="false"
                                                                                    aria-hidden="true"
                                                                                >
                                                                                    <path
                                                                                        className="portalSubIndicatorStroke__B7m2Q6"
                                                                                        d="M7 -2 V 6 Q 7 10 11 10 H 12"
                                                                                    />
                                                                                    <path
                                                                                        className="portalSubIndicatorStroke__B7m2Q6"
                                                                                        d="M10.4 8.5 L 13 10 L 10.4 11.5"
                                                                                    />
                                                                                </svg>
                                                                            ) : null}
                                                                        </span>
                                                                        <span>{messages.nav[sub.key]}</span>
                                                                    </span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </nav>

                                    <div className="portalSidebarBottom__Y2k6Q4">
                                        <div className="portalSection__P7q8R9">
                                            <Link
                                                className={cn("portalLink__V4w5X6", isActive("/settings") && "portalLinkActive__Y7z8A9")}
                                                href="/settings"
                                                prefetch={false}
                                                aria-current={isActive("/settings") ? "page" : undefined}
                                                onClick={onSidebarLinkClick}
                                            >
                                                <span className="portalLinkContent__A3t5N9">
                                                    {renderPortalPageIcon("settings", {
                                                        className: "portalLinkIcon__V8p2F1",
                                                        "aria-hidden": "true",
                                                    })}
                                                    <span>{messages.nav.settings}</span>
                                                </span>
                                            </Link>
                                        </div>

                                        <div className="portalSection__P7q8R9">
                                            <Link
                                                href="/system-status"
                                                prefetch={false}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={cn(
                                                    "portalLink__V4w5X6",
                                                    "portalSystemStatusButton__H4k8P1",
                                                    systemStatus === "error" && "portalSystemStatusButtonError__T3d6L8"
                                                )}
                                                aria-live="polite"
                                                onClick={onSidebarLinkClick}
                                            >
                                                <span className="portalLinkContent__A3t5N9 portalSystemStatusContent__Q4m8P2">
                                                    <span className="portalLinkIcon__V8p2F1 portalSystemStatusIconWrap__S3d9L1" aria-hidden="true">
                                                        <span
                                                            className={cn(
                                                                "portalSystemStatusDot__N7r1M5",
                                                                systemStatus === "operational"
                                                                    ? "portalSystemStatusDotOperational__B3d9L2"
                                                                    : "portalSystemStatusDotError__C8f2T7"
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                    <span className="portalSystemStatusLabel__R1n5Q8">
                                                        <span className="portalSystemStatusText__D6p4V3">
                                                            {systemStatus === "operational" ? messages.menu.systemsOperational : messages.menu.systemError}
                                                        </span>
                                                        <ArrowUpRight className="portalSystemStatusArrow__F2q8K6" aria-hidden="true" />
                                                    </span>
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="portalSidebarScene__D1m2Q7 portalSidebarSceneWidgets__F7m2Q4" aria-hidden={!isDashboardWidgetMenuVisible}>
                                    <div className="portalSidebarWidgetMenu__A2m8P6">
                                        <div className="portalSidebarWidgetMenuSearch__D6m9R3">
                                            <Search className="portalSidebarWidgetMenuSearchIcon__M4n7Q2" aria-hidden="true" />
                                            <input
                                                type="search"
                                                className="portalSidebarWidgetMenuSearchInput__Q2n8K5"
                                                placeholder="Search widgets"
                                                value={dashboardWidgetSearchQuery}
                                                onChange={(event) => setDashboardWidgetSearchQuery(event.target.value)}
                                            />
                                        </div>

                                        <ul className="portalSidebarWidgetMenuList__K4m8T2">
                                            {dashboardWidgetMenuItemCount === 0 ? (
                                                <li className="portalSidebarWidgetMenuEmpty__B2m8Q5">
                                                    {normalizedDashboardWidgetSearchQuery ? "No widgets found." : "No widgets available."}
                                                </li>
                                            ) : (
                                                dashboardWidgetMenuGroups.map((group) => (
                                                    <li key={group.category} className="portalSidebarWidgetMenuGroup__J5m8N2">
                                                        <h3 className="portalSidebarWidgetMenuGroupHeader__B3p8K1">{group.category}</h3>

                                                        <ul className="portalSidebarWidgetMenuGroupList__T2m8Q1">
                                                            {group.items.map((item) => (
                                                                <li key={item.id}>
                                                                    <Tooltip content={`Drag ${item.title} onto dashboard`}>
                                                                        <button
                                                                            type="button"
                                                                            className="portalSidebarWidgetMenuItem__X8m2Q4"
                                                                            draggable
                                                                            onDragStart={(event) => onDashboardWidgetDragStart(event, item.id, item.title, item.visible)}
                                                                            onDragEnd={onDashboardWidgetDragEnd}
                                                                        >
                                                                            <span className="portalSidebarWidgetMenuTitle__P5m8R1">{item.title}</span>
                                                                            <span className="portalSidebarWidgetMenuGrip__N8m2Q6" aria-hidden="true">
                                                                                <span />
                                                                                <span />
                                                                                <span />
                                                                                <span />
                                                                                <span />
                                                                                <span />
                                                                            </span>
                                                                        </button>
                                                                    </Tooltip>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div
                        className={cn(
                            "portalWorkspace__X2m8Q5",
                            assistantIsVisible && "portalWorkspaceAssistantOpen__B8m2Q3",
                            assistantIsVisible && assistantFullWidth && "portalWorkspaceAssistantFull__Q2m8V7"
                        )}
                    >
                        <main
                            className={cn("portalContent__D2s5F7", isSettingsRoute && "portalContentSettings__X3k7D5")}
                            aria-hidden={assistantIsVisible && assistantFullWidth}
                        >
                            {children}
                        </main>

                        {featureFlags.assistant ? (
                            <aside
                                className={cn(
                                    "portalAssistantPanel__H2m8Q3",
                                    assistantIsVisible && "portalAssistantPanelOpen__N4m2Q7",
                                    assistantIsVisible && assistantFullWidth && "portalAssistantPanelFullWidth__C3m8Q2"
                                )}
                                aria-hidden={!assistantIsVisible}
                            >
                            <div className="portalAssistantPanelInner__M8m2Q4">
                                <header className="portalAssistantPanelHeader__N6m2Q8">
                                    <div className="portalAssistantConversation__B3m8Q4">
                                        <button
                                            ref={assistantConversationButtonRef}
                                            type="button"
                                            className="portalAssistantConversationButton__R7m2Q1"
                                            aria-label="Conversation history (coming soon)"
                                            aria-haspopup="dialog"
                                            aria-expanded={assistantConversationMenuOpen}
                                            disabled={!ASSISTANT_CHAT_ENABLED}
                                            onClick={() => setAssistantConversationMenuOpen((current) => !current)}
                                        >
                                            <span className="portalAssistantConversationLabel__E4m2Q9">{activeAssistantConversationLabel}</span>
                                            <ChevronDown
                                                className={cn(
                                                    "portalAssistantConversationChevron__D6m2Q2",
                                                    assistantConversationMenuOpen && "portalAssistantConversationChevronOpen__J3m8Q2"
                                                )}
                                                aria-hidden="true"
                                            />
                                        </button>

                                        {assistantConversationMenuOpen ? (
                                            <div className="portalAssistantHistoryPopover__K6m2Q3" ref={assistantConversationMenuRef}>
                                                <div className="portalAssistantHistoryTop__W4m2Q1">
                                                    <span className="portalAssistantHistoryTitle__C3m8Q6">Chat history</span>
                                                    <Button
                                                        type="button"
                                                        kind="toggle"
                                                        size="xsmall"
                                                        className="portalAssistantHistoryNewButton__F3m2Q8"
                                                        disabled={!ASSISTANT_CHAT_ENABLED || !assistantMemoryEnabled}
                                                        onClick={createNewAssistantConversation}
                                                    >
                                                        New
                                                    </Button>
                                                </div>
                                                <p className="portalAssistantHistoryMeta__D2m8Q4">{assistantConversationCountLabel}</p>
                                                <div className="portalAssistantHistorySearch__A7m2Q4">
                                                    <Search className="portalAssistantHistorySearchIcon__M2m8Q3" aria-hidden="true" />
                                                    <input
                                                        type="search"
                                                        className="portalAssistantHistorySearchInput__V5m2Q7"
                                                        placeholder="Search conversations"
                                                        value={assistantConversationSearchQuery}
                                                        disabled={!ASSISTANT_CHAT_ENABLED}
                                                        onChange={(event) => setAssistantConversationSearchQuery(event.target.value)}
                                                    />
                                                </div>

                                                {!assistantMemoryEnabled ? (
                                                    <p className="portalAssistantHistoryEmpty__P8m2Q9">Turn on memory to save and view chat history.</p>
                                                ) : filteredAssistantConversations.length === 0 ? (
                                                    <p className="portalAssistantHistoryEmpty__P8m2Q9">No conversations found.</p>
                                                ) : (
                                                    <ul className="portalAssistantHistoryList__T8m2Q6">
                                                        {filteredAssistantConversations.map((conversation) => {
                                                            const isActiveConversation = conversation.id === activeAssistantConversation?.id;
                                                            const updatedLabel = formatAssistantTimestamp(conversation.updatedAt);
                                                            return (
                                                                <li
                                                                    key={conversation.id}
                                                                    className={cn(
                                                                        "portalAssistantHistoryRow__W6m2Q5",
                                                                        isActiveConversation && "portalAssistantHistoryRowActive__B4m2Q7"
                                                                    )}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="portalAssistantHistorySelect__G3m2Q6"
                                                                        onClick={() => selectAssistantConversation(conversation.id)}
                                                                    >
                                                                        <span className="portalAssistantHistoryName__E1m2Q8">{conversation.title}</span>
                                                                        {updatedLabel ? (
                                                                            <span className="portalAssistantHistoryDate__N2m8Q7">{updatedLabel}</span>
                                                                        ) : null}
                                                                    </button>
                                                                    <span className="portalAssistantHistoryManage__S5m2Q8">
                                                                        <button
                                                                            type="button"
                                                                            className="portalAssistantHistoryIconButton__R2m8Q7"
                                                                            aria-label={`Rename ${conversation.title}`}
                                                                            disabled={!ASSISTANT_CHAT_ENABLED}
                                                                            onClick={(event) => {
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                renameAssistantConversation(conversation.id);
                                                                            }}
                                                                        >
                                                                            <Pencil aria-hidden="true" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="portalAssistantHistoryIconButton__R2m8Q7"
                                                                            aria-label={`Delete ${conversation.title}`}
                                                                            onClick={(event) => {
                                                                                event.preventDefault();
                                                                                event.stopPropagation();
                                                                                deleteAssistantConversation(conversation.id);
                                                                            }}
                                                                            disabled={!ASSISTANT_CHAT_ENABLED || assistantConversations.length <= 1}
                                                                        >
                                                                            <Trash2 aria-hidden="true" />
                                                                        </button>
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="portalAssistantHeaderActions__K4m8Q1">
                                        <button
                                            type="button"
                                            className={cn(
                                                "portalAssistantMemoryButton__P2m8Q4",
                                                assistantMemoryEnabled && "portalAssistantMemoryButtonOn__A2m8Q4"
                                            )}
                                            aria-label="Toggle chat memory"
                                            aria-pressed={assistantMemoryEnabled}
                                            disabled={!ASSISTANT_CHAT_ENABLED}
                                            onClick={toggleAssistantMemory}
                                        >
                                            <span>Memory</span>
                                            <span
                                                className={cn(
                                                    "portalAssistantMemorySwitch__C9m2Q6",
                                                    assistantMemoryEnabled && "portalAssistantMemorySwitchOn__F8m2Q3"
                                                )}
                                                aria-hidden="true"
                                            >
                                                <span className="portalAssistantMemorySwitchThumb__B9m2Q8" />
                                            </span>
                                        </button>

                                        <Button
                                            type="button"
                                            kind="toggle"
                                            size="small"
                                            className="portalAssistantHeaderIconButton__T3m8Q4"
                                            aria-label={assistantFullWidth ? "Exit full width" : "Expand full width"}
                                            onClick={toggleAssistantFullWidth}
                                        >
                                            {assistantFullWidth ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
                                        </Button>

                                        <Button
                                            type="button"
                                            kind="toggle"
                                            size="small"
                                            className="portalAssistantHeaderIconButton__T3m8Q4"
                                            aria-label="Close AI assistant"
                                            onClick={() => setAssistantOpen(false)}
                                        >
                                            <X aria-hidden="true" />
                                        </Button>
                                    </div>
                                </header>

                                <div className="portalAssistantPanelBody__P6m2Q9">
                                    <section className="portalShellComingSoonCard__D4m8Q2 portalAssistantComingSoonCard__W8m2Q1 ui-surface-card">
                                        <span className="portalComingSoonBadge__L5m2Q8 portalAssistantComingSoonBadge__H8m2Q6">
                                            <Sparkles aria-hidden="true" />
                                            Coming soon
                                        </span>
                                        <h3 className="portalShellComingSoonHeading__X9m2Q6">AI assistant</h3>
                                        <p className="portalShellComingSoonBody__N7m2Q4">This area is under active development.</p>
                                    </section>
                                </div>

                                <div className="portalAssistantComposerWrap__T8m2Q6">
                                    <div className="portalAssistantComposer__J5m2Q2">
                                        <textarea
                                            className="portalAssistantComposerInput__N7m2Q4"
                                            value={assistantDraft}
                                            disabled={!ASSISTANT_CHAT_ENABLED}
                                            onChange={(event) => setAssistantDraft(event.target.value)}
                                            placeholder="Chat input is coming soon."
                                            rows={1}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault();
                                                    submitAssistantPrompt();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            kind="primary"
                                            size="small"
                                            className="portalAssistantSendButton__Q4m2Q5"
                                            onClick={submitAssistantPrompt}
                                            disabled={!ASSISTANT_CHAT_ENABLED || !assistantDraft.trim()}
                                        >
                                            <ArrowUpRight aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            </aside>
                        ) : null}
                    </div>
                </div>
            </div>
            </PortalNavigationProvider>
        </PortalI18nProvider>
    );
}
