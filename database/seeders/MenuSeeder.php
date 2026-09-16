<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MenuSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $administrator = Role::query()->administrator()->firstOrFail();

        Menu::query()
            ->whereNull('parent_id')
            ->whereNull('route_name')
            ->where('name', 'Dashboard')
            ->update([
                'name' => 'Dashboard Modul',
                'color' => 'PanelsTopLeft',
                'position' => 15,
            ]);

        $dashboard = Menu::query()->updateOrCreate(
            ['route_name' => 'dashboard'],
            [
                'parent_id' => null,
                'name' => 'Dashboard',
                'url' => null,
                'color' => 'LayoutDashboard',
                'position' => 10,
                'status' => true,
            ],
        );
        $dashboard->roles()->sync([]);

        $metabase = Menu::query()->firstOrCreate(
            ['parent_id' => null, 'name' => 'Metabase'],
            [
                'route_name' => null,
                'url' => null,
                'color' => 'ChartNoAxesCombined',
                'position' => 20,
                'status' => true,
                'role_restricted' => false,
            ],
        );
        $metabase->roles()->sync([]);

        $categoryNames = DB::table('master_menu')
            ->pluck('name')
            ->map(fn (string $name): string => mb_strtolower($name))
            ->reject(fn (string $name): bool => in_array($name, ['dashboard', 'erp'], true))
            ->values();

        foreach ($categoryNames as $index => $name) {
            $position = ($index + 1) * 10;
            Menu::query()
                ->whereNull('parent_id')
                ->whereRaw('LOWER(name) = ?', [$name])
                ->update([
                    'parent_id' => $metabase->id,
                    'position' => $position,
                ]);
        }

        Menu::query()
            ->whereNull('parent_id')
            ->whereRaw('LOWER(name) = ?', ['erp'])
            ->update(['position' => 30]);

        $masterDataGroup = Menu::query()->firstOrCreate(
            ['parent_id' => null, 'name' => 'Master Data'],
            [
                'route_name' => null,
                'url' => null,
                'color' => 'PanelsTopLeft',
                'position' => 80,
                'status' => true,
            ],
        );
        $masterDataGroup->roles()->sync([$administrator->id]);
        $masterDataGroup->forceFill(['role_restricted' => true])->save();

        foreach ([
            ['name' => 'Pengguna', 'route_name' => 'admin.users.index', 'color' => 'Users', 'position' => 10],
            ['name' => 'Menu Builder', 'route_name' => 'admin.menus.index', 'color' => 'PanelsTopLeft', 'position' => 20],
            ['name' => 'Riwayat Aktivitas', 'route_name' => 'admin.audit-logs.index', 'color' => 'Activity', 'position' => 30],
            ['name' => 'Page Builder', 'route_name' => 'admin.metabase-pages.index', 'color' => 'PanelsTopLeft', 'position' => 40],
            ['name' => 'Akses Role', 'route_name' => 'admin.role-access.index', 'color' => 'ShieldCheck', 'position' => 50],
        ] as $item) {
            $menu = Menu::query()->updateOrCreate(
                ['route_name' => $item['route_name']],
                [
                    ...$item,
                    'parent_id' => null,
                    'url' => null,
                    'status' => true,
                    'role_restricted' => true,
                ],
            );
            $menu->roles()->sync([$administrator->id]);
        }

        foreach ([
            ['name' => 'Master Area', 'route_name' => 'admin.master-area.index', 'color' => 'Landmark', 'position' => 10],
            ['name' => 'Mapping Network Area', 'route_name' => 'admin.mapping-network-area.index', 'color' => 'PanelsTopLeft', 'position' => 20],
        ] as $item) {
            $menu = Menu::query()->updateOrCreate(
                ['route_name' => $item['route_name']],
                [
                    ...$item,
                    'parent_id' => $masterDataGroup->id,
                    'url' => null,
                    'status' => true,
                    'role_restricted' => true,
                ],
            );
            $menu->roles()->sync([$administrator->id]);
        }
    }
}
