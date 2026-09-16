<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->renameColumn('is_active', 'status');
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->string('guard_name', 80)->default('web')->after('name');
            $table->string('slug', 80)->nullable()->change();
        });

        Schema::table('menus', function (Blueprint $table): void {
            $table->dropForeign(['parent_id']);
        });

        Schema::table('menu_role', function (Blueprint $table): void {
            $table->dropForeign(['menu_id']);
        });

        Schema::rename('menus', 'menu');

        Schema::table('menu', function (Blueprint $table): void {
            $table->renameColumn('title', 'name');
            $table->renameColumn('icon', 'color');
            $table->renameColumn('sort_order', 'position');
            $table->renameColumn('is_active', 'status');
            $table->unsignedSmallInteger('position')->default(0)->nullable()->change();
            $table->foreign('parent_id', 'menu_parent_id_foreign')
                ->references('id')
                ->on('menu')
                ->restrictOnDelete();
        });

        Schema::table('menu_role', function (Blueprint $table): void {
            $table->foreign('menu_id', 'menu_role_menu_id_foreign')
                ->references('id')
                ->on('menu')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('menu_role', function (Blueprint $table): void {
            $table->dropForeign('menu_role_menu_id_foreign');
        });

        Schema::table('menu', function (Blueprint $table): void {
            $table->dropForeign('menu_parent_id_foreign');
        });

        Schema::rename('menu', 'menus');

        Schema::table('menus', function (Blueprint $table): void {
            $table->renameColumn('name', 'title');
            $table->renameColumn('color', 'icon');
            $table->renameColumn('position', 'sort_order');
            $table->renameColumn('status', 'is_active');
            $table->foreign('parent_id', 'menus_parent_id_foreign')
                ->references('id')
                ->on('menus')
                ->restrictOnDelete();
        });

        DB::table('menus')->whereNull('sort_order')->update(['sort_order' => 0]);

        Schema::table('menus', function (Blueprint $table): void {
            $table->unsignedSmallInteger('sort_order')->default(0)->nullable(false)->change();
        });

        Schema::table('menu_role', function (Blueprint $table): void {
            $table->foreign('menu_id', 'menu_role_menu_id_foreign')
                ->references('id')
                ->on('menus')
                ->cascadeOnDelete();
        });

        Schema::table('roles', function (Blueprint $table): void {
            $table->dropColumn('guard_name');
        });

        foreach (DB::table('roles')->whereNull('slug')->orderBy('id')->get(['id', 'name']) as $role) {
            $baseSlug = Str::slug($role->name) ?: "role-{$role->id}";
            $slug = $baseSlug;
            $suffix = 1;

            while (DB::table('roles')->where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$role->id}-{$suffix}";
                $suffix++;
            }

            DB::table('roles')->where('id', $role->id)->update(['slug' => $slug]);
        }

        Schema::table('roles', function (Blueprint $table): void {
            $table->string('slug', 80)->nullable(false)->change();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->renameColumn('status', 'is_active');
        });
    }
};
