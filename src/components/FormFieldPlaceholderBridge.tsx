"use client";

import { useEffect } from "react";

const PLACEHOLDER_FIELD_SELECTOR = [
    "input.form__input__Z3n7q0:not([placeholder])",
    "textarea.form__textarea__Q6p3f0:not([placeholder])",
    "input.form__inputPhoneNRNumber__H5k8q0:not([placeholder])",
    "input.portalProductCreateMoneyFieldAmount__W8m2Q5:not([placeholder])",
    "input.portalProductCreateTagInput__Q3m8Q4:not([placeholder])",
].join(", ");

const SELECT_HINT_SELECTOR = "select.form__select__P9j2k0:not([title])";

function normalizeLabel(value: string | null | undefined) {
    if (!value) return "";
    return value.replace(/\*/g, " ").replace(/\s+/g, " ").replace(/:+$/g, "").trim();
}

function getFieldLabel(field: Element) {
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
        const fromAria = normalizeLabel(field.getAttribute("aria-label"));
        if (fromAria) return fromAria;

        if (field.labels && field.labels.length > 0) {
            const fromLabel = normalizeLabel(field.labels[0]?.textContent);
            if (fromLabel) return fromLabel;
        }
    }

    const closestLabel = field.closest("label");
    const explicitLabel = normalizeLabel(closestLabel?.querySelector(".form__label__B9f4k0")?.textContent);
    if (explicitLabel) return explicitLabel;

    const labelText = normalizeLabel(closestLabel?.textContent);
    if (labelText) return labelText;

    const fromGroup = normalizeLabel(field.closest(".form__group__K7p2s0")?.querySelector(".form__label__B9f4k0")?.textContent);
    if (fromGroup) return fromGroup;

    return "";
}

function toPhrase(label: string) {
    return label.toLowerCase().replace(/^select\s+/i, "").replace(/^input\s+/i, "").trim();
}

function getPlaceholderForField(field: HTMLInputElement | HTMLTextAreaElement) {
    if (field.classList.contains("form__inputPhoneNRNumber__H5k8q0")) return "Phone number";
    if (field.classList.contains("portalProductCreateMoneyFieldAmount__W8m2Q5")) return "0.00";

    const label = getFieldLabel(field);
    const phrase = toPhrase(label);

    if (field.classList.contains("portalProductCreateTagInput__Q3m8Q4")) {
        if (phrase.includes("tag")) return "Add tag";
        if (phrase.includes("value")) return "Add value";
        return "Add value";
    }

    if (field instanceof HTMLInputElement) {
        const type = field.type.toLowerCase();
        if (type === "date") return "YYYY-MM-DD";
        if (type === "email") return "name@example.com";
        if (type === "password") return "Enter password";
        if (type === "search") return phrase ? `Search ${phrase}` : "Search";
        if (type === "number") {
            if (phrase.includes("quantity")) return "1";
            if (phrase.includes("tax") || phrase.includes("price") || phrase.includes("amount") || phrase.includes("discount")) return "0.00";
            return "0";
        }
    }

    if (field.tagName === "TEXTAREA") {
        if (phrase.includes("note")) return "Add notes";
        if (phrase.includes("description")) return "Add a description";
        return phrase ? `Add ${phrase}` : "Add details";
    }

    return phrase ? `Enter ${phrase}` : "Enter value";
}

function shouldSkipField(field: HTMLInputElement | HTMLTextAreaElement) {
    if (field.disabled || field.readOnly) return true;
    if (field instanceof HTMLInputElement) {
        const type = field.type.toLowerCase();
        if (type === "hidden" || type === "checkbox" || type === "radio" || type === "file" || type === "button" || type === "submit" || type === "reset") {
            return true;
        }
    }
    return false;
}

function applyFormFieldHints(root: ParentNode) {
    const textFields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(PLACEHOLDER_FIELD_SELECTOR);
    textFields.forEach((field) => {
        if (shouldSkipField(field)) return;
        const nextPlaceholder = getPlaceholderForField(field);
        if (!nextPlaceholder) return;
        field.placeholder = nextPlaceholder;
    });

    const selectFields = root.querySelectorAll<HTMLSelectElement>(SELECT_HINT_SELECTOR);
    selectFields.forEach((field) => {
        if (field.disabled || field.multiple) return;
        if (field.classList.contains("form__inputPhoneNR__select__H5k8q0")) return;
        if (field.classList.contains("portalProductCreateMoneyFieldSelect__G2m8Q4")) return;
        const label = toPhrase(getFieldLabel(field));
        field.title = label ? `Select ${label}` : "Select value";
    });
}

export function FormFieldPlaceholderBridge() {
    useEffect(() => {
        if (typeof document === "undefined") return;

        applyFormFieldHints(document);

        const observer = new MutationObserver(() => {
            applyFormFieldHints(document);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
        });

        return () => observer.disconnect();
    }, []);

    return null;
}
