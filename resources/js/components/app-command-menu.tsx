import { router, usePage } from '@inertiajs/react';
import { ChevronRight, Clock3, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MenuIcon } from '@/components/admin/menu-icon';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { MenuNavigationItem } from '@/types/navigation';

type CommandMenuItem = {
    id: number;
    title: string;
    href: string;
    icon: string | null;
    path: string;
};

const availableMenuIcons = new Set([
    'LayoutDashboard',
    'FileText',
    'ChartColumn',
    'Users',
    'Landmark',
    'Wallet',
    'ShieldCheck',
    'UserRoundCog',
    'Settings',
    'PanelsTopLeft',
    'ChartNoAxesCombined',
    'Activity',
]);

function resolveMenuIcon(
    icon: string | null,
    inheritedIcon: string | null = null,
): string | null {
    const hasSpecificIcon =
        availableMenuIcons.has(icon ?? '') &&
        (icon !== 'PanelsTopLeft' || inheritedIcon === null);

    return hasSpecificIcon ? icon : (inheritedIcon ?? icon);
}

function flattenMenuItems(
    items: MenuNavigationItem[],
    ancestors: string[] = [],
    inheritedIcon: string | null = null,
): CommandMenuItem[] {
    return items.flatMap((item) => {
        const path = ancestors.join(' / ');
        const currentPath = [...ancestors, item.title];
        const icon = resolveMenuIcon(item.icon, inheritedIcon);
        const currentItem = item.href
            ? [
                  {
                      id: item.id,
                      title: item.title,
                      href: item.href,
                      icon,
                      path,
                  },
              ]
            : [];

        return [
            ...currentItem,
            ...flattenMenuItems(item.children, currentPath, icon),
        ];
    });
}

function getExpandableMenuIds(items: MenuNavigationItem[]): number[] {
    return items.flatMap((item) => (item.children.length > 0 ? [item.id] : []));
}

type AppCommandMenuProps = {
    compact?: boolean;
};

