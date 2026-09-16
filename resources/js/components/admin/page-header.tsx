import { Fragment, type ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { dashboard } from '@/routes';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type BreadcrumbEntry = {
    title: string;
    href?: string;
};

type PageHeaderProps = {
    title: string;
    description: string;
    breadcrumbs: BreadcrumbEntry[];
    action?: ReactNode;
};

export function PageHeader({
    title,
    description,
    breadcrumbs,
    action,
}: PageHeaderProps) {
    const items = [
        { title: 'Dashboard', href: dashboard().url },
        ...breadcrumbs,
    ];

    return (
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <Breadcrumb className="mb-3">
                    <BreadcrumbList>
                        {items.map((item, index) => (
                            <Fragment key={`${item.title}-${index}`}>
                                <BreadcrumbItem>
                                    {index === items.length - 1 ? (
                                        <BreadcrumbPage>
                                            {item.title}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={
                                                    item.href ?? dashboard().url
                                                }
                                            >
                                                {item.title}
                                            </Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {index < items.length - 1 && (
                                    <BreadcrumbSeparator />
                                )}
                            </Fragment>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                    {title}
                </h1>
                <p className="text-muted-foreground mt-1.5 max-w-3xl text-sm">
                    {description}
                </p>
            </div>
            {action && (
                <div className="flex shrink-0 items-center gap-2">{action}</div>
            )}
        </header>
    );
}
