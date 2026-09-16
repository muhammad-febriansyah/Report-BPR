import {
    Activity,
    ChartColumn,
    ChartNoAxesCombined,
    FileText,
    Landmark,
    LayoutDashboard,
    PanelsTopLeft,
    Settings,
    ShieldCheck,
    UserRoundCog,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const menuIcons: Record<string, LucideIcon> = {
    Activity,
    LayoutDashboard,
    FileText,
    ChartColumn,
    Users,
    Landmark,
    Wallet,
    ShieldCheck,
    UserRoundCog,
    Settings,
    PanelsTopLeft,
    ChartNoAxesCombined,
};

export function MenuIcon({
    name,
    className,
}: {
    name: string | null;
    className?: string;
}) {
    const Icon = menuIcons[name ?? ''] ?? PanelsTopLeft;

    return <Icon aria-hidden="true" className={className} />;
}
