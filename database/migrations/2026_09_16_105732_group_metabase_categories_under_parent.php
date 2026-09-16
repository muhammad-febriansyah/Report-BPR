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
        $metabase = DB::table('menu')
            ->whereNull('parent_id')
            ->whereRaw('LOWER(name) = ?', ['metabase'])
            ->first(['id']);

        $metabaseId = $metabase?->id;

        if ($metabaseId === null) {
            $metabaseId = DB::table('menu')->insertGetId([
                'parent_id' => null,
                'name' => 'Metabase',
                'route_name' => null,
                'url' => null,
                'color' => 'ChartNoAxesCombined',
                'position' => 20,
                'status' => true,
                'role_restricted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $categoryNames = DB::table('master_menu')
            ->pluck('name')
            ->map(fn (string $name): string => mb_strtolower($name))
            ->reject(fn (string $name): bool => in_array($name, ['dashboard', 'erp'], true))
            ->values();

        foreach ($categoryNames as $index => $name) {
            $position = ($index + 1) * 10;
            DB::table('menu')
                ->whereNull('parent_id')
                ->whereRaw('LOWER(name) = ?', [$name])
                ->update([
                    'parent_id' => $metabaseId,
                    'position' => $position,
                    'updated_at' => $now,
                ]);
        }

        // Keep ERP as a separate top-level module, after Metabase.
        DB::table('menu')
            ->whereNull('parent_id')
            ->whereRaw('LOWER(name) = ?', ['erp'])
            ->update(['position' => 30, 'updated_at' => $now]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $metabase = DB::table('menu')
            ->whereNull('parent_id')
            ->whereRaw('LOWER(name) = ?', ['metabase'])
            ->first(['id']);

        if ($metabase === null) {
            return;
        }

        $categoryNames = DB::table('master_menu')
            ->pluck('name')
            ->map(fn (string $name): string => mb_strtolower($name))
            ->reject(fn (string $name): bool => in_array($name, ['dashboard', 'erp'], true))
            ->values();

        foreach ($categoryNames as $index => $name) {
            $position = ($index + 1) * 10;
            DB::table('menu')
                ->where('parent_id', $metabase->id)
                ->whereRaw('LOWER(name) = ?', [$name])
                ->update(['parent_id' => null, 'position' => $position, 'updated_at' => now()]);
        }

        // Keep the parent row intact on rollback so a manually configured
        // Metabase group is never removed by a schema rollback.
    }
};
