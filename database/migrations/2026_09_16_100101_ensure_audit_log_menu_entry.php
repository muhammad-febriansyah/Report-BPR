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
        $administratorId = DB::table('roles')->where('slug', 'administrator')->value('id');
        if ($administratorId === null || DB::table('menu')->where('route_name', 'admin.audit-logs.index')->exists()) {
            return;
        }

        $menuId = DB::table('menu')->insertGetId([
            'parent_id' => null,
            'name' => 'Riwayat Aktivitas',
            'route_name' => 'admin.audit-logs.index',
            'url' => null,
            'color' => 'Activity',
            'position' => 95,
            'status' => true,
            'role_restricted' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('menu_role')->insert(['menu_id' => $menuId, 'role_id' => $administratorId]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $menuId = DB::table('menu')->where('route_name', 'admin.audit-logs.index')->value('id');
        if ($menuId !== null) {
            DB::table('menu_role')->where('menu_id', $menuId)->delete();
            DB::table('menu')->where('id', $menuId)->delete();
        }
    }
};
