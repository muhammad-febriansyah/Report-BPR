import { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { MapPinned, Search } from 'lucide-react';
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
import { index as masterAreaIndex } from '@/routes/admin/master-area';

type MasterArea = {
    id: number;
    client_company: string;
    client_branch: string;
    group: string;
    kota: string;
    area_new: string;
    regional_head: string;
    area_operational_manager: string;
    bso: string;
    id_klien: string;
    id_cabang: string;
};

type MasterAreaPage = {
    data: MasterArea[];
    from: number | null;
    to: number | null;
    total: number;
    per_page: number;
    next_page_url: string | null;
    prev_page_url: string | null;
};

type Props = {
    areas: MasterAreaPage;
    filters: { search: string };
};

const cellClassName = 'px-4 py-4 text-sm whitespace-nowrap';

export default function MasterAreaIndex({ areas, filters }: Props) {
    const [search, setSearch] = useState(filters.search);

    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        const timer = window.setTimeout(() => {
            router.get(
                masterAreaIndex.url(),
                { search: search.trim() || undefined },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['areas', 'filters'],
                },
            );
        }, 300);

        return () => window.clearTimeout(timer);
    }, [filters.search, search]);

    return (
        <>
            <Head title="Master Area" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Master Area"
                    description={`${areas.total.toLocaleString('id-ID')} data area tersedia sebagai referensi aplikasi.`}
                    breadcrumbs={[{ title: 'Master Area' }]}
                />

                <Card className="border-border/80 gap-0 overflow-hidden py-0 shadow-sm">
                    <CardHeader className="border-border/70 gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                                <MapPinned className="size-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold">
                                    Daftar master area
                                </h2>
                                <p className="text-muted-foreground mt-0.5 text-sm">
                                    Data referensi area, cabang, dan penanggung
                                    jawab.
                                </p>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                aria-label="Cari master area"
                                className="pl-9"
                                placeholder="Cari perusahaan, cabang, area..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="[&_thead]:bg-muted/30 [&_th]:text-muted-foreground min-w-[1500px] [&_th]:h-12 [&_th]:px-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:uppercase">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">
                                            No
                                        </TableHead>
                                        <TableHead>Perusahaan</TableHead>
                                        <TableHead>Cabang</TableHead>
                                        <TableHead>Group</TableHead>
                                        <TableHead>Kota</TableHead>
                                        <TableHead>Area</TableHead>
                                        <TableHead>Regional Head</TableHead>
                                        <TableHead>
                                            Area Operational Manager
                                        </TableHead>
                                        <TableHead>BSO</TableHead>
                                        <TableHead>ID Klien</TableHead>
                                        <TableHead>ID Cabang</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {areas.data.length > 0 ? (
                                        areas.data.map((area, index) => (
                                            <TableRow key={area.id}>
                                                <TableCell
                                                    className={`${cellClassName} text-muted-foreground tabular-nums`}
                                                >
                                                    {(areas.from ?? 1) + index}
                                                </TableCell>
                                                <TableCell
                                                    className={`${cellClassName} font-medium`}
                                                >
                                                    {area.client_company}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.client_branch}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.group}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.kota}
                                                </TableCell>
                                                <TableCell
                                                    className={`${cellClassName} font-medium`}
                                                >
                                                    {area.area_new}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.regional_head}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {
                                                        area.area_operational_manager
                                                    }
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.bso}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.id_klien}
                                                </TableCell>
                                                <TableCell
                                                    className={cellClassName}
                                                >
                                                    {area.id_cabang}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={11}
                                                className="text-muted-foreground px-6 py-16 text-center text-sm"
                                            >
                                                Data master area tidak
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
                            Menampilkan {areas.from ?? 0}–{areas.to ?? 0} dari{' '}
                            {areas.total.toLocaleString('id-ID')} data
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <CursorPageLink
                                    href={areas.prev_page_url}
                                    direction="previous"
                                    label="Sebelumnya"
                                />
                                <CursorPageLink
                                    href={areas.next_page_url}
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
