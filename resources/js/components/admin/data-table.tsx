import {
    tableFeatures,
    useTable,
    type ColumnDef,
    type RowData,
} from '@tanstack/react-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = tableFeatures({});

export type AdminTableFeatures = typeof features;

type DataTableProps<TData extends RowData> = {
    columns: ColumnDef<AdminTableFeatures, TData>[];
    data: TData[];
    emptyTitle: string;
    emptyDescription: string;
    containerClassName?: string;
    tableClassName?: string;
};

export function DataTable<TData extends RowData>({
    columns,
    data,
    emptyTitle,
    emptyDescription,
    containerClassName,
    tableClassName,
}: DataTableProps<TData>) {
    const table = useTable({ features, columns, data });

    return (
        <div
            className={cn(
                'bg-background overflow-hidden rounded-xl border',
                containerClassName,
            )}
        >
            <Table className={tableClassName}>
                <TableHeader className="bg-muted/40">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                    {header.isPlaceholder ? null : (
                                        <table.FlexRender header={header} />
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getAllCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                                <Empty className="min-h-64 rounded-none border-0">
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <SearchX />
                                        </EmptyMedia>
                                        <EmptyTitle>{emptyTitle}</EmptyTitle>
                                        <EmptyDescription>
                                            {emptyDescription}
                                        </EmptyDescription>
                                    </EmptyHeader>
                                </Empty>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
