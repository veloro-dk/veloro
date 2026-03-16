import Link from "next/link";

export default function WebshopNotFoundPage() {
    return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
            <div style={{ maxWidth: 520, textAlign: "center" }}>
                <h1 style={{ margin: 0, fontSize: 32 }}>Webshop page not found</h1>
                <p style={{ marginTop: 12, marginBottom: 20 }}>
                    The page you are looking for is not available on the webshop.
                </p>
                <Link href="/" style={{ textDecoration: "underline" }}>
                    Go to webshop home
                </Link>
            </div>
        </main>
    );
}
