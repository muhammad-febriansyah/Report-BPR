<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveRoleAccessRequest;
use App\Models\Menu;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class RoleAccessController extends Controller
{
    /**
     * Display the access tree for a selected role.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'role' => ['nullable', 'integer', Rule::exists(Role::class, 'id')],
        ]);

        $roles = Role::query()
            ->select(['id', 'name', 'slug'])
            ->withCount('users')
            ->orderBy('name')
            ->orderBy('id')
            ->get();
        $selectedRole = isset($filters['role'])
            ? $roles->firstWhere('id', (int) $filters['role'])
            : $roles->firstWhere('slug', 'administrator');
        $selectedRole ??= $roles->first();

        $menus = Menu::query()
            ->select(['id', 'parent_id', 'name', 'position', 'status', 'role_restricted'])
            ->with('roles:id')
            ->orderBy('position')
            ->orderBy('id')
            ->get();
        $menusById = $menus->keyBy('id');
        $menuRecords = $menus->map(function (Menu $menu) use ($menusById, $selectedRole): array {
            $path = $this->menuPath($menu, $menusById);

            return [
                'id' => $menu->id,
                'parent_id' => $menu->parent_id,
                'title' => $menu->name,
                'path' => implode(' / ', $path),
                'depth' => count($path) - 1,
                'sort_order' => $menu->position ?? 0,
                'status' => $menu->status,
                'role_restricted' => $menu->role_restricted,
                'has_access' => $selectedRole === null
                    || ! $menu->role_restricted
                    || $menu->roles->contains('id', $selectedRole->id),
            ];
        })->values();

        return Inertia::render('admin/role-access/index', [
            'roles' => $roles,
            'selectedRole' => $selectedRole,
            'menus' => $menuRecords,
        ]);
    }

    /**
     * Replace one role's allowed menu set while preserving other roles' access.
     */
    public function update(SaveRoleAccessRequest $request, Role $role): RedirectResponse
    {
        $allowedMenuIds = array_fill_keys(
            array_map('intval', $request->validated('menu_ids')),
            true,
        );

        DB::transaction(function () use ($role, $allowedMenuIds): void {
            Role::query()->whereKey($role->id)->lockForUpdate()->firstOrFail();

            $roleIds = Role::query()
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
            $otherRoleIds = array_values(array_filter(
                $roleIds,
                fn (int $roleId): bool => $roleId !== (int) $role->id,
            ));
            $menus = Menu::query()
                ->with('roles:id')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();
            $menuIdsToRestrict = [];
            $menuIdsToRevoke = [];
            $roleAssignmentsToInsert = [];

            foreach ($menus as $menu) {
                $shouldAllow = isset($allowedMenuIds[$menu->id]);
                $grantedRoleIds = $menu->roles
                    ->pluck('id')
                    ->map(fn ($id): int => (int) $id)
                    ->all();
                $isGrantedToRole = in_array((int) $role->id, $grantedRoleIds, true);

                if (! $menu->role_restricted) {
                    if ($shouldAllow) {
                        continue;
                    }

                    $menuIdsToRestrict[] = $menu->id;

                    foreach ($otherRoleIds as $otherRoleId) {
                        $roleAssignmentsToInsert[] = [
                            'menu_id' => $menu->id,
                            'role_id' => $otherRoleId,
                        ];
                    }

                    continue;
                }

                if ($shouldAllow && ! $isGrantedToRole) {
                    $roleAssignmentsToInsert[] = [
                        'menu_id' => $menu->id,
                        'role_id' => (int) $role->id,
                    ];
                } elseif (! $shouldAllow && $isGrantedToRole) {
                    $menuIdsToRevoke[] = $menu->id;
                }
            }

            if ($menuIdsToRestrict !== []) {
                Menu::query()
                    ->whereKey($menuIdsToRestrict)
                    ->update([
                        'role_restricted' => true,
                        'updated_at' => now(),
                    ]);
            }

            foreach (array_chunk($roleAssignmentsToInsert, 500) as $assignments) {
                DB::table('menu_role')->insertOrIgnore($assignments);
            }

            if ($menuIdsToRevoke !== []) {
                DB::table('menu_role')
                    ->where('role_id', $role->id)
                    ->whereIn('menu_id', $menuIdsToRevoke)
                    ->delete();
            }
        });

        return to_route('admin.role-access.index', ['role' => $role->id])
            ->with('success', 'Akses menu untuk role berhasil diperbarui.');
    }

    /**
     * Build a menu breadcrumb path while guarding against broken legacy cycles.
     *
     * @param  Collection<int, Menu>  $menusById
     * @return list<string>
     */
    private function menuPath(Menu $menu, Collection $menusById): array
    {
        $path = [$menu->name];
        $visitedIds = [(int) $menu->id => true];
        $parentId = $menu->parent_id;

        while ($parentId !== null && ! isset($visitedIds[(int) $parentId])) {
            $parent = $menusById->get($parentId);

            if (! $parent instanceof Menu) {
                break;
            }

            $visitedIds[(int) $parent->id] = true;
            array_unshift($path, $parent->name);
            $parentId = $parent->parent_id;
        }

        return $path;
    }
}
