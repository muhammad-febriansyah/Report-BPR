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
        Schema::create('mapping_network_area', function (Blueprint $table) {
            $table->string('id', 255)->nullable();
            $table->integer('id_perusahaan')->nullable();
            $table->string('cabang', 255)->nullable();
            $table->integer('kategori')->nullable();
            $table->string('area', 255)->nullable();
            $table->integer('created_at')->nullable();
            $table->integer('update_at')->nullable();

            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mapping_network_area');
    }
};
