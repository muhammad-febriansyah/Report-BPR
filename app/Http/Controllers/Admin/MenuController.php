<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderMenusRequest;
use App\Http\Requests\Admin\SaveMenuRequest;
use App\Models\Menu;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class MenuController extends Controller
{
    /**
     * Display the menu builder data.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'all'])],
        ]);

        $menus = Menu::query()
            ->select(['id', 'parent_id', 'name', 'route_name', 'url', 'color', 'position', 'status', 'role_restricted'])
            ->with('roles:id,name')
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        $menuNames = $menus->pluck('name', 'id');
        $childrenCounts = $menus
            ->groupBy(fn (Menu $menu): string => (string) $menu->parent_id)
            ->map(fn ($children): int => $children->count());
        $menuRecords = $menus->map(fn (Menu $menu): array => [
            'id' => $menu->id,
            'parent_id' => $menu->parent_id,
            'title' => $menu->name,
            'route_name' => $menu->route_name,
            'url' => $menu->url,
            'icon' => $menu->color,
            'sort_order' => $menu->position ?? 0,
            'status' => $menu->status,
            'role_restricted' => $menu->role_restricted,
            'roles' => $menu->roles->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
            ])->all(),
            'parent' => $menu->parent_id === null ? null : [
                'id' => $menu->parent_id,
                'title' => $menuNames->get($menu->parent_id, 'Menu tidak ditemukan'),
            ],
            'children_count' => $childrenCounts->get((string) $menu->id, 0),
        ])->values();

        $routeNames = collect(Route::getRoutes()->getRoutesByName())
            ->filter(fn ($route) => in_array('GET', $route->methods(), true) && ! str_contains($route->uri(), '{'))
            ->keys()
            ->sort()
            ->values();

        return Inertia::render('admin/menus/index', [
            'menus' => $menuRecords,
            'parents' => $menuRecords->map(fn (array $menu): array => [
                'id' => $menu['id'],
                'parent_id' => $menu['parent_id'],
                'title' => $menu['title'],
            ])->all(),
            'roles' => Role::query()->select(['id', 'name'])->orderBy('name')->get(),
            'routeNames' => $routeNames,
            'icons' => Menu::ICONS,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? 'all',
            ],
        ]);
    }

    /**
     * Store a menu and its role visibility in one transaction.
     */
    public function store(SaveMenuRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $roleIds = $data['role_ids'];
        unset($data['role_ids']);
        $data['role_restricted'] = (bool) ($data['role_restricted'] ?? ($roleIds !== []));

        if (! $data['role_restricted']) {
            $roleIds = [];
        }

        DB::transaction(function () use ($data, $roleIds): void {
            $menu = Menu::create($this->menuAttributes($data));
            $menu->roles()->sync($roleIds);
        });

        return to_route('admin.menus.index')->with('success', 'Menu berhasil dibuat.');
    }

    /**
     * Update a menu and its role visibility in one transaction.
     */
    public function update(SaveMenuRequest $request, Menu $menu): RedirectResponse
    {
        $data = $request->validated();
        $roleIds = $data['role_ids'];
        unset($data['role_ids']);
        $data['role_restricted'] = (bool) ($data['role_restricted'] ?? ($roleIds !== []));

        if (! $data['role_restricted']) {
            $roleIds = [];
        }

        DB::transaction(function () use ($menu, $data, $roleIds): void {
            $menu->fill($this->menuAttributes($data))->save();
            $menu->roles()->sync($roleIds);
        });

        return to_route('admin.menus.index')->with('success', 'Menu berhasil diperbarui.');
    }

    /**
     * Delete a leaf menu entry.
     */
    public function destroy(Menu $menu): RedirectResponse
    {
        if ($menu->children()->exists()) {
            throw ValidationException::withMessages([
                'menu' => 'Pindahkan atau hapus submenu sebelum menghapus menu induk.',
            ]);
        }

        $menu->delete();

        return to_route('admin.menus.index')->with('success', 'Menu berhasil dihapus.');
    }

    /**
     * Persist the complete menu tree after drag-and-drop changes.
     */
    public function reorder(ReorderMenusRequest $request): RedirectResponse
    {
        $items = $request->validated('items');

        DB::transaction(function () use ($items): void {
            $storedMenus = Menu::query()
                ->orderBy('id')
                ->lockForUpdate()
                ->get(['id', 'parent_id', 'name', 'route_name', 'url', 'color', 'position', 'status', 'created_at', 'updated_at']);
            $storedIds = $storedMenus
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
            $submittedIds = collect($items)
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->sort()
                ->values()
                ->all();

            if ($storedIds !== $submittedIds) {
                throw ValidationException::withMessages([
                    'items' => 'Daftar menu berubah. Muat ulang sebelum menyimpan susunan.',
                ]);
            }

            $timestamp = now();
            $storedMenusById = $storedMenus->keyBy('id');
            $updates = collect($items)->map(function (array $item) use ($storedMenusById, $timestamp): array {
                $menu = $storedMenusById->get((int) $item['id']);

                return [
                    'id' => (int) $item['id'],
                    'parent_id' => $item['parent_id'] === null ? null : (int) $item['parent_id'],
                    'name' => $menu->name,
                    'route_name' => $menu->route_name,
                    'url' => $menu->url,
                    'color' => $menu->color,
                    'position' => (int) $item['position'],
                    'status' => $menu->status,
                    'created_at' => $menu->created_at,
                    'updated_at' => $timestamp,
                ];
            })->all();

            if ($updates !== []) {
                Menu::query()->upsert($updates, ['id'], ['parent_id', 'position', 'updated_at']);
            }
        });

        return to_route('admin.menus.index')->with('success', 'Susunan menu berhasil disimpan.');
    }

    /**
     * Map the menu builder form fields to the legacy-compatible database column names.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function menuAttributes(array $data): array
    {
        return [
            'parent_id' => $data['parent_id'],
            'name' => $data['title'],
            'route_name' => $data['route_name'],
            'url' => $data['url'],
            'color' => $data['icon'],
            'position' => $data['sort_order'],
            'status' => $data['status'],
            'role_restricted' => $data['role_restricted'],
        ];
    }
}
