<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $logs = AuditLog::query()
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('user_name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%')
                        ->orWhere('ip_address', 'like', '%'.$search.'%');
                });
            })
            ->latest('created_at')
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/audit-logs/index', [
            'logs' => $logs,
            'filters' => ['search' => $filters['search'] ?? ''],
        ]);
    }
}
