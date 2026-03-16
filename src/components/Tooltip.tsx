"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
    content?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
};

type TooltipTriggerProps = {
    "aria-describedby"?: string;
};

function mergeDescribedBy(existingValue: string | undefined, tooltipId: string | undefined) {
    const ids = new Set<string>();
    if (existingValue) {
        existingValue
            .split(/\s+/)
            .map((id) => id.trim())
            .filter(Boolean)
            .forEach((id) => ids.add(id));
    }
    if (tooltipId) ids.add(tooltipId);
    return ids.size > 0 ? Array.from(ids).join(" ") : undefined;
}

export function Tooltip({ content, title, description, children }: Props) {
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const tooltipId = useId();
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const hasTooltipContent = Boolean(content || title || description);

    function updatePosition() {
        const trigger = wrapperRef.current;
        const tooltip = tooltipRef.current;
        if (!trigger || !tooltip) return;

        const triggerRect = trigger.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const gutter = 8;
        const minTop = gutter;
        const maxTop = Math.max(minTop, window.innerHeight - tooltipRect.height - gutter);

        let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        left = Math.max(gutter, Math.min(left, window.innerWidth - tooltipRect.width - gutter));

        const aboveTop = triggerRect.top - tooltipRect.height - gutter;
        const belowTop = triggerRect.bottom + gutter;
        const canFitAbove = aboveTop >= minTop;
        const canFitBelow = belowTop <= maxTop;
        const spaceAbove = triggerRect.top - gutter;
        const spaceBelow = window.innerHeight - triggerRect.bottom - gutter;

        let top = belowTop;
        if (canFitAbove) {
            top = aboveTop;
        } else if (canFitBelow) {
            top = belowTop;
        } else {
            top = spaceAbove >= spaceBelow ? aboveTop : belowTop;
        }

        top = Math.max(minTop, Math.min(top, maxTop));

        setPosition({ top, left });
    }

    function hide() {
        setVisible(false);
    }

    useEffect(() => {
        if (!visible) return;

        updatePosition();
        const onUpdate = () => updatePosition();

        window.addEventListener("resize", onUpdate);
        window.addEventListener("scroll", onUpdate, true);
        return () => {
            window.removeEventListener("resize", onUpdate);
            window.removeEventListener("scroll", onUpdate, true);
        };
    }, [visible]);

    const tooltipNode = (
        <div
            id={tooltipId}
            ref={tooltipRef}
            className={`tooltip__container__L5k8q0 ${visible ? "tooltip__visible__B3m7p0" : ""
                }`}
            role="tooltip"
            aria-hidden={!visible}
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            {title || description ? (
                <div className="tooltip__content__Q7p3s0 tooltip__content-rich__Q7p3s1">
                    {title ? <p className="tooltip__title__Q7p3s2">{title}</p> : null}
                    {description ? <p className="tooltip__description__Q7p3s3">{description}</p> : null}
                </div>
            ) : (
                <div className="tooltip__content__Q7p3s0">{content}</div>
            )}
        </div>
    );
    const canPortal = typeof document !== "undefined";
    let triggerNode = children;

    if (isValidElement<TooltipTriggerProps>(children)) {
        const mergedDescribedBy = mergeDescribedBy(
            children.props["aria-describedby"],
            visible && hasTooltipContent ? tooltipId : undefined
        );
        triggerNode = cloneElement(children as ReactElement<TooltipTriggerProps>, {
            "aria-describedby": mergedDescribedBy,
        });
    }

    return (
        <span
            ref={wrapperRef}
            className="tooltip__wrapper__P7j3s0"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={hide}
            onFocusCapture={() => setVisible(true)}
            onBlurCapture={(event) => {
                const nextTarget = event.relatedTarget as Node | null;
                if (!nextTarget || !wrapperRef.current?.contains(nextTarget)) {
                    hide();
                }
            }}
            onKeyDownCapture={(event) => {
                if (event.key === "Escape") {
                    hide();
                }
            }}
        >
            {triggerNode}
            {canPortal ? createPortal(tooltipNode, document.body) : tooltipNode}
        </span>
    );
}
