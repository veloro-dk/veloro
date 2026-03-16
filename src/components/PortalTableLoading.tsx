type PortalTableLoadingMode = "empty" | "populated";

type PortalTableLoadingProps = {
    mode: PortalTableLoadingMode;
};

export function PortalTableLoading({ mode }: PortalTableLoadingProps) {
    const rows = mode === "populated" ? 6 : 3;

    return (
        <div className="portalTableLoading__J7m2Q4" data-mode={mode} role="status" aria-live="polite" aria-label="Loading table data">
            <div className="portalTableLoadingToolbar__K4m2Q7" aria-hidden="true">
                <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockLong__L3m2Q8" />
                <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockShort__A2m2Q9" />
                <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockIcon__D2m2Q6" />
            </div>

            {mode === "populated" ? (
                <div className="portalTableLoadingHeader__N2m2Q3" aria-hidden="true">
                    <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockHead__Q4m2Q7" />
                    <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockHead__Q4m2Q7" />
                    <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockHead__Q4m2Q7" />
                    <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockHead__Q4m2Q7" />
                </div>
            ) : null}

            <div className="portalTableLoadingRows__R2m2Q8" aria-hidden="true">
                {Array.from({ length: rows }, (_, index) => (
                    <div key={index} className="portalTableLoadingRow__S3m2Q5">
                        <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockCellPrimary__U8m2Q4" />
                        <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockCellSecondary__P6m2Q3" />
                        <span className="portalTableLoadingBlock__G3m2Q6 portalTableLoadingBlockCellTertiary__V8m2Q7" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export type { PortalTableLoadingMode };
