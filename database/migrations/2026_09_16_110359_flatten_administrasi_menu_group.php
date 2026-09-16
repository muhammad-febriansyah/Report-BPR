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
        $administratorRoleId = DB::table('roles')
            ->whereIn('slug', ['administrator', 'admin'])
            ->orWhereRaw('LOWER(name) IN (?, ?)', ['administrator', 'admin'])
            ->value('id');
        $adminGroupId = DB::table('menu')
            ->whereNull('parent_id')
            ->whereRaw('LOWER(name) = ?', ['administrasi'])
            ->value('id');

        if ($adminGroupId !== null) {
            $nextPosition = ((int) DB::table('menu')->whereNull('parent_id')->max('position')) + 1;
            $children = DB::table('menu')
                ->where('parent_id', $adminGroupId)
                ->orderBy('position')
                ->orderBy('id')
                ->pluck('id');

            foreach ($children as $childId) {
                DB::table('menu')->where('id', $childId)->update([
                    'parent_id' => null,
                    'position' => $nextPosition++,
                ]);
            }

            DB::table('menu_role')->where('menu_id', $adminGroupId)->delete();
            DB::table('menu')->where('id', $adminGroupId)->delete();
        }

        $adminMenus = [
            ['name' => 'Pengguna', 'route_name' => 'admin.users.index', 'color' => 'Users', 'position' => 90],
            ['name' => 'Menu Builder', 'route_name' => 'admin.menus.index', 'color' => 'PanelsTopLeft', 'position' => 91],
            ['name' => 'Riwayat Aktivitas', 'route_name' => 'admin.audit-logs.index', 'color' => 'Activity', 'position' => 92],
            ['name' => 'Page Builder', 'route_name' => 'admin.metabase-pages.index', 'color' => 'PanelsTopLeft', 'position' => 93],
            ['name' => 'Akses Role', 'route_name' => 'admin.role-access.index', 'color' => 'ShieldCheck', 'position' => 94],
        ];

        foreach ($adminMenus as $adminMenu) {
            DB::table('menu')->updateOrInsert(
                ['route_name' => $adminMenu['route_name']],
                [
                    ...$adminMenu,
                    'parent_id' => null,
                    'url' => null,
                    'status' => true,
                    'role_restricted' => $administratorRoleId !== null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ],
            );

            if ($administratorRoleId !== null) {
                $menuId = DB::table('menu')->where('route_name', $adminMenu['route_name'])->value('id');
                DB::table('menu_role')->where('menu_id', $menuId)->delete();
                DB::table('menu_role')->insertOrIgnore([
                    'menu_id' => $menuId,
                    'role_id' => $administratorRoleId,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $adminGroupId = DB::table('menu')->insertGetId([
            'parent_id' => null,
            'name' => 'Administrasi',
            'route_name' => null,
            'url' => null,
            'color' => 'Settings',
            'position' => 90,
            'status' => true,
            'role_restricted' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('menu')
            ->whereIn('route_name', [
                'admin.users.index',
                'admin.menus.index',
                'admin.audit-logs.index',
                'admin.metabase-pages.index',
                'admin.role-access.index',
            ])
            ->update(['parent_id' => $adminGroupId, 'updated_at' => now()]);
    }
};
