<?php

use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function makeMenuManagementAdministrator(): User
{
    $administratorRole = Role::query()->create([
        'name' => 'Administrator',
        'slug' => 'administrator',
    ]);
    $administrator = User::factory()->create();
    $administrator->roles()->attach($administratorRole);

    return $administrator;
}

test('only administrators can manage menus', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('admin.menus.index'))
        ->assertForbidden();

    $this->actingAs(makeMenuManagementAdministrator())
        ->get(route('admin.menus.index'))
        ->assertOk();
});

test('sidebar exposes menu builder and user management only to administrators', function () {
    $administrator = makeMenuManagementAdministrator();

    $this->actingAs($administrator)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canAccessAdministration', true));

    $this->actingAs(User::factory()->create())
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canAccessAdministration', false));
});

test('sidebar treats imported administrator role aliases as the same access', function () {
    $legacyAdminRole = Role::query()->create([
        'name' => 'admin',
        'slug' => null,
    ]);
    $administratorRole = Role::query()->create([
        'name' => 'Administrator',
        'slug' => 'administrator',
    ]);
    $administrator = User::factory()->create();
    $administrator->roles()->attach($administratorRole);
    $menu = Menu::factory()->create([
        'name' => 'Menu Builder Legacy Access',
        'role_restricted' => true,
    ]);
    $menu->roles()->attach($legacyAdminRole);

    $this->actingAs($administrator)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems', fn ($items): bool => $items->contains(
                fn (array $item): bool => $item['title'] === $menu->name,
            )));
});

test('administrator can create a menu and scope it to a role', function () {
    $administrator = makeMenuManagementAdministrator();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);

    $response = $this->actingAs($administrator)->post(route('admin.menus.store'), [
        'title' => 'Laporan Kredit',
        'parent_id' => null,
        'route_name' => 'dashboard',
        'url' => null,
        'icon' => 'FileText',
        'sort_order' => 5,
        'status' => true,
        'role_ids' => [$reporterRole->id],
    ]);

    $response->assertRedirect(route('admin.menus.index'));

    $menu = Menu::query()->where('name', 'Laporan Kredit')->firstOrFail();
    expect($menu->role_restricted)
        ->toBeTrue()
        ->and($menu->roles()->whereKey($reporterRole->id)->exists())->toBeTrue();
});

test('menu builder preserves restricted menus with no role grants and can explicitly make them public', function () {
    $administrator = makeMenuManagementAdministrator();
    $menu = Menu::factory()->create([
        'name' => 'Menu Terbatas Kosong',
        'url' => null,
        'route_name' => 'dashboard',
        'role_restricted' => true,
    ]);

    $this->actingAs($administrator)
        ->get(route('admin.menus.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menus.0.role_restricted', true));

    $menuData = [
        'title' => $menu->name,
        'parent_id' => null,
        'route_name' => 'dashboard',
        'url' => null,
        'icon' => 'FileText',
        'sort_order' => 10,
        'status' => true,
        'role_ids' => [],
        'role_restricted' => true,
    ];

    $this->actingAs($administrator)
        ->put(route('admin.menus.update', $menu), $menuData)
        ->assertRedirect(route('admin.menus.index'));

    $this->assertDatabaseHas('menu', [
        'id' => $menu->id,
        'role_restricted' => true,
    ]);

    $this->actingAs($administrator)
        ->put(route('admin.menus.update', $menu), [
            ...$menuData,
            'role_restricted' => false,
        ])
        ->assertRedirect(route('admin.menus.index'));

    $this->assertDatabaseHas('menu', [
        'id' => $menu->id,
        'role_restricted' => false,
    ]);
});

