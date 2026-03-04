"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { VeloroLogo } from "@/components/VeloroLogo";

type FieldErrors = {
    employeeId?: string;
    password?: string;
};

export default function PortalLoginPage() {
    const [employeeId, setEmployeeId] = useState("");
    const [password, setPassword] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const canSubmit = useMemo(() => {
        return employeeId.trim().length > 0 && password.length > 0;
    }, [employeeId, password]);

    function validate(): FieldErrors {
        const errors: FieldErrors = {};

        if (!employeeId.trim()) {
            errors.employeeId = "Please enter your employee ID.";
        }

        if (!password) {
            errors.password = "Please enter your password.";
        }

        return errors;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        setFormError(null);

        const validation = validate();
        setFieldErrors(validation);

        if (validation.employeeId || validation.password) return;

        setFormError("Login is not connected yet. Authentication will be added in the next step.");
    }

    return (
        <main className="login__page__A1b2C3">
            <div className="login__card__D4e5F6">
                <div className="login__logo__G7h8I9">
                    <VeloroLogo />
                </div>

                {formError && (
                    <div className="login__errorBox__S1t2U3" role="alert">
                        <div className="login__errorTitle__V4w5X6">Unable to sign in</div>
                        <div>{formError}</div>
                    </div>
                )}

                <form className="login__form__M4n5O6" onSubmit={onSubmit}>
                    <Input
                        label="Employee ID"
                        name="employeeId"
                        placeholder="EMP0001"
                        autoComplete="username"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        error={fieldErrors.employeeId}
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
                    />

                    <div className="login__actions__P7q8R9">
                        <Button type="submit" kind="primary" size="medium" disabled={!canSubmit}>
                            Sign in
                        </Button>
                    </div>
                </form>

                <div className="login__hint__Y7z8A9">
                    Contact an administrator if you need access to the Veloro portal.
                </div>
            </div>
        </main>
    );
}