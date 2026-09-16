import {
    useEffect,
    useMemo,
    useState,
    type DragEvent,
    type ReactNode,
} from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    ChevronRight,
    CircleOff,
    Ellipsis,
    FolderTree,
    GripVertical,
    Link2,
    ListTree,
    Pencil,
    Plus,
    Route,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { MenuFormDialog } from '@/components/admin/menu-form-dialog';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
    destroy as deleteMenu,
    reorder as reorderMenus,
} from '@/routes/admin/menus';

type Role = {
    id: number;
    name: string;
};

type Parent = {
    id: number;
    parent_id: number | null;
    title: string;
};

type MenuRecord = {
    id: number;
    parent_id: number | null;
    title: string;
    route_name: string | null;
    url: string | null;
    icon: string | null;
    sort_order: number;
    status: boolean;
    role_restricted: boolean;
    roles: Role[];
    parent: { id: number; title: string } | null;
    children_count: number;
};

type MenuNode = MenuRecord & {
    children: MenuNode[];
};

type ReorderItem = {
    id: number;
    parent_id: number | null;
    position: number;
};

type Filters = {
    search: string;
    status: 'active' | 'inactive' | 'all';
};

type MenuIndexProps = {
    menus: MenuRecord[];
    parents: Parent[];
    roles: Role[];
    routeNames: string[];
    icons: string[];
    filters: Filters;
};

type DropTarget = {
    id: number | null;
    placement: 'before' | 'inside' | 'after' | 'root';
};

const roleBadgeClassNames = [
    'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
    'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
] as const;

function getRoleBadgeClassName(roleId: number): string {
    const colorIndex = Math.abs(roleId - 1) % roleBadgeClassNames.length;

    return roleBadgeClassNames[colorIndex] ?? roleBadgeClassNames[0];
}

function buildMenuTree(records: MenuRecord[]): MenuNode[] {
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const childrenByParent = new Map<number, MenuRecord[]>();

    for (const record of records) {
        if (record.parent_id === null || !recordsById.has(record.parent_id)) {
            continue;
        }

        const siblings = childrenByParent.get(record.parent_id) ?? [];
        siblings.push(record);
        childrenByParent.set(record.parent_id, siblings);
    }

    for (const siblings of childrenByParent.values()) {
        siblings.sort(
            (left, right) =>
                left.sort_order - right.sort_order || left.id - right.id,
        );
    }

    const includedIds = new Set<number>();

    const buildNode = (
        record: MenuRecord,
        ancestorIds: Set<number>,
    ): MenuNode | null => {
        if (ancestorIds.has(record.id)) {
            return null;
        }

        const nextAncestors = new Set(ancestorIds).add(record.id);
        includedIds.add(record.id);

        return {
            ...record,
            children: (childrenByParent.get(record.id) ?? [])
                .map((child) => buildNode(child, nextAncestors))
                .filter((child): child is MenuNode => child !== null),
        };
    };

    const roots = records.filter(
        (record) =>
            record.parent_id === null || !recordsById.has(record.parent_id),
    );
    const tree = roots
        .map((record) => buildNode(record, new Set()))
        .filter((node): node is MenuNode => node !== null);

    // Keep legacy rows with a broken cycle visible so an administrator can repair them.
    for (const record of records) {
        if (!includedIds.has(record.id)) {
            const orphan = buildNode(record, new Set());

            if (orphan) {
                tree.push(orphan);
            }
        }
    }

    return tree;
}

function serializeMenuTree(
    nodes: MenuNode[],
    parentId: number | null = null,
): ReorderItem[] {
    return nodes.flatMap((node, position) => [
        { id: node.id, parent_id: parentId, position },
        ...serializeMenuTree(node.children, node.id),
    ]);
}

function cloneMenuTree(nodes: MenuNode[]): MenuNode[] {
    return nodes.map((node) => ({
        ...node,
        children: cloneMenuTree(node.children),
    }));
}

function removeMenuNode(nodes: MenuNode[], id: number): MenuNode | null {
    const index = nodes.findIndex((node) => node.id === id);

    if (index >= 0) {
        return nodes.splice(index, 1)[0] ?? null;
    }

    for (const node of nodes) {
        const removed = removeMenuNode(node.children, id);

        if (removed) {
            return removed;
        }
    }

    return null;
}

function containsMenuId(node: MenuNode, id: number): boolean {
    return (
        node.id === id ||
        node.children.some((child) => containsMenuId(child, id))
    );
}

