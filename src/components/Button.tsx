import Link from "next/link";
import { ComponentProps, ReactNode } from "react";

type ButtonSize = "xsmall" | "small" | "medium" | "large";
type ButtonKind = "primary" | "secondary" | "tertiary" | "ghost" | "toggle" | "highlight" | "basic" | "danger";

type Props = {
    children: ReactNode;
    size?: ButtonSize;
    kind?: ButtonKind;
    href?: string;
} & Omit<ComponentProps<"button">, "children">;

const sizeClass: Record<ButtonSize, string> = {
    xsmall: "button__size-xsmall__L9d7h0",
    small: "button__size-small__L9d7h0",
    medium: "button__size-medium__L9d7h0",
    large: "button__size-large__L9d7h0",
};

const kindClass: Record<ButtonKind, string> = {
    primary: "button__kind-primary__R5j2s0",
    secondary: "button__kind-secondary__R5j2s0",
    tertiary: "button__kind-tertiary__R5j2s0",
    ghost: "button__kind-ghost__R5j2s0",
    toggle: "button__kind-toggle__R5j2s0",
    highlight: "button__kind-highlight__R5j2s0",
    basic: "button__kind-basic__R5j2s0",
    danger: "button__kind-danger__R5j2s0",
};

export function Button({ children, size = "medium", kind = "primary", href, className, ...rest }: Props) {
    const cls = ["button__root__ZxcvB0", sizeClass[size], kindClass[kind], className].filter(Boolean).join(" ");

    if (href) {
        return (
            <Link className={cls} href={href}>
                {children}
            </Link>
        );
    }

    return (
        <button className={cls} {...rest}>
            {children}
        </button>
    );
}
