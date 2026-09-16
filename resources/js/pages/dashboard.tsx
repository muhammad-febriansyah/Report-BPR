import { Head } from '@inertiajs/react';
import { Activity, Building2, Clock3, LogIn, Users } from 'lucide-react';
import type { ApexOptions } from 'apexcharts';
import type { LucideIcon } from 'lucide-react';
import { DashboardChart } from '@/components/dashboard-chart';
import { PageHeader } from '@/components/admin/page-header';
import { Card } from '@/components/ui/card';
import { dashboard } from '@/routes';

type RecentActivity = {
    id: number;
    userName: string;
    event: string;
    description: string;
    ipAddress: string | null;
    createdAt: string | null;
};

type Props = {
    usersTotal: number;
    usersActive: number;
    usersInactive: number;
    areasTotal: number;
    activityTotal: number;
    activityLabels: string[];
    activityTrend: number[];
    loginTrend: number[];
    recentActivities: RecentActivity[];
};

const numberFormatter = new Intl.NumberFormat('id-ID');
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const metricDefinitions: {
    key: keyof Pick<
        Props,
        'usersTotal' | 'usersActive' | 'areasTotal' | 'activityTotal'
    >;
    title: string;
    caption: string;
    icon: LucideIcon;
    tone: string;
}[] = [
    {
        key: 'usersTotal',
        title: 'Total pengguna',
        caption: 'Akun terdaftar',
        icon: Users,
        tone: 'bg-[#2547F9]/[0.08] text-[#2547F9]',
    },
    {
        key: 'usersActive',
        title: 'Pengguna aktif',
        caption: 'Dapat mengakses aplikasi',
        icon: LogIn,
        tone: 'bg-emerald-50 text-emerald-600',
    },
    {
        key: 'areasTotal',
        title: 'Cabang terdata',
        caption: 'ID cabang unik',
        icon: Building2,
        tone: 'bg-violet-50 text-violet-600',
    },
    {
        key: 'activityTotal',
        title: 'Aktivitas 7 hari',
        caption: 'Aksi yang tercatat',
        icon: Activity,
        tone: 'bg-amber-50 text-amber-600',
    },
];

function activityLabel(event: string): string {
    return event === 'login'
        ? 'Login'
        : event === 'logout'
          ? 'Logout'
          : 'Aktivitas';
}

export default function Dashboard({
    usersTotal,
    usersActive,
    usersInactive,
    areasTotal,
    activityTotal,
    activityLabels,
    activityTrend,
    loginTrend,
    recentActivities,
}: Props) {
    const activityOptions: ApexOptions = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: 'Poppins, sans-serif',
        },
        colors: ['#2547F9', '#22A06B'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: {
                opacityFrom: 0.25,
                opacityTo: 0.02,
                stops: [0, 90, 100],
            },
        },
        grid: { borderColor: '#E9EEF7', strokeDashArray: 4 },
        xaxis: {
            categories: activityLabels,
            labels: { style: { colors: '#94A3B8', fontSize: '11px' } },
        },
        yaxis: {
            min: 0,
            forceNiceScale: true,
            labels: { style: { colors: '#94A3B8', fontSize: '11px' } },
        },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px' },
        tooltip: { theme: 'light' },
    };

    const userOptions: ApexOptions = {
        chart: { type: 'donut', fontFamily: 'Poppins, sans-serif' },
        labels: ['Aktif', 'Tidak aktif'],
        colors: ['#22A06B', '#CBD5E1'],
        dataLabels: { enabled: false },
        legend: { position: 'bottom', fontSize: '11px' },
        plotOptions: {
            pie: {
                donut: {
                    size: '72%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Pengguna',
                            formatter: () => numberFormatter.format(usersTotal),
                        },
                    },
                },
            },
        },
        stroke: { width: 0 },
    };

    return (
        <>
            <Head title="Dashboard" />
            <main className="font-poppins min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 text-slate-900 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Dashboard"
                    description="Pantau pengguna, cabang, dan aktivitas sistem dari satu halaman."
                    breadcrumbs={[]}
                />

                <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {metricDefinitions.map(
                        ({ key, title, caption, icon: Icon, tone }) => (
                            <Card
                                key={key}
                                className="gap-0 rounded-2xl border-slate-200/80 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,0.035)]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            {title}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                                            {numberFormatter.format(
                                                {
                                                    usersTotal,
                                                    usersActive,
                                                    areasTotal,
                                                    activityTotal,
                                                }[key],
                                            )}
                                        </p>
                                    </div>
                                    <span
                                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                                    >
                                        <Icon className="size-5" />
                                    </span>
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    {caption}
                                </p>
                            </Card>
                        ),
                    )}
                </section>

                <section className="mb-4 grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
                    <Card className="gap-0 rounded-2xl border-slate-200/80 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-[15px] font-semibold text-slate-900">
                                    Aktivitas sistem
                                </h2>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Aktivitas dan login selama 7 hari terakhir
                                </p>
                            </div>
                            <Activity className="size-4 text-slate-300" />
                        </div>
                        <div className="mt-4">
                            <DashboardChart
                                options={activityOptions}
                                series={[
                                    {
                                        name: 'Semua aktivitas',
                                        data: activityTrend,
                                    },
                                    { name: 'Login', data: loginTrend },
                                ]}
                                type="area"
                            />
                        </div>
                    </Card>
                    <Card className="gap-0 rounded-2xl border-slate-200/80 bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
                        <div>
                            <h2 className="text-[15px] font-semibold text-slate-900">
                                Status pengguna
                            </h2>
                            <p className="mt-1 text-[11px] text-slate-400">
                                Komposisi akun yang terdaftar
                            </p>
                        </div>
                        <div className="mt-2">
                            <DashboardChart
                                options={userOptions}
                                series={[usersActive, usersInactive]}
                                type="donut"
                                height={245}
                            />
                        </div>
                    </Card>
                </section>

                <Card className="gap-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white py-0 shadow-[0_10px_32px_rgba(15,23,42,0.035)]">
                    <div className="flex items-center justify-between gap-3 px-5 py-5">
                        <div>
                            <h2 className="text-[15px] font-semibold text-slate-900">
                                Aktivitas terbaru
                            </h2>
                            <p className="mt-1 text-[11px] text-slate-400">
                                Log tindakan pengguna yang paling baru
                            </p>
                        </div>
                        <Clock3 className="size-4 text-slate-300" />
                    </div>
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                        {recentActivities.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-400">
                                Belum ada aktivitas yang tercatat.
                            </div>
                        ) : (
                            recentActivities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                                >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2547F9]/[0.08] text-[#2547F9]">
                                        <Activity className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-800">
                                            {activity.description}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            {activity.userName} ·{' '}
                                            {activity.ipAddress ??
                                                'IP tidak tersedia'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-medium text-slate-500">
                                            {activityLabel(activity.event)}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                            {activity.createdAt
                                                ? dateFormatter.format(
                                                      new Date(
                                                          activity.createdAt,
                                                      ),
                                                  )
                                                : '—'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </main>
        </>
    );
}

Dashboard.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }] };
