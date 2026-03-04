type Props = { width?: number; height?: number };

export function VeloroLogo({ width = 120, height = 40 }: Props) {
    return (
        <svg width={width} height={height} viewBox="0 0 440 160" xmlns="http://www.w3.org/2000/svg">
            <text
                x="0"
                y="120"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="104"
                fontWeight="700"
                letterSpacing="0.5"
                fill="currentColor"
            >
                VELORO
            </text>
        </svg>
    );
}