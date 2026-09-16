<?php

use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function makeRoleAccessManagementAdmin(): User
{
    $role = Role::query()->create([
        'name' => 'Administrator',
        'slug' => 'administrator',
    ]);
    $administrator = User::factory()->create();
    $administrator->roles()->attach($role);

    return $administrator;
}

it('lets administrators manage dynamic role menu access without exposing denied menus', function () {
    $administrator = makeRoleAccessManagementAdmin();
    $administratorRole = $administrator->roles()->firstOrFail();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $viewerRole = Role::query()->create([
        'name' => 'Viewer',
        'slug' => 'viewer',
    ]);
    $reporter = User::factory()->create();
    $reporter->roles()->attach($reporterRole);
    $viewer = User::factory()->create();
    $viewer->roles()->attach($viewerRole);
    $menu = Menu::factory()->create(['name' => 'Report Dinamis']);

    $this->actingAs($administrator)
        ->get(route('admin.role-access.index', ['role' => $reporterRole->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/role-access/index')
            ->where('selectedRole.id', $reporterRole->id)
            ->where('menus.0.title', 'Report Dinamis')
            ->where('menus.0.has_access', true));

    $this->actingAs($administrator)
        ->put(route('admin.role-access.update', $reporterRole), [
            'menu_ids' => [],
        ])
        ->assertRedirect(route('admin.role-access.index', ['role' => $reporterRole->id]));

    $this->assertDatabaseHas('menu', [
        'id' => $menu->id,
        'role_restricted' => true,
    ]);
    $this->assertDatabaseHas('menu_role', [
        'menu_id' => $menu->id,
        'role_id' => $administratorRole->id,
    ]);
    $this->assertDatabaseHas('menu_role', [
        'menu_id' => $menu->id,
        'role_id' => $viewerRole->id,
    ]);
    $this->assertDatabaseMissing('menu_role', [
        'menu_id' => $menu->id,
        'role_id' => $reporterRole->id,
    ]);

    $this->actingAs($reporter)
        ->get(route('menu-destination.show', $menu))
        ->assertNotFound();

    $this->actingAs($reporter)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems', fn ($items): bool => $items->isEmpty()));

    $this->actingAs($viewer)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems.0.title', 'Report Dinamis'));

    $this->actingAs($viewer)
        ->get(route('menu-destination.show', $menu))
        ->assertOk();
});

it('builds role access paths from the current nested menu hierarchy', function () {
    $administrator = makeRoleAccessManagementAdmin();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $metabase = Menu::factory()->create([
        'name' => 'Metabase',
        'position' => 1,
    ]);
    $osm = Menu::factory()->create([
        'name' => 'OSM',
        'parent_id' => $metabase->id,
        'position' => 2,
    ]);
    $report = Menu::factory()->create([
        'name' => 'Report Absensi',
        'parent_id' => $osm->id,
        'position' => 3,
        'role_restricted' => true,
    ]);
    $report->roles()->attach($reporterRole);

    $this->actingAs($administrator)
        ->get(route('admin.role-access.index', ['role' => $reporterRole->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menus.0.title', 'Metabase')
            ->where('menus.1.path', 'Metabase / OSM')
            ->where('menus.2.path', 'Metabase / OSM / Report Absensi')
            ->where('menus.2.has_access', true));
});

it('keeps a restricted menu unavailable when its last role grant is removed', function () {
    $administrator = makeRoleAccessManagementAdmin();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $reporter = User::factory()->create();
    $reporter->roles()->attach($reporterRole);
    $menu = Menu::factory()->create([
        'name' => 'Menu Privat',
        'role_restricted' => true,
    ]);
    $menu->roles()->attach($reporterRole);

    $this->actingAs($administrator)
        ->put(route('admin.role-access.update', $reporterRole), [
            'menu_ids' => [],
        ])
        ->assertRedirect(route('admin.role-access.index', ['role' => $reporterRole->id]));

    $this->assertDatabaseHas('menu', [
        'id' => $menu->id,
        'role_restricted' => true,
    ]);
    $this->assertDatabaseMissing('menu_role', [
        'menu_id' => $menu->id,
        'role_id' => $reporterRole->id,
    ]);

    $this->actingAs($reporter)
        ->get(route('menu-destination.show', $menu))
        ->assertNotFound();
});

it('forbids non-administrators from managing role menu access', function () {
    $role = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.role-access.index'))
        ->assertForbidden();

    $this->actingAs($user)
        ->put(route('admin.role-access.update', $role), [
            'menu_ids' => [],
        ])
        ->assertForbidden();
});

it('rejects unknown menu ids without changing existing role access', function () {
    $administrator = makeRoleAccessManagementAdmin();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $menu = Menu::factory()->create([
        'name' => 'Menu Terbatas',
        'role_restricted' => true,
    ]);

    $this->actingAs($administrator)
        ->put(route('admin.role-access.update', $reporterRole), [
            'menu_ids' => [999999],
        ])
        ->assertSessionHasErrors('menu_ids.0');

    $this->assertDatabaseHas('menu', [
        'id' => $menu->id,
        'role_restricted' => true,
    ]);
    $this->assertDatabaseMissing('menu_role', [
        'menu_id' => $menu->id,
        'role_id' => $reporterRole->id,
    ]);
});
