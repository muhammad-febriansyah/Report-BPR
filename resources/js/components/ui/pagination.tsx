import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function Pagination({
    className,
    ...props
}: React.ComponentProps<'nav'>) {
    return (
        <nav
            aria-label="pagination"
            data-slot="pagination"
            className={cn('flex w-full justify-end', className)}
            {...props}
        />
    );
}

function PaginationContent({
    className,
    ...props
}: React.ComponentProps<'ul'>) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn('flex flex-row items-center gap-1.5', className)}
            {...props}
        />
    );
}

type CursorPageLinkProps = {
    href: string | null;
    direction: 'previous' | 'next';
    label: string;
};

function CursorPageLink({ href, direction, label }: CursorPageLinkProps) {
    const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;

    return (
        <li data-slot="pagination-item">
            {href ? (
                <Button asChild variant="outline" size="sm">
                    <Link href={href} preserveScroll>
                        {direction === 'previous' && <Icon data-icon="inline-start" />}
                        {label}
                        {direction === 'next' && <Icon data-icon="inline-end" />}
                    </Link>
                </Button>
            ) : (
                <Button variant="outline" size="sm" disabled>
                    {direction === 'previous' && <Icon data-icon="inline-start" />}
                    {label}
                    {direction === 'next' && <Icon data-icon="inline-end" />}
                </Button>
            )}
        </li>
    );
}

export { CursorPageLink, Pagination, PaginationContent };
