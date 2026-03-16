"use client";

import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/Button";
import { renderPortalPageIcon } from "@/components/portalPageIcons";
import { Spinner } from "@/components/Spinner";
import type { PortalPageKey } from "@/i18n/portal";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export type PortalSearchDisplayItem = {
    id: string;
    icon: PortalPageKey;
    title: string;
    snippet: string;
};

export type PortalSearchDisplaySection = {
    id: string;
    title: string;
    items: PortalSearchDisplayItem[];
};

type TriggerProps = {
    open: boolean;
    shortcutLabel: string;
    inputPlaceholder: string;
    blocked?: boolean;
    onBlockedAttempt?: () => void;
    onOpen: () => void;
    pendingMode?: boolean;
    pendingLabel?: string;
    saveLabel?: string;
    discardLabel?: string;
    saveDisabled?: boolean;
    onSavePending?: () => void;
    onDiscardPending?: () => void;
    attentionShake?: boolean;
    attentionTint?: boolean;
};

export function PortalSearchTrigger({
    open,
    shortcutLabel,
    inputPlaceholder,
    blocked = false,
    onBlockedAttempt,
    onOpen,
    pendingMode = false,
    pendingLabel = "Unsaved changes",
    saveLabel = "Save",
    discardLabel = "Discard",
    saveDisabled = false,
    onSavePending,
    onDiscardPending,
    attentionShake = false,
    attentionTint = false,
}: TriggerProps) {
    const handleBlockedAttempt = () => {
        if (!blocked) return false;
        onBlockedAttempt?.();
        return true;
    };

    return (
        <div
            className={cn(
                "portalHeaderSearch__U7e3D2",
                pendingMode && "portalHeaderSearchPending__N4m8Q2",
                attentionShake && "portalHeaderSearchAttentionShake__W2n8P4",
                attentionTint && "portalHeaderSearchAttentionTint__S1m7D3"
            )}
        >
            <div className="portalHeaderSearchFlipSurface__K8m2D1">
                <div className="portalHeaderSearchFace__G3m8R1 portalHeaderSearchFaceNormal__P5m2Q9" aria-hidden={pendingMode}>
                    <button
                        type="button"
                        className="portalHeaderSearchTrigger__D4k8P2"
                        aria-haspopup="dialog"
                        aria-expanded={open}
                        aria-controls="portal-search-dialog"
                        aria-label="Open search (Command+K)"
                        tabIndex={pendingMode ? -1 : 0}
                        onMouseDown={(event) => {
                            if (!handleBlockedAttempt()) return;
                            event.preventDefault();
                        }}
                        onFocus={(event) => {
                            if (!handleBlockedAttempt()) return;
                            event.currentTarget.blur();
                        }}
                        onClick={(event) => {
                            if (handleBlockedAttempt()) {
                                event.preventDefault();
                                return;
                            }
                            onOpen();
                        }}
                    >
                        <Search className="portalHeaderSearchIcon__Q6h2N8" aria-hidden="true" />
                        <span className="portalHeaderSearchText__M2v8R4">{inputPlaceholder}</span>
                        <span className="portalHeaderSearchShortcut__Y9n3Q5" aria-hidden="true">
                            {shortcutLabel}
                        </span>
                    </button>
                </div>

                <div className="portalHeaderSearchFace__G3m8R1 portalHeaderSearchFacePending__L4m2V8" aria-hidden={!pendingMode}>
                    <div className="portalHeaderSearchPendingBar__Q5m8P2">
                        <span className="portalHeaderSearchPendingInfo__D8m1Q7">
                            <MessageSquare className="portalHeaderSearchPendingIcon__Y7m2N4" aria-hidden="true" />
                            <span className="portalHeaderSearchPendingLabel__A1m8P6">{pendingLabel}</span>
                        </span>
                        <span className="portalHeaderSearchPendingActions__C3m7Q2">
                            <Button type="button" kind="secondary" size="xsmall" onClick={onDiscardPending} tabIndex={pendingMode ? 0 : -1}>
                                {discardLabel}
                            </Button>
                            <Button
                                type="button"
                                kind="primary"
                                size="xsmall"
                                onClick={onSavePending}
                                tabIndex={pendingMode ? 0 : -1}
                                disabled={saveDisabled}
                            >
                                {saveLabel}
                            </Button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

type DialogProps = {
    open: boolean;
    shortcutLabel: string;
    inputPlaceholder: string;
    query: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    indexing: boolean;
    emptyLabel: string | null;
    sections: PortalSearchDisplaySection[];
    activeItemId: string | null;
    keyboardNavigation: boolean;
    onClose: () => void;
    onQueryChange: (next: string) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onItemSelect: (itemId: string) => void;
    onItemHover: (itemId: string) => void;
    onItemFocus: (itemId: string) => void;
    renderHighlightedText: (text: string, query: string) => React.ReactNode;
};

export function PortalSearchDialog({
    open,
    shortcutLabel,
    inputPlaceholder,
    query,
    inputRef,
    indexing,
    emptyLabel,
    sections,
    activeItemId,
    keyboardNavigation,
    onClose,
    onQueryChange,
    onInputKeyDown,
    onItemSelect,
    onItemHover,
    onItemFocus,
    renderHighlightedText,
}: DialogProps) {
    const showLoadingState = indexing && query.trim().length > 0;

    return (
        <div
            id="portal-search-dialog"
            className={cn("portalSearchOverlay__N8k3V5", open && "portalSearchOverlayOpen__L1r7D4")}
            role="dialog"
            aria-modal="true"
            aria-hidden={!open}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="portalSearchPanel__H6m2Q9" onMouseDown={(event) => event.stopPropagation()}>
                <div className="portalSearchInputRow__P4f8T1">
                    <Search className="portalSearchInputIcon__K7q1N6" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        className="portalSearchInput__R3n8V2"
                        type="search"
                        value={query}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={inputPlaceholder}
                        onChange={(event) => onQueryChange(event.target.value)}
                        onKeyDown={onInputKeyDown}
                    />
                    <span className="portalSearchShortcut__V5t9P2" aria-hidden="true">
                        {shortcutLabel}
                    </span>
                </div>

                <div
                    className={cn("portalSearchResults__C3p8D5", keyboardNavigation && "portalSearchResultsKeyboard__H7m2Q4")}
                    role="listbox"
                    aria-label="Search results"
                >
                    {showLoadingState ? (
                        <div className="portalSearchLoading__E1n6M4" aria-live="polite">
                            <Spinner size={16} />
                        </div>
                    ) : (
                        <>
                            {sections.map((section) => (
                                <section key={section.id} className="portalSearchSection__S7m3Q1">
                                    <h2 className="portalSearchSectionTitle__X2k9R4">{section.title}</h2>
                                    <div className="portalSearchSectionList__P9d4H7">
                                        {section.items.map((item) => {
                                            const active = activeItemId === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    className={cn("portalSearchItem__H8v2Q4", active && "portalSearchItemActive__A3n7D6")}
                                                    role="option"
                                                    aria-selected={active}
                                                    onClick={() => onItemSelect(item.id)}
                                                    onMouseEnter={() => onItemHover(item.id)}
                                                    onFocus={() => onItemFocus(item.id)}
                                                >
                                                    <span className="portalSearchItemIconWrap__R4m8T2" aria-hidden="true">
                                                        {renderPortalPageIcon(item.icon, {
                                                            className: "portalSearchItemIcon__D1p6K9",
                                                            "aria-hidden": "true",
                                                        })}
                                                    </span>
                                                    <span className="portalSearchItemBody__W7k3N1">
                                                        <span className="portalSearchItemTitle__S2f9P5">
                                                            {renderHighlightedText(item.title, query)}
                                                        </span>
                                                        <span className="portalSearchItemText__Q6d1V8">
                                                            {renderHighlightedText(item.snippet, query)}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}

                            {emptyLabel ? <div className="portalSearchEmpty__U4n8K6">{emptyLabel}</div> : null}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
