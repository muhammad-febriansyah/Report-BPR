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
        Schema::create('master_menu', function (Blueprint $table) {
            $table->integer('id')->primary();
            $table->string('name');
        });

        DB::table('master_menu')->insert([
            ['id' => 1, 'name' => 'DASHBOARD'],
            ['id' => 2, 'name' => 'OSM'],
            ['id' => 3, 'name' => 'BOM'],
            ['id' => 4, 'name' => 'LEGAL'],
            ['id' => 5, 'name' => 'ORS'],
            ['id' => 6, 'name' => 'ERP'],
            ['id' => 7, 'name' => 'BILLING'],
            ['id' => 8, 'name' => 'KISS'],
            ['id' => 9, 'name' => 'FINANCE'],
            ['id' => 10, 'name' => 'ABSENSI'],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_menu');
    }
};
