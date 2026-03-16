import Link from "next/link";

export default function SiteHomePage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: 24,
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: 760,
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 16,
                    padding: 28,
                    background: "rgba(255,255,255,0.9)",
                }}
            >
                <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.15 }}>Veloro Business Portal</h1>
                <p style={{ marginTop: 12, marginBottom: 20, fontSize: 16, lineHeight: 1.6 }}>
                    Manage products, inventory, purchase orders, and store settings in one workspace.
                </p>
                <p style={{ margin: 0 }}>
                    <Link href="/portal/login" style={{ textDecoration: "underline", fontWeight: 600 }}>
                        Open portal login
                    </Link>
                </p>
            </section>
        </main>
    );
}
