<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterArea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MasterAreaController extends Controller
{
    /**
     * Display the master area reference data.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $search = trim($filters['search'] ?? '');
        $areas = MasterArea::query()
            ->select([
                'id',
                'client_company',
                'client_branch',
                'group',
                'kota',
                'area_new',
                'regional_head',
                'area_operational_manager',
                'bso',
                'id_klien',
                'id_cabang',
            ])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $prefix = $search.'%';

                $query->where(function (Builder $query) use ($prefix): void {
                    foreach ([
                        'client_company',
                        'client_branch',
                        'group',
                        'kota',
                        'area_new',
                        'regional_head',
                        'area_operational_manager',
                        'bso',
                        'id_klien',
                        'id_cabang',
                    ] as $column) {
                        $query->orWhere($column, 'like', $prefix);
                    }
                });
            })
            ->orderBy('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/master-area/index', [
            'areas' => $areas,
            'filters' => ['search' => $search],
        ]);
    }
}
