import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    CheckCheck,
    ChevronDown,
    ChevronRight,
    FolderTree,
    LockKeyhole,
    Search,
    ShieldCheck,
    UnlockKeyhole,
    UsersRound,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
    index as roleAccessIndex,
    update as updateRoleAccess,
} from '@/routes/admin/role-access';

type Role = {
    id: number;
    name: string;
    slug: string | null;
    users_count: number;
};

type MenuRecord = {
    id: number;
    parent_id: number | null;
    title: string;
    path: string;
    depth: number;
    sort_order: number;
    status: boolean;
    role_restricted: boolean;
    has_access: boolean;
};

type MenuNode = MenuRecord & {
    children: MenuNode[];
};

type RoleAccessIndexProps = {
    roles: Role[];
    selectedRole: Role | null;
    menus: MenuRecord[];
};

type RoleAccessFormData = {
    menu_ids: number[];
};

function buildMenuTree(records: MenuRecord[]): MenuNode[] {
    const recordsById = new Map(records.map((record) => [record.id, record]));
    const childrenByParent = new Map<number, MenuRecord[]>();

    for (const record of records) {
        if (record.parent_id === null || !recordsById.has(record.parent_id)) {
            continue;
        }

        const children = childrenByParent.get(record.parent_id) ?? [];
        children.push(record);
        childrenByParent.set(record.parent_id, children);
    }

    for (const children of childrenByParent.values()) {
        children.sort(
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

        includedIds.add(record.id);
        const nextAncestorIds = new Set(ancestorIds).add(record.id);

        return {
            ...record,
            children: (childrenByParent.get(record.id) ?? [])
                .map((child) => buildNode(child, nextAncestorIds))
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

    // Keep legacy cyclic menu rows visible so administrators can still manage them.
    for (const record of records) {
        if (includedIds.has(record.id)) {
            continue;
        }

        const orphan = buildNode(record, new Set());

        if (orphan) {
            tree.push(orphan);
        }
    }

    return tree;
}

function filterMenuTree(nodes: MenuNode[], query: string): MenuNode[] {
    if (query === '') {
        return nodes;
    }

    return nodes.flatMap((node) => {
        const matches = `${node.title} ${node.path}`
            .toLocaleLowerCase()
            .includes(query);
        const children = filterMenuTree(node.children, query);

        if (!matches && children.length === 0) {
            return [];
        }

        return [{ ...node, children: matches ? node.children : children }];
    });
}

function getSubtreeIds(node: MenuNode): number[] {
    return [node.id, ...node.children.flatMap(getSubtreeIds)];
}

function getExpandableIds(nodes: MenuNode[]): number[] {
    return nodes.flatMap((node) => [
        ...(node.children.length > 0 ? [node.id] : []),
        ...getExpandableIds(node.children),
    ]);
}

function hasRoleSlug(slug: string | null): slug is string {
    return slug !== null && slug.trim() !== '' && slug.toLowerCase() !== 'null';
}

function MenuAccessItem({
    menu,
    roleName,
    selectedIds,
    expandedIds,
    onToggleMenu,
    onToggleExpanded,
}: {
    menu: MenuNode;
    roleName: string;
    selectedIds: Set<number>;
    expandedIds: Set<number>;
    onToggleMenu: (menu: MenuNode) => void;
    onToggleExpanded: (menuId: number) => void;
}) {
    const ids = getSubtreeIds(menu);
    const selectedCount = ids.filter((id) => selectedIds.has(id)).length;
    const checked: boolean | 'indeterminate' =
        selectedCount === 0
            ? false
            : selectedCount === ids.length
              ? true
              : 'indeterminate';
    const hasChildren = menu.children.length > 0;
    const isExpanded = expandedIds.has(menu.id);
    const checkboxId = `role-${roleName}-menu-${menu.id}`;

    return (
        <li className="min-w-0">
            <div
                className={cn(
                    'group flex min-h-12 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50',
                    checked === true && 'bg-primary/[0.045]',
                )}
                style={{
                    paddingLeft: `${10 + Math.min(menu.depth, 4) * 17}px`,
                }}
            >
                {hasChildren ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${isExpanded ? 'Tutup' : 'Buka'} submenu ${menu.title}`}
                        aria-expanded={isExpanded}
                        onClick={() => onToggleExpanded(menu.id)}
                        className="hover:text-primary size-7 shrink-0 rounded-md text-slate-500"
                    >
                        {isExpanded ? (
                            <ChevronDown className="size-4" />
                        ) : (
                            <ChevronRight className="size-4" />
                        )}
                    </Button>
                ) : (
                    <span aria-hidden="true" className="size-7 shrink-0" />
                )}
                <Checkbox
                    id={checkboxId}
                    checked={checked}
                    aria-label={`Akses ${menu.path} untuk role ${roleName}`}
                    onCheckedChange={() => onToggleMenu(menu)}
                    className="size-[17px]"
                />
                <label
                    htmlFor={checkboxId}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3"
                >
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-slate-950">
                            {menu.title}
                        </span>
                        {menu.role_restricted ? (
                            <span className="mt-0.5 block truncate font-mono text-[11px] text-slate-500">
                                {menu.path}
                            </span>
                        ) : (
                            <span className="mt-0.5 block text-[11px] text-slate-500">
                                Dapat dilihat semua role
                            </span>
                        )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                        {!menu.status && (
                            <Badge variant="outline" className="text-[10px]">
                                Nonaktif
                            </Badge>
                        )}
                        {hasChildren && (
                            <Badge
                                variant="secondary"
                                className="font-normal text-slate-600"
                            >
                                {menu.children.length} submenu
                            </Badge>
                        )}
                    </span>
                </label>
            </div>
            {hasChildren && isExpanded && (
                <ul className="ml-5 border-l border-slate-200/80 pl-2">
                    {menu.children.map((child) => (
                        <MenuAccessItem
                            key={child.id}
                            menu={child}
                            roleName={roleName}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onToggleMenu={onToggleMenu}
                            onToggleExpanded={onToggleExpanded}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function RoleAccessIndex({
    roles,
    selectedRole,
    menus,
}: RoleAccessIndexProps) {
    const [search, setSearch] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<number>>(
        () => new Set(),
    );
    const form = useForm<RoleAccessFormData>({
        menu_ids: menus
            .filter((menu) => menu.has_access)
            .map((menu) => menu.id),
    });

    useEffect(() => {
        form.setData(
            'menu_ids',
            menus.filter((menu) => menu.has_access).map((menu) => menu.id),
        );
        form.clearErrors();
        setSearch('');
    }, [selectedRole?.id, menus]);

    const menuTree = useMemo(() => buildMenuTree(menus), [menus]);
    const filteredTree = useMemo(
        () => filterMenuTree(menuTree, search.trim().toLocaleLowerCase()),
        [menuTree, search],
    );
    const selectedIds = useMemo(
        () => new Set(form.data.menu_ids),
        [form.data.menu_ids],
    );
    const roleOptions: ComboboxOption[] = roles.map((role) => ({
        value: String(role.id),
        label: [
            role.name,
            hasRoleSlug(role.slug) ? role.slug : null,
            `${role.users_count} pengguna`,
        ]
            .filter((value): value is string => value !== null)
            .join(' · '),
    }));
    const selectedCount = form.data.menu_ids.length;
    const unrestrictedCount = menus.filter(
        (menu) => !menu.role_restricted,
    ).length;
    const activeCount = menus.filter((menu) => menu.status).length;

    const changeRole = (roleId: string): void => {
        router.get(
            roleAccessIndex.url({ query: { role: Number(roleId) } }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: ['roles', 'selectedRole', 'menus'],
            },
        );
    };

    const toggleMenu = (menu: MenuNode): void => {
        const menuIds = getSubtreeIds(menu);
        const shouldSelect = menuIds.some((id) => !selectedIds.has(id));
        const nextSelectedIds = new Set(selectedIds);

        for (const id of menuIds) {
            if (shouldSelect) {
                nextSelectedIds.add(id);
            } else {
                nextSelectedIds.delete(id);
            }
        }

        form.setData('menu_ids', [...nextSelectedIds]);
    };

    const toggleExpanded = (menuId: number): void => {
        setExpandedIds((current) => {
            const next = new Set(current);

            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
            }

            return next;
        });
    };

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        if (!selectedRole) {
            return;
        }

        form.put(updateRoleAccess.url(selectedRole.id), {
            preserveScroll: true,
        });
    };

    const selectAll = (): void => {
        form.setData(
            'menu_ids',
            menus.map((menu) => menu.id),
        );
    };

    const clearAll = (): void => {
        form.setData('menu_ids', []);
    };

    const expandAll = (): void => {
        setExpandedIds(new Set(getExpandableIds(filteredTree)));
    };

    const collapseAll = (): void => {
        setExpandedIds(new Set());
    };

    const allExpandableIds = getExpandableIds(filteredTree);
    const allExpanded =
        allExpandableIds.length > 0 &&
        allExpandableIds.every((id) => expandedIds.has(id));

    return (
        <>
            <Head title="Akses Role" />
            <div className="mx-auto w-full max-w-[1440px] p-5 sm:p-7 lg:p-9">
                <PageHeader
                    title="Akses Role"
                    description="Atur menu yang dapat dibuka setiap role. Perubahan berlaku langsung pada navigasi dan akses halaman."
                    breadcrumbs={[{ title: 'Akses Role' }]}
                />

                <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <Card className="gap-0 rounded-2xl border-slate-200/80 py-0 shadow-sm shadow-slate-200/30">
                        <CardContent className="flex items-center gap-4 p-5">
                            <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                                <ShieldCheck className="size-5" />
                            </span>
                            <div>
                                <p className="text-sm text-slate-500">
                                    Role tersedia
                                </p>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                                    {roles.length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="gap-0 rounded-2xl border-slate-200/80 py-0 shadow-sm shadow-slate-200/30">
                        <CardContent className="flex items-center gap-4 p-5">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <FolderTree className="size-5" />
                            </span>
                            <div>
                                <p className="text-sm text-slate-500">
                                    Menu aktif
                                </p>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                                    {activeCount}
                                    <span className="ml-1 text-sm font-normal text-slate-400">
                                        / {menus.length}
                                    </span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="gap-0 rounded-2xl border-slate-200/80 py-0 shadow-sm shadow-slate-200/30">
                        <CardContent className="flex items-center gap-4 p-5">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <UnlockKeyhole className="size-5" />
                            </span>
                            <div>
                                <p className="text-sm text-slate-500">
                                    Menu untuk semua role
                                </p>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                                    {unrestrictedCount}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {roles.length === 0 ? (
                    <Card className="rounded-2xl border-slate-200/80 shadow-sm">
                        <CardContent className="p-6">
                            <Empty className="min-h-72 rounded-xl border border-dashed border-slate-200">
                                <EmptyHeader>
                                    <EmptyMedia
                                        variant="icon"
                                        className="bg-primary/10 text-primary"
                                    >
                                        <UsersRound />
                                    </EmptyMedia>
                                    <EmptyTitle>Belum ada role</EmptyTitle>
                                    <EmptyDescription>
                                        Buat role terlebih dahulu agar akses
                                        menu dapat diatur.
                                    </EmptyDescription>
                                </EmptyHeader>
                            </Empty>
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={submit}>
                        <Card className="overflow-hidden rounded-2xl border-slate-200/80 py-0 shadow-sm shadow-slate-200/30">
                            <CardHeader className="gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div className="flex items-start gap-3">
                                    <span className="bg-primary/10 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
                                        <LockKeyhole className="size-5" />
                                    </span>
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">
                                            Pilih role
                                        </CardTitle>
                                        <p className="text-sm text-slate-500">
                                            Cari role berdasarkan nama atau kode
                                            role.
                                        </p>
                                    </div>
                                </div>
                                <Field className="w-full sm:max-w-md">
                                    <FieldLabel htmlFor="role-access-role">
                                        Role
                                    </FieldLabel>
                                    <Combobox
                                        id="role-access-role"
                                        value={
                                            selectedRole
                                                ? String(selectedRole.id)
                                                : ''
                                        }
                                        options={roleOptions}
                                        placeholder="Pilih role"
                                        searchPlaceholder="Cari role..."
                                        emptyMessage="Role tidak ditemukan."
                                        onValueChange={changeRole}
                                    />
                                </Field>
                            </CardHeader>

                            {selectedRole ? (
                                <>
                                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className="rounded-full px-2.5 py-1">
                                                {selectedRole.name}
                                            </Badge>
                                            {hasRoleSlug(selectedRole.slug) ? (
                                                <Badge
                                                    variant="outline"
                                                    className="rounded-full px-2.5 py-1 font-mono font-normal"
                                                >
                                                    {selectedRole.slug}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400">
                                                    Kode belum diatur
                                                </span>
                                            )}
                                            <span className="text-sm text-slate-500">
                                                {selectedRole.users_count}{' '}
                                                pengguna
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={selectAll}
                                            >
                                                <CheckCheck />
                                                Pilih semua
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearAll}
                                            >
                                                Hapus pilihan
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    <CardContent className="px-5 py-5 sm:px-6">
                                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                            <div>
                                                <h2 className="text-sm font-semibold text-slate-900">
                                                    Struktur menu
                                                </h2>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    Pilih menu satu per satu
                                                    atau pilih parent untuk
                                                    menerapkan akses ke seluruh
                                                    submenu.
                                                </p>
                                            </div>
                                            <Field className="w-full lg:max-w-sm">
                                                <FieldLabel htmlFor="role-menu-search">
                                                    Cari menu
                                                </FieldLabel>
                                                <div className="relative">
                                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                                    <Input
                                                        id="role-menu-search"
                                                        value={search}
                                                        onChange={(event) =>
                                                            setSearch(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Cari nama atau jalur menu..."
                                                        className="pl-9"
                                                    />
                                                </div>
                                            </Field>
                                        </div>

                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
                                            <p className="text-xs text-slate-600">
                                                <span className="font-semibold text-slate-900">
                                                    {selectedCount}
                                                </span>{' '}
                                                dari {menus.length} menu dipilih
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-slate-600"
                                                onClick={
                                                    allExpanded
                                                        ? collapseAll
                                                        : expandAll
                                                }
                                            >
                                                {allExpanded
                                                    ? 'Tutup semua cabang'
                                                    : 'Buka semua cabang'}
                                            </Button>
                                        </div>

                                        <div className="max-h-[min(68vh,780px)] overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-2">
                                            {filteredTree.length > 0 ? (
                                                <ul className="space-y-0.5">
                                                    {filteredTree.map(
                                                        (menu) => (
                                                            <MenuAccessItem
                                                                key={menu.id}
                                                                menu={menu}
                                                                roleName={String(
                                                                    selectedRole.id,
                                                                )}
                                                                selectedIds={
                                                                    selectedIds
                                                                }
                                                                expandedIds={
                                                                    expandedIds
                                                                }
                                                                onToggleMenu={
                                                                    toggleMenu
                                                                }
                                                                onToggleExpanded={
                                                                    toggleExpanded
                                                                }
                                                            />
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <Empty className="min-h-48">
                                                    <EmptyHeader>
                                                        <EmptyMedia
                                                            variant="icon"
                                                            className="bg-slate-100 text-slate-500"
                                                        >
                                                            <Search />
                                                        </EmptyMedia>
                                                        <EmptyTitle>
                                                            Menu tidak ditemukan
                                                        </EmptyTitle>
                                                        <EmptyDescription>
                                                            Coba kata kunci lain
                                                            atau hapus
                                                            pencarian.
                                                        </EmptyDescription>
                                                    </EmptyHeader>
                                                </Empty>
                                            )}
                                        </div>
                                        {form.errors.menu_ids && (
                                            <p
                                                role="alert"
                                                className="text-destructive mt-2 text-sm"
                                            >
                                                {form.errors.menu_ids}
                                            </p>
                                        )}
                                        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <FieldDescription className="max-w-2xl">
                                                Menu bertanda “Dapat dilihat
                                                semua role” saat ini masih
                                                terbuka untuk semua role.
                                                Menghapus centangnya akan
                                                membatasi menu tersebut untuk
                                                role lain yang sudah memiliki
                                                akses.
                                            </FieldDescription>
                                            <Button
                                                type="submit"
                                                disabled={form.processing}
                                                className="h-10 shrink-0 rounded-lg px-5"
                                            >
                                                {form.processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <ShieldCheck />
                                                )}
                                                Simpan akses
                                            </Button>
                                        </div>
                                    </CardContent>
                                </>
                            ) : (
                                <CardContent className="p-6">
                                    <Empty className="min-h-56 rounded-xl border border-dashed border-slate-200">
                                        <EmptyHeader>
                                            <EmptyMedia
                                                variant="icon"
                                                className="bg-primary/10 text-primary"
                                            >
                                                <ShieldCheck />
                                            </EmptyMedia>
                                            <EmptyTitle>
                                                Pilih role untuk mulai
                                            </EmptyTitle>
                                            <EmptyDescription>
                                                Pilih role di atas untuk melihat
                                                dan mengatur akses menu.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </CardContent>
                            )}
                        </Card>
                    </form>
                )}
            </div>
        </>
    );
}