export function AppCommandMenu({ compact = false }: AppCommandMenuProps) {
    const { auth, menuItems } = usePage().props;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(
        () => new Set(getExpandableMenuIds(menuItems)),
    );
    const [recentItems, setRecentItems] = useState<CommandMenuItem[]>([]);

    const storageKey = `bpr-report:recent-menus:${auth.user?.id ?? 'guest'}`;
    const commandItems = useMemo(
        () => flattenMenuItems(menuItems),
        [menuItems],
    );
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredItems = useMemo(
        () =>
            commandItems.filter((item) => {
                if (normalizedQuery === '') {
                    return true;
                }

                return `${item.title} ${item.path}`
                    .toLocaleLowerCase()
                    .includes(normalizedQuery);
            }),
        [commandItems, normalizedQuery],
    );

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const stored = window.localStorage.getItem(storageKey);
            const parsed: unknown = stored ? JSON.parse(stored) : [];

            if (Array.isArray(parsed)) {
                const accessibleIds = new Set(
                    commandItems.map((item) => item.id),
                );
                setRecentItems(
                    parsed.filter(
                        (item): item is CommandMenuItem =>
                            typeof item === 'object' &&
                            item !== null &&
                            typeof (item as CommandMenuItem).id === 'number' &&
                            accessibleIds.has((item as CommandMenuItem).id) &&
                            typeof (item as CommandMenuItem).title ===
                                'string' &&
                            typeof (item as CommandMenuItem).href === 'string',
                    ),
                );
            }
        } catch {
            setRecentItems([]);
        }
    }, [commandItems, storageKey]);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent): void => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleShortcut);

        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
        }
    }, [open]);

    const toggleExpanded = (id: number): void => {
        setExpandedIds((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const openMenu = (item: CommandMenuItem): void => {
        setRecentItems((current) => {
            const next = [
                item,
                ...current.filter((recentItem) => recentItem.id !== item.id),
            ].slice(0, 6);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(storageKey, JSON.stringify(next));
            }

            return next;
        });
        setOpen(false);
        router.visit(item.href, { preserveScroll: false });
    };

    const clearRecentItems = (): void => {
        setRecentItems([]);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(storageKey);
        }
    };

    const renderTree = (
        items: MenuNavigationItem[],
        ancestors: string[] = [],
        inheritedIcon: string | null = null,
        depth = 0,
    ): React.ReactNode =>
        items.map((item) => {
            const icon = resolveMenuIcon(item.icon, inheritedIcon);
            const hasChildren = item.children.length > 0;
            const isExpanded = expandedIds.has(item.id);
            const path = ancestors.join(' / ');

            return (
                <div key={item.id}>
                    <div
                        className="flex items-center gap-1 rounded-lg transition-colors hover:bg-slate-100"
                        style={{ paddingLeft: `${8 + depth * 18}px` }}
                    >
                        {hasChildren ? (
                            <button
                                type="button"
                                aria-label={`${isExpanded ? 'Tutup' : 'Buka'} ${item.title}`}
                                aria-expanded={isExpanded}
                                onClick={() => toggleExpanded(item.id)}
                                className="flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-700"
                            >
                                <ChevronRight
                                    className={`size-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                            </button>
                        ) : (
                            <span
                                aria-hidden="true"
                                className="size-7 shrink-0"
                            />
                        )}
                        {item.href ? (
                            <button
                                type="button"
                                onClick={() =>
                                    openMenu({
                                        id: item.id,
                                        title: item.title,
                                        href: item.href as string,
                                        icon,
                                        path,
                                    })
                                }
                                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left focus-visible:outline-none"
                            >
                                <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                                    <MenuIcon name={icon} className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                                    {item.title}
                                </span>
                            </button>
                        ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <MenuIcon name={icon} className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                                    {item.title}
                                </span>
                            </div>
                        )}
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="ml-5 border-l border-slate-200">
                            {renderTree(
                                item.children,
                                [...ancestors, item.title],
                                icon,
                                depth + 1,
                            )}
                        </div>
                    )}
                </div>
            );
        });

    return (
        <>
            <button
                type="button"
                aria-label="Cari menu"
                onClick={() => setOpen(true)}
                className={
                    compact
                        ? 'group inline-flex size-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900'
                        : 'flex h-11 w-[min(360px,36vw)] items-center gap-3 rounded-xl border border-slate-200 bg-[#F8FAFD] px-4 text-left transition-colors hover:border-slate-300 xl:w-[430px]'
                }
            >
                <Search
                    className={
                        compact
                            ? 'size-5 opacity-80 group-hover:opacity-100'
                            : 'size-[18px] shrink-0 text-slate-400'
                    }
                />
                {!compact && (
                    <>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-400">
                            Cari laporan, nasabah, atau menu...
                        </span>
                        <kbd className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-400">
                            ⌘ K
                        </kbd>
                    </>
                )}
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
                    <DialogTitle className="sr-only">Cari menu</DialogTitle>
                    <DialogDescription className="sr-only">
                        Cari dan buka menu yang tersedia untuk role Anda.
                    </DialogDescription>
                    <div className="flex items-center gap-3 border-b border-slate-200 px-4">
                        <Search className="size-5 shrink-0 text-slate-400" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Cari menu yang bisa Anda akses..."
                            className="h-14 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                        />
                        <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">
                            ESC
                        </kbd>
                    </div>

                    <div className="max-h-[min(65vh,560px)] overflow-y-auto p-2">
                        {normalizedQuery === '' ? (
                            <>
                                {recentItems.length > 0 && (
                                    <section className="mb-3">
                                        <div className="flex items-center justify-between px-3 py-2">
                                            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                                <Clock3 className="size-3.5" />
                                                Terakhir dibuka
                                            </p>
                                            <button
                                                type="button"
                                                onClick={clearRecentItems}
                                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
                                            >
                                                <X className="size-3.5" />
                                                Bersihkan
                                            </button>
                                        </div>
                                        <div className="space-y-0.5">
                                            {recentItems.map((item) => (
                                                <button
                                                    key={`recent-${item.id}`}
                                                    type="button"
                                                    onClick={() =>
                                                        openMenu(item)
                                                    }
                                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                                                >
                                                    <Clock3 className="size-4 shrink-0 text-slate-400" />
                                                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                                        {item.title}
                                                    </span>
                                                    <span className="truncate text-xs text-slate-400">
                                                        {item.path}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                <section>
                                    <p className="px-3 py-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                        Semua menu
                                    </p>
                                    <div>{renderTree(menuItems)}</div>
                                </section>
                            </>
                        ) : filteredItems.length > 0 ? (
                            <div
                                role="listbox"
                                aria-label="Hasil pencarian menu"
                            >
                                {filteredItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="option"
                                        onClick={() => openMenu(item)}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
                                    >
                                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                            <MenuIcon
                                                name={item.icon}
                                                className="size-4"
                                            />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-slate-800">
                                                {item.title}
                                            </span>
                                            {item.path && (
                                                <span className="mt-0.5 block truncate text-xs text-slate-400">
                                                    {item.path}
                                                </span>
                                            )}
                                        </span>
                                        <ChevronRight className="size-4 shrink-0 text-slate-300" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="px-3 py-12 text-center text-sm text-slate-500">
                                Menu tidak ditemukan atau tidak tersedia untuk
                                role Anda.
                            </p>
                        )}
                    </div>
                    <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
                        Menu ditampilkan sesuai akses role Anda.
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
