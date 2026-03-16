import { ComponentProps } from "react";

type Props = ComponentProps<"input"> & {
    label: string;
    error?: string;
    helper?: string;
};

export function Input({ label, error, helper, className, ...rest }: Props) {
    const normalizedLabel = label.trim().toLowerCase();
    const autoPlaceholder = rest.type === "email"
        ? "name@example.com"
        : rest.type === "date"
            ? "YYYY-MM-DD"
            : rest.type === "number"
                ? "0"
                : rest.type === "password"
                    ? "Enter password"
                    : `Enter ${normalizedLabel}`;

    return (
        <div className="form__group__K7p2s0">
            <label className="form__label__B9f4k0">{label}</label>
            <div className="input__wrapper__Z3n7q0">
                <input
                    className={["form__input__Z3n7q0", className].filter(Boolean).join(" ")}
                    aria-invalid={Boolean(error) || undefined}
                    {...rest}
                    placeholder={rest.placeholder ?? autoPlaceholder}
                />
            </div>
            {error ? <div className="form__error__L5j8p0">{error}</div> : null}
            {!error && helper ? <div className="form__helper__H2k9s0">{helper}</div> : null}
        </div>
    );
}