function insertMenuNode(
    nodes: MenuNode[],
    targetId: number,
    node: MenuNode,
    placement: 'before' | 'inside' | 'after',
): boolean {
    const targetIndex = nodes.findIndex(
        (candidate) => candidate.id === targetId,
    );

    if (targetIndex >= 0) {
        if (placement === 'inside') {
            nodes[targetIndex]?.children.push(node);
        } else {
            nodes.splice(
                targetIndex + (placement === 'after' ? 1 : 0),
                0,
                node,
            );
        }

        return true;
    }

    return nodes.some((candidate) =>
        insertMenuNode(candidate.children, targetId, node, placement),
    );
}

function moveMenuNode(
    currentTree: MenuNode[],
    movingId: number,
    targetId: number,
    placement: 'before' | 'inside' | 'after',
): MenuNode[] | null {
    const nextTree = cloneMenuTree(currentTree);
    const movingNode = removeMenuNode(nextTree, movingId);

    if (!movingNode || containsMenuId(movingNode, targetId)) {
        return null;
    }

    return insertMenuNode(nextTree, targetId, movingNode, placement)
        ? nextTree
        : null;
}

function moveMenuToRoot(
    currentTree: MenuNode[],
    movingId: number,
): MenuNode[] | null {
    const nextTree = cloneMenuTree(currentTree);
    const movingNode = removeMenuNode(nextTree, movingId);

    if (!movingNode) {
        return null;
    }

    nextTree.push(movingNode);

    return nextTree;
}

function filterMenuTree(
    nodes: MenuNode[],
    search: string,
    status: Filters['status'],
): MenuNode[] {
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return nodes.flatMap((node) => {
        const children = filterMenuTree(node.children, search, status);
        const matchesSearch =
            normalizedSearch === '' ||
            node.title.toLocaleLowerCase().includes(normalizedSearch) ||
            (node.route_name?.toLocaleLowerCase().includes(normalizedSearch) ??
                false) ||
            (node.url?.toLocaleLowerCase().includes(normalizedSearch) ?? false);
        const matchesStatus =
            status === 'all' ||
            (status === 'active' ? node.status : !node.status);

        if ((!matchesSearch || !matchesStatus) && children.length === 0) {
            return [];
        }

        return [{ ...node, children }];
    });
}

function countMenuNodes(nodes: MenuNode[]): number {
    return nodes.reduce(
        (count, node) => count + 1 + countMenuNodes(node.children),
        0,
    );
}

function flattenMenuNodes(nodes: MenuNode[]): MenuNode[] {
    return nodes.flatMap((node) => [node, ...flattenMenuNodes(node.children)]);
}

function getExpandableMenuIds(nodes: MenuNode[]): Set<number> {
    const ids = new Set<number>();

    for (const node of nodes) {
        if (node.children.length > 0) {
            ids.add(node.id);
            getExpandableMenuIds(node.children).forEach((id) => ids.add(id));
        }
    }

    return ids;
}

function getDropPlacement(
    event: DragEvent<HTMLTableRowElement>,
    movingNode: MenuNode | undefined,
    targetId: number,
): 'before' | 'inside' | 'after' {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = (event.clientY - bounds.top) / bounds.height;

    if (offset < 0.25) {
        return 'before';
    }

    if (offset > 0.75) {
        return 'after';
    }

    return movingNode && containsMenuId(movingNode, targetId)
        ? offset < 0.5
            ? 'before'
            : 'after'
        : 'inside';
}

