import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { ArrowDownUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { AdminTableFeatures, DataTable } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { UserFormDialog } from '@/components/admin/user-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    CursorPageLink,
    Pagination,
    PaginationContent,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    index as usersIndex,
    destroy as deleteUser,
} from '@/routes/admin/users';

type Role = {
    id: number;
    name: string;
    slug?: string;
};

type UserRecord = {
    id: number;
    name: string;
    email: string;
    status: boolean;
    created_at: string | null;
    roles: Role[];
};

type CursorPage<T> = {
    data: T[];
    per_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

type Filters = {
    search: string;
    status: 'active' | 'inactive' | 'all';
    role: string;
    sort: 'id' | 'name' | 'email';
    direction: 'asc' | 'desc';
};

type UserIndexProps = {
    users: CursorPage<UserRecord>;
    roles: Role[];
    filters: Filters;
};

const userColumn = createColumnHelper<AdminTableFeatures, UserRecord>();

function SortHeader({
    title,
    column,
    filters,
    onSort,
}: {
    title: string;
    column: 'name' | 'email';
    filters: Filters;
    onSort: (column: 'name' | 'email') => void;
}) {
    const isSorted = filters.sort === column;

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 font-medium"
            onClick={() => onSort(column)}
        >
            {title}
            <ArrowDownUp data-icon="inline-end" />
            <span className="sr-only">
                {isSorted
                    ? `Urut ${filters.direction === 'asc' ? 'menurun' : 'menaik'}`
                    : 'Urutkan'}
            </span>
        </Button>
    );
}

function formatDate(date: string | null): string {
    if (!date) {
        return '—';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
}

function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();
}

