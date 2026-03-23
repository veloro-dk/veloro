"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { VeloroLogo } from "@/components/VeloroLogo";
import { Spinner } from "@/components/Spinner";
import { notifyPortalAction } from "@/components/portalActionNotifications";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function syncCredentialValues(
    employeeIdInput: HTMLInputElement | null,
    passwordInput: HTMLInputElement | null,
    setEmployeeId: React.Dispatch<React.SetStateAction<string>>,
    setPassword: React.Dispatch<React.SetStateAction<string>>,
) {
    const nextEmployeeId = employeeIdInput?.value ?? "";
    const nextPassword = passwordInput?.value ?? "";
    setEmployeeId((current) => (current === nextEmployeeId ? current : nextEmployeeId));
    setPassword((current) => (current === nextPassword ? current : nextPassword));
}

export function PortalLoginForm() {
    const router = useRouter();

    const employeeIdInputRef = useRef<HTMLInputElement | null>(null);
    const passwordInputRef = useRef<HTMLInputElement | null>(null);
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [honeypot, setHoneypot] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    function syncCredentialsFromInputs() {
        syncCredentialValues(employeeIdInputRef.current, passwordInputRef.current, setEmployeeId, setPassword);
    }

    useEffect(() => {
        const sync = () => {
            syncCredentialValues(employeeIdInputRef.current, passwordInputRef.current, setEmployeeId, setPassword);
        };

        const rafId = window.requestAnimationFrame(sync);
        const timeoutIds = [
            window.setTimeout(sync, 150),
            window.setTimeout(sync, 600),
        ];
        const intervalId = window.setInterval(sync, 800);
        const handleWindowFocus = () => {
            sync();
        };

        window.addEventListener("focus", handleWindowFocus);

        return () => {
            window.cancelAnimationFrame(rafId);
            timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, []);

    const canSubmit = !isSubmitting && employeeId.trim().length > 0 && password.length > 0;

    function validate(nextEmployeeId: string, nextPassword: string): string | null {
        if (!nextEmployeeId.trim() && !nextPassword) return "Enter your employee ID and password.";
        if (!nextEmployeeId.trim()) return "Enter your employee ID.";
        if (!nextPassword) return "Enter your password.";
        return null;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const nextEmployeeId = employeeIdInputRef.current?.value ?? employeeId;
        const nextPassword = passwordInputRef.current?.value ?? password;
        setEmployeeId(nextEmployeeId);
        setPassword(nextPassword);

        const validationMessage = validate(nextEmployeeId, nextPassword);
        if (validationMessage) {
            notifyPortalAction({ message: validationMessage, tone: "error" });
            return;
        }

        if (honeypot.trim().length > 0) {
            notifyPortalAction({ message: "Invalid employee ID or password.", tone: "error" });
            return;
        }

        setIsSubmitting(true);

        try {
            await sleep(200);

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ employeeId: nextEmployeeId, password: nextPassword }),
            });

            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; requiresPasswordReset?: boolean } | null;

            if (!res.ok) {
                notifyPortalAction({ message: String(data?.message ?? "Invalid employee ID or password."), tone: "error" });
                setIsSubmitting(false);
                return;
            }

            router.replace(data?.requiresPasswordReset ? "/password-reset" : "/");
            router.refresh();
        } catch {
            notifyPortalAction({ message: "Unable to sign in right now.", tone: "error" });
            setIsSubmitting(false);
        }
    }

    return (
        <main className="login__page__A1b2C3">
            <div className="login__shell__H4k2P8">
                <div className="login__brand__N7q3D2">
                    <VeloroLogo width={200} height={68} />
                </div>

                <div className="login__card__D4e5F6 ui-surface-card ui-surface-card--raised">
                    <div className="login__header__S2m7Q1">
                        <div className="typography__heading4__Z7p4s0 login__title__K8f3T1">Log in</div>
                        <div className="typography__body__K4n7p0 login__subtitle__B3n8C4">Continue to Veloro portal.</div>
                    </div>

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

                        <div className="form__group__K7p2s0">
                            <label className="form__label__B9f4k0" htmlFor="login-employee-id">Employee ID</label>
                            <div className="input__wrapper__Z3n7q0">
                                <input
                                    id="login-employee-id"
                                    ref={employeeIdInputRef}
                                    className="form__input__Z3n7q0"
                                    name="employeeId"
                                    type="text"
                                    placeholder="EMP0001"
                                    autoComplete="username"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    disabled={isSubmitting}
                                    defaultValue=""
                                    onChange={syncCredentialsFromInputs}
                                    onInput={syncCredentialsFromInputs}
                                    onFocus={syncCredentialsFromInputs}
                                />
                            </div>
                        </div>

                        <div className="form__group__K7p2s0">
                            <label className="form__label__B9f4k0" htmlFor="login-password">Password</label>
                            <div className="input__wrapper__Z3n7q0 login__passwordWrap__A7m3Q2">
                                <input
                                    id="login-password"
                                    ref={passwordInputRef}
                                    className="form__input__Z3n7q0 login__passwordInput__W6m2Q5"
                                    name="password"
                                    type={passwordVisible ? "text" : "password"}
                                    placeholder="Password"
                                    autoComplete="current-password"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    disabled={isSubmitting}
                                    defaultValue=""
                                    onChange={syncCredentialsFromInputs}
                                    onInput={syncCredentialsFromInputs}
                                    onFocus={syncCredentialsFromInputs}
                                />
                                <button
                                    type="button"
                                    className="login__passwordToggle__Q5m8P2"
                                    aria-label={passwordVisible ? "Hide password" : "Show password"}
                                    aria-pressed={passwordVisible}
                                    title={passwordVisible ? "Hide password" : "Show password"}
                                    onClick={() => setPasswordVisible((current) => !current)}
                                    disabled={isSubmitting}
                                >
                                    {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                                </button>
                            </div>
                        </div>

                        <div className="login__actions__P7q8R9">
                            <Button type="submit" kind="primary" size="medium" disabled={!canSubmit} aria-busy={isSubmitting}>
                                <span className="login__buttonContent__C4v8L2">
                                    {isSubmitting ? <Spinner size={16} /> : null}
                                    <span>{isSubmitting ? "Signing in" : "Sign in"}</span>
                                </span>
                            </Button>
                        </div>
                    </form>

                    <div className="login__hint__Y7z8A9">Contact an administrator if you forgot your password.</div>
                </div>
            </div>
        </main>
    );
}
