import {
    Activity,
    BarChart3,
    Boxes,
    ClipboardList,
    Database,
    FileText,
    Folder,
    Home,
    Newspaper,
    Package,
    Settings,
    SlidersHorizontal,
    Tag,
    Wallet,
} from "lucide-react";
import type { PortalPageKey } from "@/i18n/portal";
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function renderPortalPageIcon(page: PortalPageKey, props: IconProps) {
    switch (page) {
        case "home":
            return <Home {...props} />;
        case "products":
            return <Package {...props} />;
        case "categories":
            return <Tag {...props} />;
        case "inventory":
            return <Boxes {...props} />;
        case "purchaseOrders":
            return <ClipboardList {...props} />;
        case "variants":
            return <SlidersHorizontal {...props} />;
        case "content":
            return <Folder {...props} />;
        case "files":
            return <FileText {...props} />;
        case "metaobjects":
            return <Database {...props} />;
        case "blogPosts":
            return <Newspaper {...props} />;
        case "finance":
            return <Wallet {...props} />;
        case "analytics":
            return <BarChart3 {...props} />;
        case "reports":
            return <FileText {...props} />;
        case "liveView":
            return <Activity {...props} />;
        case "settings":
            return <Settings {...props} />;
        default:
            return null;
    }
}
