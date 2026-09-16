import { Head } from '@inertiajs/react';
import { ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';

type BreadcrumbEntry = {
    title: string;
    href?: string;
};

type MenuDestinationProps = {
    menu: {
        title: string;
        route_name: string | null;
        page_type: string | null;
        iframe_url: string | null;
        iframe_title: string | null;
        iframe_description: string | null;
    };
    breadcrumbs: BreadcrumbEntry[];
};

export default function MenuDestination({
    menu,
    breadcrumbs,
}: MenuDestinationProps) {
    return (
        <>
            <Head title={menu.title} />

            <main className="font-poppins min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 text-slate-900 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title={menu.title}
                    description="Halaman tujuan menu ini sudah aktif. Konten laporan dapat dihubungkan saat sumber datanya tersedia."
                    breadcrumbs={breadcrumbs}
                />

                {menu.page_type === 'iframe' && menu.iframe_url ? (
                    <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-0 shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-semibold text-slate-800">
                                    {menu.iframe_title ?? menu.title}
                                </h2>
                                {menu.iframe_description && (
                                    <p className="mt-1 text-sm text-slate-500">
                                        {menu.iframe_description}
                                    </p>
                                )}
                            </div>
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="shrink-0 rounded-lg"
                            >
                                <a
                                    href={menu.iframe_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink />
                                    Buka tab baru
                                </a>
                            </Button>
                        </div>
                        <div className="bg-slate-50 p-2 sm:p-3">
                            <iframe
                                title={menu.iframe_title ?? menu.title}
                                src={menu.iframe_url}
                                loading="lazy"
                                referrerPolicy="strict-origin-when-cross-origin"
                                className="h-[calc(100svh-250px)] min-h-[620px] w-full rounded-xl border border-slate-200 bg-white"
                            />
                        </div>
                    </Card>
                ) : (
                    <Card className="flex min-h-[360px] items-center justify-center rounded-2xl border-slate-200/80 bg-white p-8 text-center shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
                        <div className="flex max-w-md flex-col items-center">
                            <span className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-xl">
                                <FileText className="size-5" />
                            </span>
                            <h2 className="text-base font-semibold text-slate-800">
                                Tujuan menu berhasil dibuka
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Halaman laporan untuk menu ini belum terhubung
                                ke sumber data.
                            </p>
                            {menu.route_name && (
                                <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
                                    Route: {menu.route_name}
                                </p>
                            )}
                        </div>
                    </Card>
                )}
            </main>
        </>
    );
}
