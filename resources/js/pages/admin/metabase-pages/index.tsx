import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import {
    ExternalLink,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { AdminTableFeatures, DataTable } from '@/components/admin/data-table';
import { PageHeader } from '@/components/admin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    RequiredMark,
} from '@/components/ui/field';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    CursorPageLink,
    Pagination,
    PaginationContent,
} from '@/components/ui/pagination';
import { Spinner } from '@/components/ui/spinner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    destroy as deletePage,
    index as pagesIndex,
    store as storePage,
    update as updatePage,
} from '@/routes/admin/metabase-pages';

type Parent = {
    id: number;
    title: string;
    path: string;
    exists: boolean;
};

type MetabasePage = {
    id: number;
    menu_id: number;
    title: string;
    path: string;
    master_menu_id: number | null;
    iframe_url: string;
    iframe_title: string | null;
    iframe_description: string | null;
    status: boolean;
    updated_at: string | null;
};

type CursorPage<T> = {
    data: T[];
    next_page_url: string | null;
    prev_page_url: string | null;
};

type Filters = {
    search: string;
    status: 'active' | 'inactive' | 'all';
};

type Props = {
    pages: CursorPage<MetabasePage>;
    parents: Parent[];
    filters: Filters;
    embedHosts: string[];
};

type PageFormData = {
    title: string;
    master_menu_id: number | '';
    iframe_url: string;
    iframe_title: string;
    iframe_description: string;
    status: boolean;
};

