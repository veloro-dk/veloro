"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/Button";

type Props = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
    closeLabel?: string;
    bodyClassName?: string;
};

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement) {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => (
        element.getClientRects().length > 0 && element.getAttribute("aria-hidden") !== "true"
    ));
}

export function PortalModal({
    open,
    title,
    onClose,
    children,
    footer,
    closeLabel = "Close pop-up",
    bodyClassName,
}: Props) {
    const titleId = useId();
    const modalRef = useRef<HTMLElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const modal = modalRef.current;
        if (modal) {
            const focusable = getFocusableElements(modal);
            (focusable[0] ?? modal).focus();
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== "Tab") return;

            const modalElement = modalRef.current;
            if (!modalElement) return;

            const focusable = getFocusableElements(modalElement);
            if (focusable.length === 0) {
                event.preventDefault();
                modalElement.focus();
                return;
            }

            const firstFocusable = focusable[0];
            const lastFocusable = focusable[focusable.length - 1];
            const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

            if (event.shiftKey) {
                if (!activeElement || !modalElement.contains(activeElement) || activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                }
                return;
            }

            if (!activeElement || !modalElement.contains(activeElement) || activeElement === lastFocusable) {
                event.preventDefault();
                firstFocusable.focus();
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            const previousFocus = previousFocusRef.current;
            if (previousFocus && previousFocus.isConnected) {
                previousFocus.focus();
            }
            previousFocusRef.current = null;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="portalModalOverlay__N8m2Q5"
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return;
                onClose();
            }}
        >
            <section
                ref={modalRef}
                className="portalModal__A4m9P1"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
            >
                <header className="portalModalHeader__D2m8R6">
                    <h2 id={titleId} className="portalModalTitle__H6m2Q4 ui-card-heading">
                        {title}
                    </h2>

                    <Button
                        type="button"
                        kind="ghost"
                        size="xsmall"
                        className="portalModalClose__P7m2D3"
                        aria-label={closeLabel}
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </Button>
                </header>

                <div className={`portalModalBody__R3m8Q2${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
                {footer ? <footer className="portalModalFooter__L5m2V9">{footer}</footer> : null}
            </section>
        </div>
    );
}
