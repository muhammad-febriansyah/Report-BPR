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
        Schema::create('menu_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')
                ->unique()
                ->constrained('menu')
                ->cascadeOnDelete();
            $table->string('page_type', 30)->default('iframe');
            $table->text('iframe_url');
            $table->string('iframe_title', 160)->nullable();
            $table->text('iframe_description')->nullable();
            $table->boolean('status')->default(true);
            $table->timestamps();

            $table->index(['page_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_pages');
    }
};