test('menu builder exposes every hierarchy level even when filters are selected', function () {
    $administrator = makeMenuManagementAdministrator();
    $root = Menu::factory()->create(['name' => 'Metabase', 'parent_id' => null]);
    $category = Menu::factory()->create(['name' => 'OSM', 'parent_id' => $root->id]);
    Menu::factory()->create(['name' => 'Laporan Absensi', 'parent_id' => $category->id]);
    Menu::factory()->create(['name' => 'Laporan KPI', 'parent_id' => $root->id]);

    $this->actingAs($administrator)
        ->get(route('admin.menus.index', ['search' => 'no-match', 'status' => 'inactive']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/menus/index')
            ->has('menus', 4)
            ->where('menus', fn ($records): bool => $records->firstWhere('title', 'Metabase')['children_count'] === 2
                && $records->firstWhere('title', 'OSM')['parent']['title'] === 'Metabase'
            ));
});

test('menu builder rejects external destinations and deleting groups with children', function () {
    $administrator = makeMenuManagementAdministrator();
    $parent = Menu::factory()->create(['parent_id' => null]);
    Menu::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs($administrator)->post(route('admin.menus.store'), [
        'title' => 'Unsafe destination',
        'parent_id' => null,
        'route_name' => null,
        'url' => 'https://example.com',
        'icon' => 'FileText',
        'sort_order' => 5,
        'status' => true,
        'role_ids' => [],
    ])->assertSessionHasErrors('url');

    $this->actingAs($administrator)
        ->delete(route('admin.menus.destroy', $parent))
        ->assertSessionHasErrors('menu');

    expect($parent->fresh())->not->toBeNull();
});

test('administrator can create a menu below any hierarchy level', function () {
    $administrator = makeMenuManagementAdministrator();
    $metabase = Menu::factory()->create(['name' => 'Metabase', 'parent_id' => null]);
    $osm = Menu::factory()->create(['name' => 'OSM', 'parent_id' => $metabase->id]);

    $this->actingAs($administrator)
        ->post(route('admin.menus.store'), [
            'title' => 'Report Absensi',
            'parent_id' => $osm->id,
            'route_name' => null,
            'url' => null,
            'icon' => null,
            'sort_order' => 0,
            'status' => true,
            'role_ids' => [],
        ])
        ->assertRedirect(route('admin.menus.index'));

    $report = Menu::query()->where('name', 'Report Absensi')->firstOrFail();
    expect($report->parent_id)->toBe($osm->id);
});

test('administrator can reorder menus and move a report to another level', function () {
    $administrator = makeMenuManagementAdministrator();
    $metabase = Menu::factory()->create(['name' => 'Metabase', 'parent_id' => null]);
    $osm = Menu::factory()->create(['name' => 'OSM', 'parent_id' => $metabase->id]);
    $report = Menu::factory()->create(['name' => 'Report Absensi', 'parent_id' => $osm->id]);
    $kpi = Menu::factory()->create(['name' => 'KPI', 'parent_id' => null]);

    $this->actingAs($administrator)
        ->put(route('admin.menus.reorder'), [
            'items' => [
                ['id' => $kpi->id, 'parent_id' => null, 'position' => 0],
                ['id' => $metabase->id, 'parent_id' => null, 'position' => 1],
                ['id' => $report->id, 'parent_id' => $metabase->id, 'position' => 0],
                ['id' => $osm->id, 'parent_id' => $metabase->id, 'position' => 1],
            ],
        ])
        ->assertRedirect(route('admin.menus.index'));

    expect($kpi->fresh()->position)->toBe(0)
        ->and($metabase->fresh()->position)->toBe(1)
        ->and($report->fresh()->parent_id)->toBe($metabase->id)
        ->and($osm->fresh()->parent_id)->toBe($metabase->id)
        ->and($osm->fresh()->position)->toBe(1);
});

test('administrator cannot save a menu hierarchy that contains a cycle', function () {
    $administrator = makeMenuManagementAdministrator();
    $metabase = Menu::factory()->create(['parent_id' => null]);
    $osm = Menu::factory()->create(['parent_id' => $metabase->id]);

    $this->actingAs($administrator)
        ->put(route('admin.menus.reorder'), [
            'items' => [
                ['id' => $metabase->id, 'parent_id' => $osm->id, 'position' => 0],
                ['id' => $osm->id, 'parent_id' => $metabase->id, 'position' => 0],
            ],
        ])
        ->assertSessionHasErrors('items');

    expect($metabase->fresh()->parent_id)->toBeNull()
        ->and($osm->fresh()->parent_id)->toBe($metabase->id);
});

test('sidebar only exposes role restricted menu items to matching users', function () {
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $reporter = User::factory()->create();
    $reporter->roles()->attach($reporterRole);
    $menu = Menu::factory()->create([
        'name' => 'Laporan Khusus',
        'route_name' => 'dashboard',
        'url' => null,
        'role_restricted' => true,
    ]);
    $menu->roles()->attach($reporterRole);

    $this->actingAs($reporter)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems.0.title', 'Laporan Khusus'));
});

test('sidebar nests Metabase reports under their master menu category', function () {
    $administrator = makeMenuManagementAdministrator();
    $metabase = Menu::factory()->create([
        'name' => 'Metabase',
        'route_name' => null,
        'url' => null,
    ]);

    DB::table('menu')->insert([
        'id' => 2,
        'parent_id' => $metabase->id,
        'name' => 'Old category label',
        'route_name' => null,
        'url' => null,
        'color' => 'FileText',
        'position' => 0,
        'status' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $report = Menu::factory()->create([
        'parent_id' => 2,
        'name' => 'Akses Area Status Pegawai',
        'route_name' => 'metabase.osms.aksesareastatuspegawai',
        'url' => null,
    ]);
    $report->roles()->attach($administrator->roles()->firstOrFail());
    $reportDetail = Menu::factory()->create([
        'parent_id' => $report->id,
        'name' => 'Detail Report Absensi',
        'route_name' => null,
        'url' => null,
    ]);

    $this->actingAs($administrator)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems.0.title', 'Metabase')
            ->where('menuItems.0.children.0.title', 'OSM')
            ->where('menuItems.0.children.0.children.0.title', 'Akses Area Status Pegawai')
            ->where('menuItems.0.children.0.children.0.href', null)
            ->where('menuItems.0.children.0.children.0.children.0.title', 'Detail Report Absensi'));
});
