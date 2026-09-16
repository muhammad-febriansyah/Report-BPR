<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MappingNetworkArea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MappingNetworkAreaController extends Controller
{
    /**
     * Display the network area mapping reference data.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $search = trim($filters['search'] ?? '');
        $mappings = MappingNetworkArea::query()
            ->select(['id', 'id_perusahaan', 'cabang', 'kategori', 'area', 'created_at', 'update_at'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $prefix = $search.'%';

                $query->where(function (Builder $query) use ($prefix): void {
                    $query->where('id', 'like', $prefix)
                        ->orWhere('id_perusahaan', 'like', $prefix)
                        ->orWhere('cabang', 'like', $prefix)
                        ->orWhere('kategori', 'like', $prefix)
                        ->orWhere('area', 'like', $prefix);
                });
            })
            ->orderBy('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/mapping-network-area/index', [
            'mappings' => $mappings,
            'filters' => ['search' => $search],
        ]);
    }
}
