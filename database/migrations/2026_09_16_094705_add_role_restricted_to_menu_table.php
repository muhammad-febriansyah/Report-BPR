<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('menu', function (Blueprint $table): void {
            $table->boolean('role_restricted')->default(false)->after('status');
        });

        $restrictedMenuIds = DB::table('menu_role')->distinct()->pluck('menu_id');

        if ($restrictedMenuIds->isNotEmpty()) {
            DB::table('menu')
                ->whereIn('id', $restrictedMenuIds)
                ->update(['role_restricted' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu', function (Blueprint $table): void {
            $table->dropColumn('role_restricted');
        });
    }
};