const pageColumn = createColumnHelper<AdminTableFeatures, MetabasePage>();

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function PageFormDialog({
    open,
    page,
    parents,
    embedHosts,
    onOpenChange,
}: {
    open: boolean;
    page: MetabasePage | null;
    parents: Parent[];
    embedHosts: string[];
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm<PageFormData>({
        title: '',
        master_menu_id: '',
        iframe_url: '',
        iframe_title: '',
        iframe_description: '',
        status: true,
    });
    const parentOptions: ComboboxOption[] = parents.map((parent) => ({
        value: String(parent.id),
        label: parent.exists ? parent.path : `${parent.path} (akan dibuat)`,
    }));

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            title: page?.title ?? '',
            master_menu_id: page?.master_menu_id ?? '',
            iframe_url: page?.iframe_url ?? '',
            iframe_title: page?.iframe_title ?? '',
            iframe_description: page?.iframe_description ?? '',
            status: page?.status ?? true,
        });
        form.clearErrors();
    }, [open, page]);

    const submit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (page) {
            form.put(updatePage.url(page.id), options);
        } else {
            form.post(storePage.url(), options);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {page
                            ? 'Ubah halaman Metabase'
                            : 'Tambah halaman Metabase'}
                    </DialogTitle>
                    <DialogDescription>
                        Buat menu baru sekaligus halaman iframe di dalam grup
                        Metabase.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-col gap-5">
                    <FieldGroup>
                        <Field data-invalid={Boolean(form.errors.title)}>
                            <FieldLabel htmlFor="metabase-page-title">
                                Nama menu <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="metabase-page-title"
                                required
                                placeholder="Contoh: Report Absensi Hari Ini"
                                value={form.data.title}
                                aria-invalid={Boolean(form.errors.title)}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                            />
                            {form.errors.title && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.title}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field
                            data-invalid={Boolean(form.errors.master_menu_id)}
                        >
                            <FieldLabel htmlFor="metabase-page-parent">
                                Parent menu <RequiredMark />
                            </FieldLabel>
                            <Combobox
                                id="metabase-page-parent"
                                value={
                                    form.data.master_menu_id === ''
                                        ? ''
                                        : String(form.data.master_menu_id)
                                }
                                options={parentOptions}
                                placeholder="Pilih kategori master menu"
                                searchPlaceholder="Cari parent menu..."
                                emptyMessage="Master menu tidak ditemukan."
                                invalid={Boolean(form.errors.master_menu_id)}
                                onValueChange={(value) =>
                                    form.setData(
                                        'master_menu_id',
                                        Number(value),
                                    )
                                }
                            />
                            <FieldDescription>
                                Parent diambil dari master menu. Jika
                                kategorinya belum ada di Metabase, sistem akan
                                membuatnya otomatis.
                            </FieldDescription>
                            {form.errors.master_menu_id && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.master_menu_id}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field data-invalid={Boolean(form.errors.iframe_url)}>
                            <FieldLabel htmlFor="metabase-page-url">
                                URL iframe Metabase <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="metabase-page-url"
                                type="url"
                                required
                                placeholder="https://metabase.simgroup.co.id/public/dashboard/..."
                                value={form.data.iframe_url}
                                aria-invalid={Boolean(form.errors.iframe_url)}
                                onChange={(event) =>
                                    form.setData(
                                        'iframe_url',
                                        event.target.value,
                                    )
                                }
                            />
                            <FieldDescription>
                                Host yang diizinkan: {embedHosts.join(', ')}.
                                Gunakan URL public atau embed dashboard agar
                                dapat ditampilkan di iframe.
                            </FieldDescription>
                            {form.errors.iframe_url && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.iframe_url}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="metabase-page-iframe-title">
                                Judul iframe
                            </FieldLabel>
                            <Input
                                id="metabase-page-iframe-title"
                                placeholder="Contoh: Dashboard absensi hari ini"
                                value={form.data.iframe_title}
                                onChange={(event) =>
                                    form.setData(
                                        'iframe_title',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="metabase-page-description">
                                Deskripsi halaman
                            </FieldLabel>
                            <Input
                                id="metabase-page-description"
                                placeholder="Contoh: Ringkasan absensi karyawan hari ini."
                                value={form.data.iframe_description}
                                onChange={(event) =>
                                    form.setData(
                                        'iframe_description',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>

                        <Field
                            orientation="horizontal"
                            className="items-center"
                        >
                            <Checkbox
                                id="metabase-page-status"
                                checked={form.data.status}
                                onCheckedChange={(checked) =>
                                    form.setData('status', checked === true)
                                }
                            />
                            <FieldLabel
                                htmlFor="metabase-page-status"
                                className="font-normal"
                            >
                                Halaman aktif <RequiredMark />
                            </FieldLabel>
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && (
                                <Spinner data-icon="inline-start" />
                            )}
                            {page ? 'Simpan perubahan' : 'Buat halaman'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function MetabasePagesIndex({
    pages,
    parents,
    filters,
    embedHosts,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [pageDialogOpen, setPageDialogOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<MetabasePage | null>(null);
    const [pageToDelete, setPageToDelete] = useState<MetabasePage | null>(null);
    const [deleting, setDeleting] = useState(false);

    const visitPages = (overrides: Partial<Filters> = {}): void => {
        const nextFilters = { ...filters, ...overrides };

        router.get(
            pagesIndex.url(),
            {
                search: search.trim() || undefined,
                status:
                    nextFilters.status === 'all'
                        ? undefined
                        : nextFilters.status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['pages', 'filters'],
            },
        );
    };

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => visitPages(), 300);
        return () => window.clearTimeout(timer);
    }, [filters.search, search]);

    const columns = useMemo<ColumnDef<AdminTableFeatures, MetabasePage>[]>(
        () =>
            pageColumn.columns([
                pageColumn.display({
                    id: 'page',
                    header: 'Halaman',
                    cell: ({ row }) => (
                        <div className="flex min-w-64 items-start gap-3">
                            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <FileText className="size-4" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-900">
                                    {row.original.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {row.original.path}
                                </p>
                            </div>
                        </div>
                    ),
                }),
                pageColumn.accessor('iframe_url', {
                    header: 'Sumber iframe',
                    cell: ({ row }) => (
                        <div className="flex max-w-72 items-center gap-2">
                            <span className="truncate font-mono text-xs text-slate-500">
                                {row.original.iframe_url}
                            </span>
                            <a
                                href={row.original.iframe_url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Buka ${row.original.title} di tab baru`}
                                className="text-primary hover:bg-primary/10 shrink-0 rounded p-1"
                            >
                                <ExternalLink className="size-3.5" />
                            </a>
                        </div>
                    ),
                }),
                pageColumn.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({ row }) => (
                        <Badge
                            variant={
                                row.original.status ? 'default' : 'outline'
                            }
                            className={cn(
                                'rounded-full px-2.5 py-1',
                                row.original.status &&
                                    'bg-emerald-50 text-emerald-700 hover:bg-emerald-50',
                            )}
                        >
                            {row.original.status ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                    ),
                }),
                pageColumn.accessor('updated_at', {
                    header: 'Diperbarui',
                    cell: ({ row }) => (
                        <span className="text-xs whitespace-nowrap text-slate-500">
                            {formatDate(row.original.updated_at)}
                        </span>
                    ),
                }),
                pageColumn.display({
                    id: 'actions',
                    header: 'Aksi',
                    cell: ({ row }) => (
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                                onClick={() => {
                                    setEditingPage(row.original);
                                    setPageDialogOpen(true);
                                }}
                            >
                                <Pencil data-icon="inline-start" />
                                Ubah
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setPageToDelete(row.original)}
                            >
                                <Trash2 data-icon="inline-start" />
                                Hapus
                            </Button>
                        </div>
                    ),
                }),
            ]),
        [],
    );

    const createPage = (): void => {
        setEditingPage(null);
        setPageDialogOpen(true);
    };

    const confirmDelete = (): void => {
        if (!pageToDelete) {
            return;
        }

        setDeleting(true);
        router.delete(deletePage.url(pageToDelete.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setPageToDelete(null);
            },
        });
    };

    return (
        <>
            <Head title="Page Builder Metabase" />
            <main className="font-poppins min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 text-slate-900 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Page Builder Metabase"
                    description="Kelola halaman report iframe yang ditempatkan secara dinamis di dalam grup Metabase."
                    breadcrumbs={[{ title: 'Page Builder Metabase' }]}
                    action={
                        <Button onClick={createPage} className="rounded-lg">
                            <Plus />
                            Tambah halaman
                        </Button>
                    }
                />

                <Card className="gap-0 overflow-hidden rounded-2xl border-slate-200/80 py-0 shadow-sm shadow-slate-200/30">
                    <CardHeader className="gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <CardTitle className="text-base">
                                Halaman Metabase
                            </CardTitle>
                            <p className="mt-1 text-sm text-slate-500">
                                Setiap halaman otomatis menjadi menu di parent
                                yang dipilih.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative w-full sm:w-72">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    aria-label="Cari halaman Metabase"
                                    placeholder="Cari nama atau URL iframe..."
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                    visitPages({
                                        status: value as Filters['status'],
                                    })
                                }
                            >
                                <SelectTrigger className="w-full sm:w-36">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Semua status
                                    </SelectItem>
                                    <SelectItem value="active">
                                        Aktif
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Nonaktif
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <DataTable
                            columns={columns}
                            data={pages.data}
                            emptyTitle="Belum ada halaman Metabase"
                            emptyDescription="Buat halaman pertama untuk menampilkan report iframe di sidebar Metabase."
                            containerClassName="rounded-none border-0"
                            tableClassName="min-w-[920px]"
                        />
                    </CardContent>
                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <p className="text-xs text-slate-500">
                            Data halaman dimuat bertahap untuk menjaga performa
                            saat jumlah report bertambah.
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <CursorPageLink
                                    href={pages.prev_page_url}
                                    direction="previous"
                                    label="Sebelumnya"
                                />
                                <CursorPageLink
                                    href={pages.next_page_url}
                                    direction="next"
                                    label="Berikutnya"
                                />
                            </PaginationContent>
                        </Pagination>
                    </div>
                </Card>
            </main>

            <PageFormDialog
                open={pageDialogOpen}
                page={editingPage}
                parents={parents}
                embedHosts={embedHosts}
                onOpenChange={setPageDialogOpen}
            />
            <ConfirmDeleteDialog
                open={pageToDelete !== null}
                title="Hapus halaman Metabase?"
                description="Menu dan konfigurasi iframe halaman ini akan dihapus dari navigasi."
                processing={deleting}
                onOpenChange={(open) => {
                    if (!open && !deleting) {
                        setPageToDelete(null);
                    }
                }}
                onConfirm={confirmDelete}
            />
        </>
    );
}
