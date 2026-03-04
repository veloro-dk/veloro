"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { VeloroLogo } from "@/components/VeloroLogo";

type FieldErrors = {
    employeeId?: string;
    password?: string;
};

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export default function PortalLoginPage() {
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [honeypot, setHoneypot] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cooldownUntil, setCooldownUntil] = useState<number>(0);

    const attemptsRef = useRef<number[]>([]);

    const cooldownSeconds = useMemo(() => {
        const diff = Math.ceil((cooldownUntil - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
    }, [cooldownUntil]);

    const canSubmit = useMemo(() => {
        if (isSubmitting) return false;
        if (cooldownSeconds > 0) return false;
        return employeeId.trim().length > 0 && password.length > 0;
    }, [employeeId, password, isSubmitting, cooldownSeconds]);

    function validate(): FieldErrors {
        const errors: FieldErrors = {};
        if (!employeeId.trim()) errors.employeeId = "Please enter your employee ID.";
        if (!password) errors.password = "Please enter your password.";
        return errors;
    }

    function registerAttemptAndMaybeCooldown() {
        const now = Date.now();
        attemptsRef.current = attemptsRef.current.filter((t) => now - t < 30_000);
        attemptsRef.current.push(now);

        if (attemptsRef.current.length >= 5) {
            setCooldownUntil(now + 30_000);
            attemptsRef.current = [];
            return true;
        }

        return false;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        setFormError(null);

        const validation = validate();
        setFieldErrors(validation);
        if (validation.employeeId || validation.password) return;

        if (honeypot.trim().length > 0) {
            setFormError("Invalid employee ID or password.");
            return;
        }

        if (registerAttemptAndMaybeCooldown()) {
            setFormError("Too many attempts. Please wait 30 seconds and try again.");
            return;
        }

        setIsSubmitting(true);

        await sleep(700);

        setIsSubmitting(false);
        setFormError("Invalid employee ID or password.");
    }

    return (
        <main className="login__page__A1b2C3">
            <div className="login__card__D4e5F6">
                <div className="login__logo__G7h8I9">
                    <VeloroLogo />
                </div>

                {formError && (
                    <div className="login__errorBox__S1t2U3" role="alert" aria-live="polite">
                        <div className="login__errorTitle__V4w5X6">Unable to sign in</div>
                        <div>{formError}</div>
                    </div>
                )}

                <form className="login__form__M4n5O6" onSubmit={onSubmit}>
                    <div className="login__srOnly__M9t1H6" aria-hidden="true">
                        <label>
                            Company
                            <input
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                            />
                        </label>
                    </div>

                    <Input
                        label="Employee ID"
                        name="employeeId"
                        placeholder="EMP0001"
                        autoComplete="username"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        error={fieldErrors.employeeId}
                        disabled={isSubmitting || cooldownSeconds > 0}
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={fieldErrors.password}
                        disabled={isSubmitting || cooldownSeconds > 0}
                    />

                    <div className="login__actions__P7q8R9">
                        <Button type="submit" kind="primary" size="medium" disabled={!canSubmit}>
                            <span className="login__buttonContent__C4v8L2">
                                {isSubmitting ? <span className="login__spinner__B8n2Q7" aria-hidden="true" /> : null}
                                <span>
                                    {cooldownSeconds > 0 ? `Try again in ${cooldownSeconds}s` : isSubmitting ? "Signing in" : "Sign in"}
                                </span>
                            </span>
                        </Button>
                    </div>
                </form>

                <div className="login__hint__Y7z8A9">Contact an administrator if you need access to the Veloro portal.</div>
            </div>
        </main>
    );
}