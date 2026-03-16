"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { VeloroLogo } from "@/components/VeloroLogo";
import { Spinner } from "@/components/Spinner";
import { notifyPortalAction } from "@/components/portalActionNotifications";

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export function PortalLoginForm() {
    const router = useRouter();

    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [honeypot, setHoneypot] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        if (isSubmitting) return false;
        return employeeId.trim().length > 0 && password.length > 0;
    }, [employeeId, password, isSubmitting]);

    function validate(): string | null {
        if (!employeeId.trim() && !password) return "Enter your employee ID and password.";
        if (!employeeId.trim()) return "Enter your employee ID.";
        if (!password) return "Enter your password.";
        return null;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        const validationMessage = validate();
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
                body: JSON.stringify({ employeeId, password }),
            });

            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; requiresPasswordReset?: boolean } | null;

            if (!res.ok) {
                notifyPortalAction({ message: String(data?.message ?? "Invalid employee ID or password."), tone: "error" });
                setIsSubmitting(false);
                return;
            }

            router.replace(data?.requiresPasswordReset ? "/portal/password-reset" : "/portal");
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

                        <Input
                            label="Employee ID"
                            name="employeeId"
                            placeholder="EMP0001"
                            autoComplete="username"
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            disabled={isSubmitting}
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="Password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                        />

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

            <div className="login__footer__F6k3M9">
                <div className="login__help__H2p7Q1">
                    <Link className="typography__link__B7s3m0" href="/help">
                        Need Help?
                    </Link>
                </div>

                <div className="login__legal__P4x8D2">
                    By continuing, you agree to the{" "}
                    <Link className="typography__link__B7s3m0" href="/terms">
                        Terms
                    </Link>{" "}
                    and{" "}
                    <Link className="typography__link__B7s3m0" href="/privacy">
                        Privacy Policy
                    </Link>
                    .
                </div>
            </div>
        </main>
    );
}
