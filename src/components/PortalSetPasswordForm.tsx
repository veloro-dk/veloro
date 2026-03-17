"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Spinner } from "@/components/Spinner";
import { VeloroLogo } from "@/components/VeloroLogo";
import { notifyPortalAction } from "@/components/portalActionNotifications";

export function PortalSetPasswordForm() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        if (isSubmitting) return false;
        return password.length >= 8 && confirmPassword.length >= 8;
    }, [confirmPassword.length, isSubmitting, password.length]);

    function validate() {
        if (password.length < 8) return "Password must be at least 8 characters.";
        if (confirmPassword !== password) return "Passwords do not match.";
        return null;
    }

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();

        const validationMessage = validate();
        if (validationMessage) {
            notifyPortalAction({ message: validationMessage, tone: "error" });
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

            if (!res.ok || !data?.ok) {
                notifyPortalAction({ message: data?.message || "Unable to save password.", tone: "error" });
                setIsSubmitting(false);
                return;
            }

            router.replace("/");
            router.refresh();
        } catch {
            notifyPortalAction({ message: "Unable to save password.", tone: "error" });
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
                        <div className="typography__heading4__Z7p4s0 login__title__K8f3T1">Create your password</div>
                        <div className="typography__body__K4n7p0 login__subtitle__B3n8C4">
                            Your temporary password worked. Set a new password to continue.
                        </div>
                    </div>

                    <form className="login__form__M4n5O6" onSubmit={onSubmit}>
                        <Input
                            label="New password"
                            name="password"
                            type="password"
                            placeholder="New password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={isSubmitting}
                        />

                        <Input
                            label="Confirm password"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            disabled={isSubmitting}
                        />

                        <div className="login__actions__P7q8R9">
                            <Button type="submit" kind="primary" size="medium" disabled={!canSubmit} aria-busy={isSubmitting}>
                                <span className="login__buttonContent__C4v8L2">
                                    {isSubmitting ? <Spinner size={16} /> : null}
                                    <span>{isSubmitting ? "Saving password" : "Save password"}</span>
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