export default function MenuIndex({
    menus,
    parents,
    roles,
    routeNames,
    icons,
    filters,
}: MenuIndexProps) {
    const [menuTree, setMenuTree] = useState(() => buildMenuTree(menus));
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState<Filters['status']>(filters.status);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(
        () => new Set(),
    );
    const [draggingMenuId, setDraggingMenuId] = useState<number | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [menuDialogOpen, setMenuDialogOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuRecord | null>(null);
    const [menuToDelete, setMenuToDelete] = useState<MenuRecord | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [reordering, setReordering] = useState(false);

    useEffect(() => {
        const nextTree = buildMenuTree(menus);
        setMenuTree(nextTree);
        setExpandedIds(new Set());
    }, [menus]);

    const visibleTree = useMemo(
        () => filterMenuTree(menuTree, search, status),
        [menuTree, search, status],
    );
    const visibleCount = countMenuNodes(visibleTree);
    const groupCount = menus.filter((menu) => menu.children_count > 0).length;
    const activeCount = menus.filter((menu) => menu.status).length;
    const menuNodesById = useMemo(
        () =>
            new Map(flattenMenuNodes(menuTree).map((node) => [node.id, node])),
        [menuTree],
    );

    const openCreateDialog = () => {
        setEditingMenu(null);
        setMenuDialogOpen(true);
    };

    const persistTree = (nextTree: MenuNode[]) => {
        const currentItems = serializeMenuTree(menuTree);
        const nextItems = serializeMenuTree(nextTree);

        if (JSON.stringify(currentItems) === JSON.stringify(nextItems)) {
            return;
        }

        setMenuTree(nextTree);
        setReordering(true);
        router.put(
            reorderMenus().url,
            { items: nextItems },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setMenuTree(buildMenuTree(menus));
                    toast.error(
                        Object.values(errors)[0] ??
                            'Susunan menu gagal disimpan.',
                    );
                },
                onFinish: () => setReordering(false),
            },
        );
    };

    const handleDropOnMenu = (
        event: DragEvent<HTMLTableRowElement>,
        targetId: number,
    ) => {
        event.preventDefault();
        const movingId = Number(event.dataTransfer.getData('text/menu-id'));
        const movingNode = menuNodesById.get(movingId);

        if (!movingId || movingId === targetId || !movingNode) {
            return;
        }

        const placement = getDropPlacement(event, movingNode, targetId);
        const nextTree = moveMenuNode(menuTree, movingId, targetId, placement);

        if (nextTree) {
            persistTree(nextTree);
        }

        setDropTarget(null);
        setDraggingMenuId(null);
    };

    const handleDropOnRoot = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const movingId = Number(event.dataTransfer.getData('text/menu-id'));
        const nextTree = moveMenuToRoot(menuTree, movingId);

        if (movingId && nextTree) {
            persistTree(nextTree);
        }

        setDropTarget(null);
        setDraggingMenuId(null);
    };

    const confirmDelete = () => {
        if (!menuToDelete) {
            return;
        }

        setDeleting(true);
        router.delete(deleteMenu(menuToDelete.id).url, {
            preserveScroll: true,
            onSuccess: () => setMenuToDelete(null),
            onError: (errors) => {
                toast.error(
                    Object.values(errors)[0] ?? 'Menu tidak dapat dihapus.',
                );
            },
            onFinish: () => setDeleting(false),
        });
    };

    const renderMenuRows = (nodes: MenuNode[], depth = 0): ReactNode[] =>
        nodes.flatMap((node) => {
            const isExpanded =
                expandedIds.has(node.id) ||
                search.trim() !== '' ||
                status !== 'all';
            const target =
                dropTarget?.id === node.id ? dropTarget.placement : null;
            const row = (
                <TableRow
                    key={node.id}
                    onDragOver={(event) => {
                        if (draggingMenuId === null || reordering) {
                            return;
                        }

                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        const movingNode = menuNodesById.get(draggingMenuId);
                        const placement = movingNode
                            ? getDropPlacement(event, movingNode, node.id)
                            : 'before';

                        setDropTarget((current) =>
                            current?.id === node.id &&
                            current.placement === placement
                                ? current
                                : { id: node.id, placement },
                        );
                    }}
                    onDrop={(event) => handleDropOnMenu(event, node.id)}
                    className={cn(
                        'transition-colors',
                        draggingMenuId === node.id && 'opacity-50',
                        target === 'before' && 'border-t-primary border-t-2',
                        target === 'after' && 'border-b-primary border-b-2',
                        target === 'inside' &&
                            'bg-primary/10 outline-primary outline outline-2',
                    )}
                >
                    <TableCell className="py-2.5">
                        <div
                            className="flex min-w-0 items-center gap-2"
                            style={{ paddingLeft: `${depth * 24}px` }}
                        >
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Pindahkan ${node.title}`}
                                title="Tarik untuk memindahkan atau mengubah tingkat menu"
                                draggable={!reordering}
                                disabled={reordering}
                                onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = 'move';
                                    event.dataTransfer.setData(
                                        'text/menu-id',
                                        String(node.id),
                                    );
                                    setDraggingMenuId(node.id);
                                }}
                                onDragEnd={() => {
                                    setDraggingMenuId(null);
                                    setDropTarget(null);
                                }}
                                className="text-muted-foreground cursor-grab active:cursor-grabbing"
                            >
                                <GripVertical />
                            </Button>
                            {node.children.length > 0 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`${isExpanded ? 'Tutup' : 'Buka'} submenu ${node.title}`}
                                    onClick={() =>
                                        setExpandedIds((current) => {
                                            const next = new Set(current);

                                            if (next.has(node.id)) {
                                                next.delete(node.id);
                                            } else {
                                                next.add(node.id);
                                            }

                                            return next;
                                        })
                                    }
                                >
                                    {isExpanded ? (
                                        <ChevronDown />
                                    ) : (
                                        <ChevronRight />
                                    )}
                                </Button>
                            ) : (
                                <span className="size-8 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="text-foreground truncate font-medium">
                                        {node.title}
                                    </span>
                                    {node.children.length > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="rounded-full font-normal"
                                        >
                                            {node.children.length} submenu
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-xs">
                                    {node.parent ? (
                                        <>
                                            <FolderTree />
                                            <span className="truncate">
                                                Di bawah {node.parent.title}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <ListTree />
                                            <span>Menu utama</span>
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {node.route_name ? (
                            <span className="flex max-w-56 items-center gap-2">
                                <Route className="text-muted-foreground shrink-0" />
                                <code className="text-muted-foreground truncate text-xs">
                                    {node.route_name}
                                </code>
                            </span>
                        ) : node.url ? (
                            <span className="flex max-w-56 items-center gap-2">
                                <Link2 className="text-muted-foreground shrink-0" />
                                <code className="text-muted-foreground truncate text-xs">
                                    {node.url}
                                </code>
                            </span>
                        ) : (
                            <Badge
                                variant="outline"
                                className="text-muted-foreground rounded-full font-normal"
                            >
                                Grup navigasi
                            </Badge>
                        )}
                    </TableCell>
                    <TableCell>
                        <div className="flex max-w-52 flex-wrap gap-1.5">
                            {node.roles.length > 0 ? (
                                <>
                                    {node.roles.slice(0, 2).map((role) => (
                                        <Badge
                                            key={role.id}
                                            variant="secondary"
                                            className={cn(
                                                'rounded-full',
                                                getRoleBadgeClassName(role.id),
                                            )}
                                        >
                                            {role.name}
                                        </Badge>
                                    ))}
                                    {node.roles.length > 2 && (
                                        <Badge
                                            variant="outline"
                                            className="rounded-full"
                                            title={node.roles
                                                .slice(2)
                                                .map((role) => role.name)
                                                .join(', ')}
                                        >
                                            +{node.roles.length - 2}
                                        </Badge>
                                    )}
                                </>
                            ) : (
                                <Badge
                                    variant="outline"
                                    className="text-muted-foreground rounded-full font-normal"
                                >
                                    Semua pengguna
                                </Badge>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge
                            variant="secondary"
                            className={cn(
                                'rounded-full',
                                node.status
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                            )}
                        >
                            {node.status ? (
                                <Check data-icon="inline-start" />
                            ) : (
                                <CircleOff data-icon="inline-start" />
                            )}
                            {node.status ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Aksi untuk ${node.title}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuItem
                                        className="text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800 dark:text-emerald-300 dark:focus:bg-emerald-950"
                                        onSelect={() => {
                                            setEditingMenu(node);
                                            setMenuDialogOpen(true);
                                        }}
                                    >
                                        <Pencil data-icon="inline-start" />
                                        Ubah menu
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={() => setMenuToDelete(node)}
                                    >
                                        <Trash2 data-icon="inline-start" />
                                        Hapus menu
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
            );

            return [
                row,
                ...(isExpanded ? renderMenuRows(node.children, depth + 1) : []),
            ];
        });

    const allExpandableIds = getExpandableMenuIds(menuTree);
    const allExpanded =
        allExpandableIds.size > 0 &&
        [...allExpandableIds].every((id) => expandedIds.has(id));

    return (
        <>
            <Head title="Menu Builder" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Menu Builder"
                    description="Bangun navigasi sidebar dengan tingkat menu tanpa batas, atur akses role, lalu susun posisinya dengan drag-and-drop."
                    breadcrumbs={[{ title: 'Menu Builder' }]}
                    action={
                        <Button
                            type="button"
                            onClick={openCreateDialog}
                            className="h-11 rounded-xl px-4"
                        >
                            <Plus data-icon="inline-start" />
                            Tambah menu
                        </Button>
                    }
                />

                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <Card className="border-border/80 bg-background gap-0 rounded-2xl shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                                <ListTree />
                            </span>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    Total menu
                                </p>
                                <p className="text-foreground text-lg font-semibold tabular-nums">
                                    {menus.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 bg-background gap-0 rounded-2xl shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                                <FolderTree />
                            </span>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    Menu dengan submenu
                                </p>
                                <p className="text-foreground text-lg font-semibold tabular-nums">
                                    {groupCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/80 bg-background gap-0 rounded-2xl shadow-none">
                        <CardContent className="flex items-center gap-3 p-4">
                            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                                <Check />
                            </span>
                            <div>
                                <p className="text-muted-foreground text-xs">
                                    Menu aktif
                                </p>
                                <p className="text-foreground text-lg font-semibold tabular-nums">
                                    {activeCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/80 bg-background gap-0 overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(15,23,42,0.035)]">
                    <CardHeader className="border-border/70 gap-4 border-b px-5 py-5 sm:px-6 lg:flex-col lg:items-stretch">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="bg-primary/10 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
                                <FolderTree />
                            </span>
                            <div className="flex min-w-0 flex-col gap-1">
                                <CardTitle className="text-base">
                                    Struktur menu
                                </CardTitle>
                                <CardDescription>
                                    Tarik handle untuk mengurutkan atau mengubah
                                    parent. Lepas di tengah baris untuk
                                    menjadikannya submenu.
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:flex-row lg:items-center">
                            <div className="relative w-full sm:min-w-64 sm:flex-1">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2" />
                                <Input
                                    aria-label="Cari menu"
                                    className="h-10 rounded-xl pr-10 pl-9"
                                    placeholder="Cari nama, route, atau path..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />
                                {search !== '' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Hapus pencarian"
                                        className="absolute top-1/2 right-1 -translate-y-1/2 text-slate-400"
                                        onClick={() => setSearch('')}
                                    >
                                        <X className="size-4" />
                                    </Button>
                                )}
                            </div>
                            <Select
                                value={status}
                                onValueChange={(value) =>
                                    setStatus(value as Filters['status'])
                                }
                            >
                                <SelectTrigger
                                    className="h-10 w-full rounded-xl sm:w-40"
                                    aria-label="Filter status menu"
                                >
                                    <SelectValue placeholder="Semua status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua status
                                        </SelectItem>
                                        <SelectItem value="active">
                                            Aktif
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Nonaktif
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 shrink-0 rounded-xl"
                                disabled={allExpandableIds.size === 0}
                                onClick={() =>
                                    setExpandedIds(
                                        allExpanded
                                            ? new Set()
                                            : allExpandableIds,
                                    )
                                }
                            >
                                {allExpanded ? 'Tutup semua' : 'Buka semua'}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-5">
                        <div
                            onDragOver={(event) => {
                                if (draggingMenuId !== null && !reordering) {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                    setDropTarget({
                                        id: null,
                                        placement: 'root',
                                    });
                                }
                            }}
                            onDrop={handleDropOnRoot}
                            className={cn(
                                'text-muted-foreground mb-3 flex min-h-10 items-center justify-center rounded-xl border border-dashed px-3 text-xs transition-colors',
                                dropTarget?.placement === 'root'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border/80',
                            )}
                        >
                            Lepaskan di sini untuk menjadikan menu utama
                        </div>

                        <div className="overflow-x-auto rounded-xl border">
                            <Table className="min-w-[900px]">
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="w-[42%]">
                                            Navigasi
                                        </TableHead>
                                        <TableHead>Tujuan</TableHead>
                                        <TableHead>Akses role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-14 text-right">
                                            <span className="sr-only">
                                                Aksi
                                            </span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleCount > 0 ? (
                                        renderMenuRows(visibleTree)
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="p-0"
                                            >
                                                <Empty className="min-h-64 rounded-none border-0">
                                                    <EmptyHeader>
                                                        <EmptyMedia variant="icon">
                                                            <Search />
                                                        </EmptyMedia>
                                                        <EmptyTitle>
                                                            {menus.length === 0
                                                                ? 'Menu belum tersedia'
                                                                : 'Menu tidak ditemukan'}
                                                        </EmptyTitle>
                                                        <EmptyDescription>
                                                            {menus.length === 0
                                                                ? 'Tambahkan menu pertama untuk mulai membangun navigasi sidebar.'
                                                                : 'Coba kata kunci lain atau ubah filter status.'}
                                                        </EmptyDescription>
                                                    </EmptyHeader>
                                                </Empty>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="text-muted-foreground flex flex-col gap-2 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Menampilkan {visibleCount} dari {menus.length}{' '}
                                menu
                            </span>
                            {reordering ? (
                                <span className="text-primary">
                                    Menyimpan susunan…
                                </span>
                            ) : (
                                <span>
                                    Urutan tersimpan otomatis setelah dilepas.
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </main>

            <MenuFormDialog
                open={menuDialogOpen}
                menu={editingMenu}
                roles={roles}
                parents={parents}
                routeNames={routeNames}
                icons={icons}
                onOpenChange={setMenuDialogOpen}
            />
            <ConfirmDeleteDialog
                open={menuToDelete !== null}
                title="Hapus menu?"
                description={`Menu ${menuToDelete?.title ?? ''} akan dihapus dari sidebar. Menu induk harus dikosongkan dulu.`}
                processing={deleting}
                onOpenChange={(open) => !open && setMenuToDelete(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
}
