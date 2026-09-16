<?php

namespace App\Http\Middleware;

use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'canAccessAdministration' => fn (): bool => $request->user()?->hasRole('administrator') ?? false,
            'menuItems' => fn (): array => $this->menuItems($request->user()),
            'notifications' => fn (): array => $this->notifications($request->user()),
            'flash' => [
                'success' => fn (): ?string => $request->session()->get('success'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Get active menu entries visible to the signed-in user's roles.
     *
     * @return array<int, array<string, mixed>>
     */
    private function menuItems(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        $roleIds = $this->navigationRoleIds($user);
        $menus = Menu::query()
            ->select(['id', 'parent_id', 'name', 'route_name', 'url', 'color', 'position', 'role_restricted'])
            ->where('status', true)
            ->with('roles:id')
            ->orderBy('position')
            ->orderBy('id')
            ->get();
        $childrenByParent = $menus->groupBy(fn (Menu $menu): int => $menu->parent_id ?? 0);

        $masterMenuLabels = DB::table('master_menu')
            ->pluck('name')
            ->mapWithKeys(fn (string $name): array => [mb_strtolower($name) => $this->formatMasterMenuLabel($name)])
            ->all();
        $metabaseId = (int) $menus
            ->first(fn (Menu $menu): bool => mb_strtolower($menu->name) === 'metabase')?->id;

        return $childrenByParent->get(0, collect())
            ->map(fn (Menu $menu): ?array => $this->navigationTree(
                $menu,
                $roleIds,
                $masterMenuLabels,
                $metabaseId,
                $childrenByParent,
            ))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * Get the latest notifications for the signed-in user.
     *
     * @return array{items: array<int, array<string, mixed>>, unread_count: int}
     */
    private function notifications(?User $user): array
    {
        if ($user === null) {
            return [
                'items' => [],
                'unread_count' => 0,
            ];
        }

        $notifications = $user->notifications()
            ->latest()
            ->limit(30)
            ->get();

        return [
            'items' => $notifications->map(function (DatabaseNotification $notification): array {
                $data = is_array($notification->data) ? $notification->data : [];

                return [
                    'id' => (string) $notification->id,
                    'title' => (string) ($data['title'] ?? 'Notifikasi sistem'),
                    'message' => (string) ($data['message'] ?? ''),
                    'type' => (string) ($data['type'] ?? 'info'),
                    'href' => is_string($data['href'] ?? null) ? $data['href'] : null,
                    'read_at' => $notification->read_at?->toISOString(),
                    'created_at' => $notification->created_at?->toISOString(),
                ];
            })->values()->all(),
            'unread_count' => $user->unreadNotifications()->count(),
        ];
    }

    /**
     * Build the visible menu tree without triggering lazy-loaded relationships.
     *
     * @param  array<int, int>  $roleIds
     * @param  array<string, string>  $masterMenuLabels
     * @param  Collection<int, Collection<int, Menu>>  $childrenByParent
     * @return array<string, mixed>|null
     */
    private function navigationTree(
        Menu $menu,
        array $roleIds,
        array $masterMenuLabels,
        int $metabaseId,
        Collection $childrenByParent,
        array $ancestorIds = [],
    ): ?array {
        if (isset($ancestorIds[$menu->id])) {
            return null;
        }

        $ancestorIds[$menu->id] = true;
        $children = $childrenByParent->get($menu->id, collect())
            ->map(fn (Menu $child): ?array => $this->navigationTree(
                $child,
                $roleIds,
                $masterMenuLabels,
                $metabaseId,
                $childrenByParent,
                $ancestorIds,
            ))
            ->filter()
            ->values();

        if (! $this->canSeeMenu($menu, $roleIds) && $children->isEmpty()) {
            return null;
        }

        $item = $this->navigationItem($menu, $children->isEmpty());

        $masterMenuKey = mb_strtolower($menu->name);
        if ((int) $menu->parent_id === $metabaseId && isset($masterMenuLabels[$masterMenuKey])) {
            $item['title'] = $masterMenuLabels[$masterMenuKey];
        }

        return [
            ...$item,
            'children' => $children->all(),
        ];
    }

    private function formatMasterMenuLabel(string $name): string
    {
        return match (mb_strtoupper($name)) {
            'OSM' => 'OSM',
            'BOM' => 'Bom',
            'LEGAL' => 'Legal',
            'ORS' => 'Ors',
            'ERP' => 'ERP',
            'BILLING' => 'Billing',
            'KISS' => 'Kiss',
            'FINANCE' => 'Finance',
            'ABSENSI' => 'Absensi',
            default => mb_convert_case(mb_strtolower($name), MB_CASE_TITLE),
        };
    }

    /**
     * Resolve role IDs for navigation, including legacy administrator aliases.
     *
     * Imported databases may contain both an `admin` role and an
     * `Administrator` role. They grant the same administration access.
     *
     * @return array<int, int>
     */
    private function navigationRoleIds(User $user): array
    {
        $roleIds = $user->roles()->pluck('roles.id')->map(fn ($id): int => (int) $id)->all();

        if (! $user->hasRole('administrator')) {
            return $roleIds;
        }

        return array_values(array_unique([
            ...$roleIds,
            ...Role::query()->administrator()->pluck('id')->map(fn ($id): int => (int) $id)->all(),
        ]));
    }

    /**
     * Determine whether a menu has no role restriction or matches the user.
     *
     * @param  array<int, int>  $roleIds
     */
    private function canSeeMenu(Menu $menu, array $roleIds): bool
    {
        if (! $menu->role_restricted) {
            return true;
        }

        $allowedRoleIds = $menu->roles
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return $allowedRoleIds !== [] && array_intersect($allowedRoleIds, $roleIds) !== [];
    }

    /**
     * Convert a database menu into safe navigation data.
     *
     * @return array{id: int, title: string, href: string|null, icon: string|null}
     */
    private function navigationItem(Menu $menu, bool $isLeaf): array
    {
        $href = $menu->url;

        if ($menu->route_name !== null && Route::has($menu->route_name)) {
            $href = route($menu->route_name, absolute: false);
        } elseif ($href === null && $isLeaf) {
            $href = route('menu-destination.show', $menu->id, absolute: false);
        }

        return [
            'id' => $menu->id,
            'title' => $menu->name,
            'href' => $href,
            'icon' => $menu->color,
        ];
    }
}
