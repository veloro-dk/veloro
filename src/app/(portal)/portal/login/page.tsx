export default function PortalLoginPage() {
    return (
        <main style={{ padding: 24, maxWidth: 420 }}>
            <h1>Login</h1>
            <form style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    Employee ID
                    <input name="employeeId" autoComplete="username" />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    Password
                    <input name="password" type="password" autoComplete="current-password" />
                </label>

                <button type="submit">Sign in</button>
            </form>
        </main>
    );
}