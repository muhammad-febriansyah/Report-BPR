<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $summary = Cache::remember('dashboard.summary', now()->addSeconds(30), function (): array {
            $startOfPeriod = CarbonImmutable::today()->subDays(6);
            $endOfPeriod = CarbonImmutable::today()->endOfDay();

            $activityByDate = AuditLog::query()
                ->whereBetween('created_at', [$startOfPeriod, $endOfPeriod])
                ->selectRaw('DATE(created_at) as activity_date, COUNT(*) as total')
                ->groupBy('activity_date')
                ->pluck('total', 'activity_date');

            $loginByDate = AuditLog::query()
                ->where('event', 'login')
                ->whereBetween('created_at', [$startOfPeriod, $endOfPeriod])
                ->selectRaw('DATE(created_at) as activity_date, COUNT(*) as total')
                ->groupBy('activity_date')
                ->pluck('total', 'activity_date');

            $activityTrend = [];
            $loginTrend = [];
            $activityLabels = [];

            for ($day = 0; $day < 7; $day++) {
                $date = $startOfPeriod->addDays($day);
                $dateKey = $date->toDateString();
                $activityLabels[] = $date->isoFormat('ddd');
                $activityTrend[] = (int) ($activityByDate[$dateKey] ?? 0);
                $loginTrend[] = (int) ($loginByDate[$dateKey] ?? 0);
            }

            return [
                'usersTotal' => User::query()->count(),
                'usersActive' => User::query()->where('status', true)->count(),
                'areasTotal' => DB::table('master_area')->distinct()->count('id_cabang'),
                'activityTotal' => array_sum($activityTrend),
                'activityLabels' => $activityLabels,
                'activityTrend' => $activityTrend,
                'loginTrend' => $loginTrend,
            ];
        });

        $recentActivities = AuditLog::query()
            ->select(['id', 'user_name', 'event', 'description', 'ip_address', 'created_at'])
            ->latest('created_at')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(fn (AuditLog $activity): array => [
                'id' => $activity->id,
                'userName' => $activity->user_name ?? 'Sistem',
                'event' => $activity->event,
                'description' => $activity->description,
                'ipAddress' => $activity->ip_address,
                'createdAt' => $activity->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('dashboard', [
            ...$summary,
            'usersInactive' => max(0, $summary['usersTotal'] - $summary['usersActive']),
            'recentActivities' => $recentActivities,
        ]);
    }
}
