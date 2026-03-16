"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import {
    PORTAL_ACTION_NOTIFY_EVENT,
    isPortalActionNotificationDetail,
    type PortalActionNotificationTone,
} from "@/components/portalActionNotifications";

type PortalActionNotificationItem = {
    id: number;
    message: string;
    tone: PortalActionNotificationTone;
    phase: "enter" | "shown" | "leave";
};

const PORTAL_ACTION_NOTIFICATION_DEFAULT_DURATION_MS = 4200;
const PORTAL_ACTION_NOTIFICATION_HIDE_MS = 280;

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function normalizeNotificationMessage(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function toConciseNotificationMessage(value: string) {
    const normalized = normalizeNotificationMessage(value);
    if (!normalized) return "";

    const firstLine = normalized.split("\n")[0]?.trim() ?? normalized;
    const sentenceMatch = firstLine.match(/^(.+?[.!?])(?:\s|$)/);
    const firstSentence = sentenceMatch?.[1]?.trim() ?? firstLine;

    if (firstSentence.length <= 140) return firstSentence;
    return `${firstSentence.slice(0, 139).trimEnd()}…`;
}

export function PortalActionNotificationsViewport() {
    const [notifications, setNotifications] = useState<PortalActionNotificationItem[]>([]);
    const notificationsRef = useRef<PortalActionNotificationItem[]>([]);
    const notificationIdRef = useRef(0);
    const dismissTimersRef = useRef<Map<number, number>>(new Map());
    const removeTimersRef = useRef<Map<number, number>>(new Map());

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    const clearNotificationTimers = useCallback((id: number) => {
        const dismissTimer = dismissTimersRef.current.get(id);
        if (dismissTimer !== undefined) {
            window.clearTimeout(dismissTimer);
            dismissTimersRef.current.delete(id);
        }

        const removeTimer = removeTimersRef.current.get(id);
        if (removeTimer !== undefined) {
            window.clearTimeout(removeTimer);
            removeTimersRef.current.delete(id);
        }
    }, []);

    const removeNotificationNow = useCallback((id: number) => {
        clearNotificationTimers(id);
        setNotifications((current) => {
            const next = current.filter((entry) => entry.id !== id);
            notificationsRef.current = next;
            return next;
        });
    }, [clearNotificationTimers]);

    const beginNotificationLeave = useCallback((id: number) => {
        setNotifications((current) => {
            const next: PortalActionNotificationItem[] = current.map((entry) => (
                entry.id === id ? { ...entry, phase: "leave" } : entry
            ));
            notificationsRef.current = next;
            return next;
        });

        clearNotificationTimers(id);
        const removeTimer = window.setTimeout(() => {
            removeNotificationNow(id);
        }, PORTAL_ACTION_NOTIFICATION_HIDE_MS);
        removeTimersRef.current.set(id, removeTimer);
    }, [clearNotificationTimers, removeNotificationNow]);

    const queueNotification = useCallback((message: string, tone: PortalActionNotificationTone = "info", durationMs?: number) => {
        const conciseMessage = toConciseNotificationMessage(message);
        if (!conciseMessage) return;

        const nextId = ++notificationIdRef.current;
        const nextDuration = Number.isFinite(durationMs) && (durationMs ?? 0) > 0
            ? Math.max(1300, Number(durationMs))
            : PORTAL_ACTION_NOTIFICATION_DEFAULT_DURATION_MS;

        const current = notificationsRef.current;
        const nextList: PortalActionNotificationItem[] = [
            ...current,
            { id: nextId, message: conciseMessage, tone, phase: "enter" },
        ];

        notificationsRef.current = nextList;
        setNotifications(nextList);

        window.requestAnimationFrame(() => {
            setNotifications((entries) => {
                const next: PortalActionNotificationItem[] = entries.map((entry) => (
                    entry.id === nextId ? { ...entry, phase: "shown" } : entry
                ));
                notificationsRef.current = next;
                return next;
            });
        });

        const dismissTimer = window.setTimeout(() => {
            beginNotificationLeave(nextId);
        }, nextDuration);
        dismissTimersRef.current.set(nextId, dismissTimer);
    }, [beginNotificationLeave]);

    useEffect(() => {
        const onPortalActionNotify = (event: Event) => {
            const detail = (event as CustomEvent<unknown>).detail;
            if (!isPortalActionNotificationDetail(detail)) return;
            queueNotification(detail.message, detail.tone ?? "info", detail.durationMs);
        };

        window.addEventListener(PORTAL_ACTION_NOTIFY_EVENT, onPortalActionNotify as EventListener);
        return () => {
            window.removeEventListener(PORTAL_ACTION_NOTIFY_EVENT, onPortalActionNotify as EventListener);
        };
    }, [queueNotification]);

    useEffect(() => {
        const dismissTimers = dismissTimersRef.current;
        const removeTimers = removeTimersRef.current;
        return () => {
            for (const timer of dismissTimers.values()) {
                window.clearTimeout(timer);
            }
            dismissTimers.clear();
            for (const timer of removeTimers.values()) {
                window.clearTimeout(timer);
            }
            removeTimers.clear();
        };
    }, []);

    return (
        <div className="portalActionNotificationsLayer__M6m2Q7" aria-live="polite" aria-atomic="false">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={cn(
                        "portalActionNotificationCard__Q4m2P8",
                        notification.tone === "success" && "portalActionNotificationSuccess__W2m8Q1",
                        notification.tone === "warning" && "portalActionNotificationWarning__A4m2Q9",
                        notification.tone === "error" && "portalActionNotificationError__S2m8Q4",
                        notification.phase === "shown" && "portalActionNotificationShown__R3m2Q6",
                        notification.phase === "leave" && "portalActionNotificationLeaving__F8m2Q5"
                    )}
                    role={notification.tone === "error" ? "alert" : "status"}
                >
                    <span className="portalActionNotificationIcon__N5m2Q7" aria-hidden="true">
                        {notification.tone === "success" ? (
                            <CircleCheck />
                        ) : notification.tone === "warning" ? (
                            <TriangleAlert />
                        ) : notification.tone === "error" ? (
                            <X />
                        ) : (
                            <Info />
                        )}
                    </span>
                    <span className="portalActionNotificationMessage__K7m2Q3">{notification.message}</span>
                </div>
            ))}
        </div>
    );
}
