import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export default function PortalLoginPage() {
    return (
        <main className="auth__page__Q2m7p0">
            <div className="auth__card__H6j3k0">
                <h1 className="typography__heading5__J8d3k0 auth__title__T2k9p0">Login</h1>

                <form className="form__group__K7p2s0">
                    <Input name="employeeId" label="Employee ID" autoComplete="username" />
                    <Input name="password" label="Password" type="password" autoComplete="current-password" />
                    <Button type="submit" kind="primary" size="medium">
                        Sign in
                    </Button>
                </form>
            </div>
        </main>
    );
}