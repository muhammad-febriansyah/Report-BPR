import { useEffect, useRef } from 'react';
import type {
    default as ApexCharts,
    ApexAxisChartSeries,
    ApexNonAxisChartSeries,
    ApexOptions,
} from 'apexcharts';

type Props = {
    options: ApexOptions;
    series: ApexAxisChartSeries | ApexNonAxisChartSeries;
    type: NonNullable<ApexOptions['chart']>['type'];
    height?: number;
};

export function DashboardChart({ options, series, type, height = 260 }: Props) {
    const chartElement = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        let chart: ApexCharts | null = null;

        const renderChart = async (): Promise<void> => {
            if (chartElement.current === null) {
                return;
            }

            const module = await import('apexcharts');
            if (!active || chartElement.current === null) {
                return;
            }

            chart = new module.default(chartElement.current, {
                ...options,
                chart: {
                    ...options.chart,
                    type,
                    height,
                },
                series,
            });
            await chart.render();
        };

        void renderChart();

        return () => {
            active = false;
            if (chart !== null) {
                chart.destroy();
            }
        };
    }, [height, options, series, type]);

    return <div ref={chartElement} className="min-h-[260px]" />;
}
