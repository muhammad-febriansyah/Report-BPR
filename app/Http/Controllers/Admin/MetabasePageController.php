<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveMetabasePageRequest;
use App\Models\MasterMenu;
use App\Models\Menu;
use App\Models\MenuPage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class MetabasePageController extends Controller
{
    /**
     * Display all pages configured below the dynamic Metabase menu group.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'all'])],
        ]);
        $menus = $this->metabaseMenus();
        $menusById = $menus->keyBy('id');
        $masterMenus = MasterMenu::query()->orderBy('id')->get(['id', 'name']);
        $menuIds = $menus
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $search = trim((string) ($filters['search'] ?? ''));

        $pages = MenuPage::query()
            ->whereIn('menu_id', $menuIds)
            ->with('menu:id,parent_id,name,status,position')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('iframe_url', 'like', "%{$search}%")
                        ->orWhere('iframe_title', 'like', "%{$search}%")
                        ->orWhereHas('menu', fn ($menuQuery) => $menuQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(($filters['status'] ?? 'all') !== 'all', function (Builder $query) use ($filters): void {
                $status = $filters['status'] === 'active';
                $query->where('status', $status)
                    ->whereHas('menu', fn (Builder $menuQuery) => $menuQuery->where('status', $status));
            })
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->cursorPaginate(20)
            ->withQueryString();

        $pages->through(function (MenuPage $page) use ($menusById, $masterMenus): array {
            $menu = $page->menu;
            $path = $menu instanceof Menu ? $this->menuPath($menu, $menusById) : [];

            return [
                'id' => $page->id,
                'menu_id' => $page->menu_id,
                'title' => $menu?->name ?? 'Menu tidak ditemukan',
                'path' => implode(' / ', $path),
                'master_menu_id' => $menu instanceof Menu
                    ? $this->masterMenuIdForMenu($menu, $menusById, $masterMenus)
                    : null,
                'iframe_url' => $page->iframe_url,
                'iframe_title' => $page->iframe_title,
                'iframe_description' => $page->iframe_description,
                'status' => $page->status && ($menu?->status ?? false),
                'updated_at' => $page->updated_at?->toISOString(),
            ];
        });

        $metabase = $menus->first(fn (Menu $menu): bool => $menu->parent_id === null && mb_strtolower($menu->name) === 'metabase');
        $parents = $masterMenus
            ->map(function (MasterMenu $masterMenu) use ($menus, $metabase): array {
                $category = $menus->first(function (Menu $menu) use ($masterMenu, $metabase): bool {
                    return $menu->parent_id === $metabase?->id
                        && mb_strtolower($menu->name) === mb_strtolower($masterMenu->name);
                });

                return [
                    'id' => $masterMenu->id,
                    'title' => $this->formatMasterMenuName($masterMenu->name),
                    'path' => 'Metabase / '.$this->formatMasterMenuName($masterMenu->name),
                    'exists' => $category instanceof Menu,
                ];
            })
            ->values();

        return Inertia::render('admin/metabase-pages/index', [
            'pages' => $pages,
            'parents' => $parents,
            'filters' => [
                'search' => $search,
                'status' => $filters['status'] ?? 'all',
            ],
            'embedHosts' => config('services.metabase.embed_hosts', []),
        ]);
    }

    /**
     * Create a new dynamic menu and its Metabase iframe page in one transaction.
     */
    public function store(SaveMetabasePageRequest $request): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($data): void {
            $category = $this->resolveMasterMenuCategory((int) $data['master_menu_id']);
            $position = ((int) Menu::query()->where('parent_id', $category->id)->max('position')) + 1;
            $menu = Menu::query()->create([
                'parent_id' => $category->id,
                'name' => $data['title'],
                'route_name' => null,
                'url' => null,
                'color' => 'FileText',
                'position' => $position,
                'status' => $data['status'],
                'role_restricted' => false,
            ]);

            $menu->page()->create([
                'page_type' => 'iframe',
                'iframe_url' => $data['iframe_url'],
                'iframe_title' => $data['iframe_title'] ?? null,
                'iframe_description' => $data['iframe_description'] ?? null,
                'status' => $data['status'],
            ]);
        });

        return to_route('admin.metabase-pages.index')->with('success', 'Halaman Metabase berhasil dibuat.');
    }

    /**
     * Update the navigation label and iframe configuration of a page.
     */
    public function update(SaveMetabasePageRequest $request, MenuPage $page): RedirectResponse
    {
        $this->ensureMetabasePage($page);
        $data = $request->validated();

        DB::transaction(function () use ($data, $page): void {
            $page->loadMissing('menu');
            $menu = $page->menu;

            if (! $menu instanceof Menu) {
                throw ValidationException::withMessages([
                    'page' => 'Menu halaman tidak ditemukan.',
                ]);
            }

            $category = $this->resolveMasterMenuCategory((int) $data['master_menu_id']);
            if ($menu->parent_id !== $category->id) {
                $menu->position = ((int) Menu::query()->where('parent_id', $category->id)->max('position')) + 1;
            }

            $menu->fill([
                'parent_id' => $category->id,
                'name' => $data['title'],
                'status' => $data['status'],
            ])->save();

            $page->fill([
                'page_type' => 'iframe',
                'iframe_url' => $data['iframe_url'],
                'iframe_title' => $data['iframe_title'] ?? null,
                'iframe_description' => $data['iframe_description'] ?? null,
                'status' => $data['status'],
            ])->save();
        });

        return to_route('admin.metabase-pages.index')->with('success', 'Halaman Metabase berhasil diperbarui.');
    }

    /**
     * Delete the page and its generated menu entry.
     */
    public function destroy(MenuPage $page): RedirectResponse
    {
        $this->ensureMetabasePage($page);
        $page->loadMissing('menu');

        if ($page->menu?->children()->exists()) {
            throw ValidationException::withMessages([
                'page' => 'Pindahkan atau hapus submenu sebelum menghapus halaman ini.',
            ]);
        }

        DB::transaction(function () use ($page): void {
            $menu = $page->menu;
            $page->delete();
            $menu?->delete();
        });

        return to_route('admin.metabase-pages.index')->with('success', 'Halaman Metabase berhasil dihapus.');
    }

    /**
     * Resolve a master menu into the category below Metabase, creating it when
     * the category has not been added to the navigation yet.
     */
    private function resolveMasterMenuCategory(int $masterMenuId): Menu
    {
        $masterMenu = MasterMenu::query()->findOrFail($masterMenuId);
        $metabase = $this->metabaseMenus()->firstWhere('parent_id', null);

        if (! $metabase instanceof Menu) {
            throw ValidationException::withMessages([
                'master_menu_id' => 'Grup Metabase belum tersedia di Menu Builder.',
            ]);
        }

        $category = Menu::query()
            ->where('parent_id', $metabase->id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($masterMenu->name)])
            ->first();

        if ($category instanceof Menu) {
            return $category;
        }

        return Menu::query()->create([
            'parent_id' => $metabase->id,
            'name' => $this->formatMasterMenuName($masterMenu->name),
            'route_name' => null,
            'url' => null,
            'color' => 'PanelsTopLeft',
            'position' => ((int) Menu::query()->where('parent_id', $metabase->id)->max('position')) + 1,
            'status' => true,
            'role_restricted' => false,
        ]);
    }

    private function formatMasterMenuName(string $name): string
    {
        return match (mb_strtoupper($name)) {
            'OSM' => 'OSM',
            'BOM' => 'Bom',
            'ERP' => 'ERP',
            'ORS' => 'Ors',
            'KISS' => 'Kiss',
            'LEGAL' => 'Legal',
            'BILLING' => 'Billing',
            'FINANCE' => 'Finance',
            'ABSENSI' => 'Absensi',
            default => mb_convert_case(mb_strtolower($name), MB_CASE_TITLE),
        };
    }

    /**
     * Find the master menu id represented by a page's category.
     *
     * @param  Collection<int, Menu>  $menusById
     * @param  Collection<int, MasterMenu>  $masterMenus
     */
    private function masterMenuIdForMenu(Menu $menu, Collection $menusById, Collection $masterMenus): ?int
    {
        $metabaseId = $menusById
            ->first(fn (Menu $candidate): bool => $candidate->parent_id === null && mb_strtolower($candidate->name) === 'metabase')
            ?->id;
        $parentId = $menu->parent_id;
        $visited = [];

        while ($parentId !== null && ! isset($visited[(int) $parentId])) {
            $parent = $menusById->get($parentId);
            if (! $parent instanceof Menu) {
                return null;
            }

            if ($parent->parent_id === $metabaseId) {
                return $masterMenus
                    ->first(fn (MasterMenu $masterMenu): bool => mb_strtolower($masterMenu->name) === mb_strtolower($parent->name))
                    ?->id;
            }

            $visited[(int) $parent->id] = true;
            $parentId = $parent->parent_id;
        }

        return null;
    }

    /**
     * Prevent a manually supplied page id from mutating a page outside Metabase.
     */
    private function ensureMetabasePage(MenuPage $page): void
    {
        abort_unless($this->metabaseMenus()->contains('id', $page->menu_id), 404);
    }

    /**
     * Get the complete menu hierarchy rooted at the dynamic Metabase group.
     *
     * @return Collection<int, Menu>
     */
    private function metabaseMenus(): Collection
    {
        $menus = Menu::query()
            ->select(['id', 'parent_id', 'name', 'position', 'status'])
            ->orderBy('position')
            ->orderBy('id')
            ->get();
        $menusByParent = $menus->groupBy(fn (Menu $menu): int => $menu->parent_id ?? 0);
        $metabase = $menus->first(fn (Menu $menu): bool => $menu->parent_id === null && mb_strtolower($menu->name) === 'metabase');

        if (! $metabase instanceof Menu) {
            return collect();
        }

        $includedIds = [];
        $visit = function (Menu $menu, array $ancestors = []) use (&$visit, &$includedIds, $menusByParent): void {
            if (isset($ancestors[$menu->id])) {
                return;
            }

            $includedIds[$menu->id] = true;
            $ancestors[$menu->id] = true;

            foreach ($menusByParent->get($menu->id, collect()) as $child) {
                $visit($child, $ancestors);
            }
        };
        $visit($metabase);

        return $menus->filter(fn (Menu $menu): bool => isset($includedIds[$menu->id]))->values();
    }

    /**
     * Build a readable hierarchy path for a menu option or page record.
     *
     * @param  Collection<int, Menu>  $menusById
     * @return list<string>
     */
    private function menuPath(Menu $menu, Collection $menusById): array
    {
        $path = [$menu->name];
        $visited = [(int) $menu->id => true];
        $parentId = $menu->parent_id;

        while ($parentId !== null && ! isset($visited[(int) $parentId])) {
            $parent = $menusById->get($parentId);
            if (! $parent instanceof Menu) {
                break;
            }

            $visited[(int) $parent->id] = true;
            array_unshift($path, $parent->name);
            $parentId = $parent->parent_id;
        }

        return $path;
    }
}
