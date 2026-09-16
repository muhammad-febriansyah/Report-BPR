import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import { MenuIcon } from '@/components/admin/menu-icon';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { dashboard } from '@/routes';
import type { MenuNavigationItem } from '@/types/navigation';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';

const menuClassName =
    'h-11 rounded-xl px-3.5 text-[13px] font-medium text-slate-600 opacity-80 transition-colors hover:bg-slate-50 hover:text-slate-900 hover:opacity-100 data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:opacity-100';
const categoryMenuClassName =
    'h-9 rounded-lg px-2.5 text-[12px] font-medium text-slate-600 opacity-80 transition-colors hover:bg-primary/10 hover:text-primary hover:opacity-100 data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:opacity-100';
const reportMenuClassName =
    'h-auto min-h-8 items-start overflow-visible rounded-lg px-2 py-1.5 text-left text-[12px] leading-4 text-slate-600 opacity-80 transition-colors hover:bg-primary/10 hover:text-primary hover:opacity-100 hover:[&>svg]:text-primary focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:opacity-100 data-[active=true]:bg-primary/10 data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:opacity-100 data-[active=true]:[&>svg]:text-primary [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words [&>span:last-child]:text-left';

function containsCurrentUrl(
    item: MenuNavigationItem,
    isCurrentUrl: (url: string) => boolean,
): boolean {
    return (
        (item.href !== null && isCurrentUrl(item.href)) ||
        item.children.some((child) => containsCurrentUrl(child, isCurrentUrl))
    );
}

function containsSelectedMenu(
    item: MenuNavigationItem,
    selectedMenuId: number | null,
): boolean {
    return (
        item.id === selectedMenuId ||
        item.children.some((child) =>
            containsSelectedMenu(child, selectedMenuId),
        )
    );
}

function SidebarNavigationSubItem({
    item,
    isCurrentUrl,
    selectedMenuId,
    onSelect,
}: {
    item: MenuNavigationItem;
    isCurrentUrl: (url: string) => boolean;
    selectedMenuId: number | null;
    onSelect: (id: number) => void;
}) {
    if (item.children.length > 0) {
        return (
            <SidebarMenuSubItem>
                <Collapsible
                    defaultOpen={containsCurrentUrl(item, isCurrentUrl)}
                    className="group/sub-menu"
                >
                    <CollapsibleTrigger asChild>
                        <SidebarMenuSubButton
                            asChild
                            isActive={
                                containsCurrentUrl(item, isCurrentUrl) ||
                                containsSelectedMenu(item, selectedMenuId)
                            }
                            className={categoryMenuClassName}
                        >
                            <button type="button">
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto size-3.5 shrink-0 text-current transition-transform group-data-[state=open]/sub-menu:rotate-90" />
                            </button>
                        </SidebarMenuSubButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <SidebarMenuSub className="mt-1 border-slate-200/80 py-1">
                            {item.children.map((child) => (
                                <SidebarNavigationSubItem
                                    key={child.id}
                                    item={child}
                                    isCurrentUrl={isCurrentUrl}
                                    selectedMenuId={selectedMenuId}
                                    onSelect={onSelect}
                                />
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                </Collapsible>
            </SidebarMenuSubItem>
        );
    }

    return (
        <SidebarMenuSubItem>
            {item.href ? (
                <SidebarMenuSubButton
                    asChild
                    isActive={isCurrentUrl(item.href)}
                    className={reportMenuClassName}
                >
                    <Link href={item.href} prefetch>
                        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-slate-400 transition-transform group-hover/menu-sub-item:translate-x-0.5" />
                        <span className="min-w-0 flex-1 text-left leading-4 break-words whitespace-normal">
                            {item.title}
                        </span>
                    </Link>
                </SidebarMenuSubButton>
            ) : (
                <SidebarMenuSubButton
                    asChild
                    isActive={selectedMenuId === item.id}
                    className={reportMenuClassName}
                >
                    <button type="button" onClick={() => onSelect(item.id)}>
                        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-slate-400 transition-transform group-hover/menu-sub-item:translate-x-0.5" />
                        <span className="min-w-0 flex-1 text-left leading-4 break-words whitespace-normal">
                            {item.title}
                        </span>
                    </button>
                </SidebarMenuSubButton>
            )}
        </SidebarMenuSubItem>
    );
}

export function AppSidebar() {
    const { currentUrl, isCurrentUrl } = useCurrentUrl();
    const { menuItems } = usePage().props;
    const [selectedMenu, setSelectedMenu] = useState<{
        id: number;
        url: string;
    } | null>(null);
    const selectedMenuId =
        selectedMenu?.url === currentUrl ? selectedMenu.id : null;
    const selectMenuItem = (id: number): void => {
        setSelectedMenu({ id, url: currentUrl });
    };

    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-r border-slate-200/80"
        >
            <SidebarHeader className="h-[76px] shrink-0 justify-center border-b border-slate-100 px-6 py-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-auto px-0 py-2 hover:bg-transparent active:bg-transparent data-[state=open]:bg-transparent"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4">
                <SidebarMenu className="gap-1">
                    {menuItems.map((item) => {
                        if (item.children.length > 0) {
                            return (
                                <Collapsible
                                    key={item.id}
                                    defaultOpen={containsCurrentUrl(
                                        item,
                                        isCurrentUrl,
                                    )}
                                    className="group/menu-group"
                                >
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton
                                                isActive={
                                                    containsCurrentUrl(
                                                        item,
                                                        isCurrentUrl,
                                                    ) ||
                                                    containsSelectedMenu(
                                                        item,
                                                        selectedMenuId,
                                                    )
                                                }
                                                className={menuClassName}
                                                tooltip={item.title}
                                            >
                                                <MenuIcon
                                                    name={item.icon}
                                                    className="size-4"
                                                />
                                                <span>{item.title}</span>
                                                <ChevronRight className="ml-auto size-4 shrink-0 text-current transition-transform group-data-[state=open]/menu-group:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub className="mt-1 border-slate-200/80 py-1">
                                                {item.children.map((child) => (
                                                    <SidebarNavigationSubItem
                                                        key={child.id}
                                                        item={child}
                                                        isCurrentUrl={
                                                            isCurrentUrl
                                                        }
                                                        selectedMenuId={
                                                            selectedMenuId
                                                        }
                                                        onSelect={
                                                            selectMenuItem
                                                        }
                                                    />
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            );
                        }

                        if (!item.href) {
                            return null;
                        }

                        return (
                            <SidebarMenuItem key={item.id}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isCurrentUrl(item.href)}
                                    className={menuClassName}
                                    tooltip={item.title}
                                >
                                    <Link href={item.href} prefetch>
                                        <MenuIcon
                                            name={item.icon}
                                            className="size-4"
                                        />
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="mt-auto p-4 pt-0">
                <p className="px-1 pt-1 text-[11px] leading-5 text-slate-400 group-data-[collapsible=icon]:hidden">
                    © 2026 BPR Report.
                    <br />
                    All rights reserved.
                </p>
            </SidebarFooter>
        </Sidebar>
    );
}
