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
        if (! DB::table('menu')
            ->whereNull('parent_id')
            ->whereNull('route_name')
            ->where('name', 'Dashboard')
            ->exists()) {
            return;
        }

        DB::transaction(function (): void {
            DB::table('menu')
                ->whereNull('parent_id')
                ->whereNull('route_name')
                ->where('name', 'Dashboard')
                ->update([
                    'name' => 'Dashboard Modul',
                    'color' => 'PanelsTopLeft',
                    'position' => 15,
                    'updated_at' => now(),
                ]);

            DB::table('menu')->updateOrInsert(
                ['route_name' => 'dashboard'],
                [
                    'parent_id' => null,
                    'name' => 'Dashboard',
                    'url' => null,
                    'color' => 'LayoutDashboard',
                    'position' => 10,
                    'status' => true,
                    'role_restricted' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::transaction(function (): void {
            DB::table('menu')->where('route_name', 'dashboard')->delete();
            DB::table('menu')
                ->whereNull('parent_id')
                ->where('name', 'Dashboard Modul')
                ->update([
                    'name' => 'Dashboard',
                    'color' => 'LayoutDashboard',
                    'position' => 0,
                    'updated_at' => now(),
                ]);
        });
    }
};
