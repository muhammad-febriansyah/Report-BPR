<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('master_area', function (Blueprint $table) {
            $table->integer('id')->autoIncrement();
            $table->string('client_company');
            $table->string('client_branch');
            $table->string('group', 50);
            $table->string('kota', 100);
            $table->string('area_new', 100);
            $table->string('regional_head');
            $table->string('area_operational_manager');
            $table->string('bso');
            $table->string('id_klien', 50);
            $table->string('id_cabang', 50);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
            $table->primary('id');

            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_general_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_area');
    }
};
