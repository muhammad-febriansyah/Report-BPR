<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();
        $administratorIds = DB::table('roles')
            ->whereIn('slug', ['admin', 'administrator'])
            ->orWhereRaw('LOWER(name) IN (?, ?)', ['admin', 'administrator'])
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $parentId = DB::table('menu')
            ->whereNull('parent_id')
            ->where('name', 'Master Data')
            ->value('id');

        if ($parentId === null) {
            $parentId = DB::table('menu')->insertGetId([
                'parent_id' => null,
                'name' => 'Master Data',
                'route_name' => null,
                'url' => null,
                'color' => 'PanelsTopLeft',
                'position' => 80,
                'status' => true,
                'role_restricted' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        foreach ([
            ['name' => 'Master Area', 'route_name' => 'admin.master-area.index', 'color' => 'Landmark', 'position' => 10],
            ['name' => 'Mapping Network Area', 'route_name' => 'admin.mapping-network-area.index', 'color' => 'PanelsTopLeft', 'position' => 20],
        ] as $item) {
            $menuId = DB::table('menu')->where('route_name', $item['route_name'])->value('id');

            if ($menuId === null) {
                $menuId = DB::table('menu')->insertGetId([
                    ...$item,
                    'parent_id' => $parentId,
                    'url' => null,
                    'status' => true,
                    'role_restricted' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('menu')->where('id', $menuId)->update([
                    'parent_id' => $parentId,
                    'name' => $item['name'],
                    'color' => $item['color'],
                    'position' => $item['position'],
                    'status' => true,
                    'role_restricted' => true,
                    'updated_at' => $now,
                ]);
            }

            DB::table('menu_role')->where('menu_id', $menuId)->delete();

            if ($administratorIds !== []) {
                DB::table('menu_role')->insert(array_map(
                    fn (int $roleId): array => ['menu_id' => $menuId, 'role_id' => $roleId],
                    $administratorIds,
                ));
            }
        }

        DB::table('menu_role')->where('menu_id', $parentId)->delete();

        if ($administratorIds !== []) {
            DB::table('menu_role')->insert(array_map(
                fn (int $roleId): array => ['menu_id' => $parentId, 'role_id' => $roleId],
                $administratorIds,
            ));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $menuIds = DB::table('menu')
            ->whereIn('route_name', [
                'admin.master-area.index',
                'admin.mapping-network-area.index',
            ])
            ->pluck('id');

        DB::table('menu_role')->whereIn('menu_id', $menuIds)->delete();
        DB::table('menu')->whereIn('id', $menuIds)->delete();

        $parentId = DB::table('menu')
            ->whereNull('parent_id')
            ->where('name', 'Master Data')
            ->value('id');

        if ($parentId !== null && ! DB::table('menu')->where('parent_id', $parentId)->exists()) {
            DB::table('menu_role')->where('menu_id', $parentId)->delete();
            DB::table('menu')->where('id', $parentId)->delete();
        }
    }
};
