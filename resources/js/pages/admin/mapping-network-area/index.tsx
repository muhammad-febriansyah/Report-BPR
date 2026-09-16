import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { Network, Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    CursorPageLink,
    Pagination,
    PaginationContent,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as mappingNetworkAreaIndex } from '@/routes/admin/mapping-network-area';

type MappingNetworkArea = {
    id: string | null;
    id_perusahaan: number | null;
    cabang: string | null;
    kategori: number | null;
    area: string | null;
};

type MappingNetworkAreaPage = {
    data: MappingNetworkArea[];
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

type Props = {
    mappings: MappingNetworkAreaPage;
    filters: { search: string };
};

const cellClassName = 'px-4 py-4 text-sm whitespace-nowrap';

export default function MappingNetworkAreaIndex({ mappings, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => {
            router.get(
                mappingNetworkAreaIndex.url(),
                { search: search.trim() || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['mappings', 'filters'],
                },
            );
        }, 300);

        return () => window.clearTimeout(timer);
    }, [filters.search, search]);

    return (
        <>
            <Head title="Mapping Network Area" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Mapping Network Area"
                    description={`${mappings.total.toLocaleString('id-ID')} mapping area tersedia sebagai referensi aplikasi.`}
                    breadcrumbs={[{ title: 'Mapping Network Area' }]}
                />

                <Card className="border-border/80 gap-0 overflow-hidden py-0 shadow-sm">
                    <CardHeader className="border-border/70 gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                                <Network className="size-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold">
                                    Daftar mapping network area
                                </h2>
                                <p className="text-muted-foreground mt-0.5 text-sm">
                                    Pemetaan perusahaan, cabang, kategori, dan
                                    area.
                                </p>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                aria-label="Cari mapping network area"
                                className="pl-9"
                                placeholder="Cari cabang, area, atau ID..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="[&_thead]:bg-muted/30 [&_th]:text-muted-foreground min-w-[1050px] [&_th]:h-12 [&_th]:px-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:uppercase">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">
                                            No
                                        </TableHead>
                                        <TableHead>ID</TableHead>
                                        <TableHead>ID Perusahaan</TableHead>
                                        <TableHead>Cabang</TableHead>
                                        <TableHead>Kategori</TableHead>
                                        <TableHead>Area</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mappings.data.length > 0 ? (
                                        mappings.data.map((mapping, index) => (
                                            <TableRow
                                                key={`${mapping.id ?? 'row'}-${index}`}
                                            >
                                                <TableCell
                                                    className={`${cellClassName} text-muted-foreground tabular-nums`}
                                                >
                                                    {(mappings.from ?? 1) +
                                                        index}
                                                </TableCell>
                                                <TableCell
                                                    className={`${cellClassName} font-medium`}
                                                >
                                                    {mapping.id ?? '—'}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {mapping.id_perusahaan ??
                                                        '—'}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {mapping.cabang ?? '—'}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {mapping.kategori ?? '—'}
                                                </TableCell>
                                                <TableCell
                                                    className={`${cellClassName} font-medium`}
                                                >
                                                    {mapping.area ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-muted-foreground px-6 py-16 text-center text-sm"
                                            >
                                                Data mapping network area tidak
                                                ditemukan.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    <div className="border-border/70 flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            Menampilkan {mappings.from ?? 0}–{mappings.to ?? 0}{' '}
                            dari {mappings.total.toLocaleString('id-ID')} data
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <CursorPageLink
                                    href={mappings.prev_page_url}
                                    direction="previous"
                                    label="Sebelumnya"
                                />
                                <CursorPageLink
                                    href={mappings.next_page_url}
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
