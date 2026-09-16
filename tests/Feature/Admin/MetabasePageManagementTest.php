<?php

use App\Models\Menu;
use App\Models\MenuPage;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function makeMetabasePageAdministrator(): User
{
    $role = Role::query()->create([
        'name' => 'Administrator',
        'slug' => 'administrator',
    ]);
    $user = User::factory()->create();
    $user->roles()->attach($role);

    return $user;
}

function makeMetabasePageTree(): array
{
    $metabase = Menu::factory()->create([
        'name' => 'Metabase',
        'parent_id' => null,
        'position' => 0,
    ]);
    $osm = Menu::factory()->create([
        'name' => 'OSM',
        'parent_id' => $metabase->id,
        'position' => 0,
    ]);
    $outside = Menu::factory()->create([
        'name' => 'ERP',
        'parent_id' => null,
        'position' => 1,
    ]);

    return [$metabase, $osm, $outside];
}

test('administrator can create an iframe page below a dynamic Metabase parent', function () {
    $administrator = makeMetabasePageAdministrator();
    [, $osm] = makeMetabasePageTree();

    $response = $this->actingAs($administrator)->post(route('admin.metabase-pages.store'), [
        'title' => 'Report Absensi Hari Ini',
        'master_menu_id' => 2,
        'iframe_url' => 'https://metabase.simgroup.co.id/public/dashboard/attendance',
        'iframe_title' => 'Dashboard absensi',
        'iframe_description' => 'Ringkasan absensi karyawan hari ini.',
        'status' => true,
    ]);

    $response->assertRedirect(route('admin.metabase-pages.index'));

    $menu = Menu::query()->where('name', 'Report Absensi Hari Ini')->firstOrFail();
    expect($menu->parent_id)->toBe($osm->id)
        ->and(MenuPage::query()->where('menu_id', $menu->id)->exists())->toBeTrue();

    $this->actingAs($administrator)
        ->get(route('admin.metabase-pages.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/metabase-pages/index')
            ->where('parents', fn ($parents): bool => $parents->contains('path', 'Metabase / OSM'))
            ->where('pages.data.0.title', 'Report Absensi Hari Ini'));
});

test('page builder rejects unknown master menus and unapproved iframe hosts', function () {
    $administrator = makeMetabasePageAdministrator();
    makeMetabasePageTree();

    $this->actingAs($administrator)
        ->post(route('admin.metabase-pages.store'), [
            'title' => 'Unsafe report',
            'master_menu_id' => 999,
            'iframe_url' => 'https://example.com/dashboard',
            'status' => true,
        ])
        ->assertSessionHasErrors(['master_menu_id', 'iframe_url']);

    expect(MenuPage::query()->count())->toBe(0);
});

test('page builder creates a missing master menu category automatically', function () {
    $administrator = makeMetabasePageAdministrator();
    [$metabase] = makeMetabasePageTree();

    $this->actingAs($administrator)
        ->post(route('admin.metabase-pages.store'), [
            'title' => 'Report Absensi',
            'master_menu_id' => 10,
            'iframe_url' => 'https://metabase.simgroup.co.id/public/dashboard/absensi',
            'status' => true,
        ])
        ->assertRedirect(route('admin.metabase-pages.index'));

    $category = Menu::query()
        ->where('parent_id', $metabase->id)
        ->where('name', 'Absensi')
        ->firstOrFail();
    expect(MenuPage::query()->whereHas('menu', fn ($query) => $query->where('parent_id', $category->id))->exists())
        ->toBeTrue();
});

test('menu destination exposes the configured iframe page', function () {
    $administrator = makeMetabasePageAdministrator();
    [, $osm] = makeMetabasePageTree();
    $menu = Menu::factory()->create([
        'name' => 'Report KPI',
        'parent_id' => $osm->id,
        'route_name' => null,
        'url' => null,
    ]);
    $menu->page()->create([
        'page_type' => 'iframe',
        'iframe_url' => 'https://metabase.simgroup.co.id/public/dashboard/kpi',
        'iframe_title' => 'Dashboard KPI',
        'iframe_description' => 'Ringkasan KPI.',
        'status' => true,
    ]);

    $this->actingAs($administrator)
        ->get(route('menu-destination.show', $menu))
        ->assertInertia(fn (Assert $page) => $page
            ->component('menu-destinations/show')
            ->where('menu.page_type', 'iframe')
            ->where('menu.iframe_url', 'https://metabase.simgroup.co.id/public/dashboard/kpi')
            ->where('menu.iframe_title', 'Dashboard KPI'));
});
