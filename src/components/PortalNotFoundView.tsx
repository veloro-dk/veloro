"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/Button";
import { PortalPageTitle } from "@/components/PortalPageTitle";

export function PortalNotFoundView() {
    const router = useRouter();

    return (
        <section className="portalNotFoundPage__M8m2Q1">
            <PortalPageTitle
                page="home"
                title="Page not found"
                icon={<TriangleAlert className="portalPageHeadingIcon__Q8m2D5" aria-hidden="true" />}
            />

            <section className="portalNotFoundCard__X4m9Q2 ui-surface-card">
                <p className="portalNotFoundCode__D6m2Q7">404</p>
                <h2 className="portalNotFoundHeading__L5m8Q4">This page does not exist.</h2>
                <p className="portalNotFoundBody__N7m2Q8">
                    The link may be outdated, or the page was moved.
                </p>

                <div className="portalNotFoundActions__S2m4Q6">
                    <Button type="button" kind="primary" size="small" onClick={() => router.push("/portal")}>Go to home</Button>
                    <Button type="button" kind="secondary" size="small" onClick={() => router.back()}>Go back</Button>
                </div>
            </section>
        </section>
    );
}
