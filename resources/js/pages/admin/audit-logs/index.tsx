import { Head, router } from '@inertiajs/react';
import { Activity, Globe2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import {
    CursorPageLink,
    Pagination,
    PaginationContent,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { index as auditLogsIndex } from '@/routes/admin/audit-logs';

type AuditLog = {
    id: number;
    user_name: string | null;
    event: string;
    description: string;
    method: string;
    path: string;
    ip_address: string | null;
    created_at: string;
};

type AuditLogPage = {
    data: AuditLog[];
    next_page_url: string | null;
    prev_page_url: string | null;
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    logs: AuditLogPage;
    filters: { search: string };
};

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function AuditLogs({ logs, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        if (search === filters.search) return;
        const timer = window.setTimeout(() => {
            router.get(
                auditLogsIndex.url(),
                { search: search.trim() || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);
        return () => window.clearTimeout(timer);
    }, [filters.search, search]);

    return (
        <>
            <Head title="Riwayat aktivitas" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Riwayat aktivitas"
                    description="Pantau login dan aktivitas pengguna di BPR Report."
                    breadcrumbs={[{ title: 'Riwayat aktivitas' }]}
                />

                <Card className="border-border/80 gap-0 overflow-hidden py-0 shadow-sm">
                    <div className="border-border/70 flex flex-col gap-3 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="text-base font-semibold">
                                Semua aktivitas
                            </h2>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Nama pengguna, deskripsi, IP, dan waktu
                                tersimpan otomatis.
                            </p>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                aria-label="Cari riwayat aktivitas"
                                className="pl-9"
                                placeholder="Cari nama, aktivitas, atau IP..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="divide-border/70 divide-y">
                        {logs.data.length > 0 ? (
                            logs.data.map((log) => (
                                <article
                                    key={log.id}
                                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
                                            <Activity className="size-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold">
                                                {log.user_name ??
                                                    'Pengguna dihapus'}
                                            </p>
                                            <p className="text-muted-foreground mt-0.5 text-sm">
                                                {log.description}
                                            </p>
                                            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                                                <Globe2 className="size-3.5" />
                                                {log.ip_address ??
                                                    'IP tidak tersedia'}{' '}
                                                <span>·</span> {log.method}{' '}
                                                {log.path}
                                            </p>
                                        </div>
                                    </div>
                                    <time className="text-muted-foreground shrink-0 text-xs sm:text-right">
                                        {formatDate(log.created_at)}
                                    </time>
                                </article>
                            ))
                        ) : (
                            <div className="text-muted-foreground px-6 py-16 text-center text-sm">
                                Belum ada aktivitas yang cocok.
                            </div>
                        )}
                    </div>

                    <div className="border-border/70 flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            Menampilkan {logs.from ?? 0}–{logs.to ?? 0} dari{' '}
                            {logs.total} aktivitas
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <CursorPageLink
                                    href={logs.prev_page_url}
                                    direction="previous"
                                    label="Sebelumnya"
                                />
                                <CursorPageLink
                                    href={logs.next_page_url}
                                    direction="next"
                                    label="Berikutnya"
                                />
                            </PaginationContent>
                        </Pagination>
                    </div>
                </Card>
            </main>
        </>
    );
}

AuditLogs.layout = {
    breadcrumbs: [{ title: 'Riwayat aktivitas', href: auditLogsIndex() }],
};