export default function UserIndex({ users, roles, filters }: UserIndexProps) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.search);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const visitUsers = useCallback(
        (overrides: Partial<Filters> = {}) => {
            const nextFilters = { ...filters, ...overrides };

            router.get(
                usersIndex.url(),
                {
                    search: search.trim() || undefined,
                    status:
                        nextFilters.status === 'all'
                            ? undefined
                            : nextFilters.status,
                    role:
                        nextFilters.role === 'all'
                            ? undefined
                            : nextFilters.role,
                    sort:
                        nextFilters.sort === 'id'
                            ? undefined
                            : nextFilters.sort,
                    direction:
                        nextFilters.sort === 'id'
                            ? undefined
                            : nextFilters.direction,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['users', 'filters'],
                },
            );
        },
        [filters, search],
    );

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timeout = window.setTimeout(() => visitUsers(), 300);

        return () => window.clearTimeout(timeout);
    }, [filters.search, search, visitUsers]);

    const sortBy = (column: 'name' | 'email') => {
        const direction =
            filters.sort === column && filters.direction === 'asc'
                ? 'desc'
                : 'asc';

        visitUsers({ sort: column, direction });
    };

    const openCreateDialog = () => {
        setEditingUser(null);
        setUserDialogOpen(true);
    };

    const columns = useMemo<ColumnDef<AdminTableFeatures, UserRecord>[]>(
        () =>
            userColumn.columns([
                userColumn.display({
                    id: 'number',
                    header: 'No',
                    cell: ({ row }) => (
                        <span className="text-muted-foreground tabular-nums">
                            {row.index + 1}
                        </span>
                    ),
                }),
                userColumn.accessor('name', {
                    header: () => (
                        <SortHeader
                            title="Pengguna"
                            column="name"
                            filters={filters}
                            onSort={sortBy}
                        />
                    ),
                    cell: ({ row }) => (
                        <div className="flex min-w-56 items-center gap-3">
                            <span
                                aria-hidden="true"
                                className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                            >
                                {getInitials(row.original.name)}
                            </span>
                            <div className="min-w-0">
                                <p className="text-foreground truncate font-semibold">
                                    {row.original.name}
                                </p>
                                <p className="text-muted-foreground mt-0.5 truncate text-sm">
                                    {row.original.email}
                                </p>
                            </div>
                        </div>
                    ),
                }),
                userColumn.accessor('roles', {
                    header: 'Role',
                    cell: ({ row }) => (
                        <div className="flex flex-wrap gap-1.5">
                            {row.original.roles.map((role) => (
                                <Badge key={role.id} variant="secondary">
                                    {role.name}
                                </Badge>
                            ))}
                            {row.original.roles.length === 0 && (
                                <span className="text-muted-foreground">—</span>
                            )}
                        </div>
                    ),
                }),
                userColumn.accessor('status', {
                    header: 'Status',
                    cell: ({ row }) => (
                        <Badge
                            variant="secondary"
                            className={
                                row.original.status
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }
                        >
                            {row.original.status ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                    ),
                }),
                userColumn.accessor('created_at', {
                    header: 'Dibuat',
                    cell: ({ row }) => (
                        <span className="text-muted-foreground text-sm">
                            {formatDate(row.original.created_at)}
                        </span>
                    ),
                }),
                userColumn.display({
                    id: 'actions',
                    header: 'Aksi',
                    cell: ({ row }) => (
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                onClick={() => {
                                    setEditingUser(row.original);
                                    setUserDialogOpen(true);
                                }}
                            >
                                <Pencil data-icon="inline-start" />
                                Ubah
                            </Button>
                            {row.original.id !== auth.user?.id && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                        setUserToDelete(row.original)
                                    }
                                >
                                    <Trash2 data-icon="inline-start" />
                                    Hapus
                                </Button>
                            )}
                        </div>
                    ),
                }),
            ]),
        [auth.user?.id, filters, sortBy],
    );

    const confirmDelete = () => {
        if (!userToDelete) {
            return;
        }

        setDeleting(true);
        router.delete(deleteUser(userToDelete.id).url, {
            preserveScroll: true,
            onSuccess: () => setUserToDelete(null),
            onError: (errors) => {
                const message = Object.values(errors)[0];
                toast.error(message ?? 'Pengguna tidak dapat dihapus.');
            },
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <>
            <Head title="Pengguna" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Pengguna"
                    description="Kelola akun, role, dan status akses untuk staf yang menggunakan BPR Report."
                    breadcrumbs={[{ title: 'Pengguna' }]}
                    action={
                        <Button type="button" onClick={openCreateDialog}>
                            <Plus data-icon="inline-start" />
                            Tambah pengguna
                        </Button>
                    }
                />

                <Card className="border-border/80 gap-0 py-0 shadow-sm">
                    <CardHeader className="border-border/70 gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-start sm:px-6">
                        <div className="flex flex-col gap-2 sm:w-full sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-64">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    aria-label="Cari pengguna berdasarkan nama atau email"
                                    className="pl-9"
                                    placeholder="Cari nama atau email..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                />
                            </div>
                            <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                    visitUsers({
                                        status: value as Filters['status'],
                                    })
                                }
                            >
                                <SelectTrigger className="w-full sm:w-36">
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
                            <Select
                                value={String(filters.role)}
                                onValueChange={(value) =>
                                    visitUsers({ role: value })
                                }
                            >
                                <SelectTrigger className="w-full sm:w-44">
                                    <SelectValue placeholder="Semua role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua role
                                        </SelectItem>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.id}
                                                value={String(role.id)}
                                            >
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <DataTable
                            columns={columns}
                            data={users.data}
                            emptyTitle="Pengguna tidak ditemukan"
                            emptyDescription="Coba ubah kata pencarian atau filter yang dipilih."
                            containerClassName="rounded-none border-0"
                            tableClassName="min-w-[900px] [&_thead]:bg-muted/30 [&_th]:h-12 [&_th]:px-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground [&_th]:uppercase [&_td]:px-4 [&_td]:py-4"
                        />
                    </CardContent>

                    <div className="border-border/70 flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            {users.data.length} baris dimuat · maksimal{' '}
                            {users.per_page} baris per halaman
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <CursorPageLink
                                    href={users.prev_page_url}
                                    direction="previous"
                                    label="Sebelumnya"
                                />
                                <CursorPageLink
                                    href={users.next_page_url}
                                    direction="next"
                                    label="Berikutnya"
                                />
                            </PaginationContent>
                        </Pagination>
                    </div>
                </Card>
            </main>

            <UserFormDialog
                open={userDialogOpen}
                user={editingUser}
                roles={roles}
                onOpenChange={setUserDialogOpen}
            />
            <ConfirmDeleteDialog
                open={userToDelete !== null}
                title="Hapus pengguna?"
                description={`Akun ${userToDelete?.name ?? ''} akan dihapus dan tidak dapat digunakan untuk login.`}
                processing={deleting}
                onOpenChange={(open) => !open && setUserToDelete(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
}
