<?php

use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

function makeUserManagementAdministrator(): User
{
    $administratorRole = Role::query()->create([
        'name' => 'Administrator',
        'slug' => 'administrator',
    ]);
    $administrator = User::factory()->create();
    $administrator->roles()->attach($administratorRole);

    return $administrator;
}

test('only administrators can open user management', function () {
    $this->actingAs(User::factory()->create())
        ->get(route('admin.users.index'))
        ->assertForbidden();

    $this->actingAs(makeUserManagementAdministrator())
        ->get(route('admin.users.index'))
        ->assertOk();
});

test('administrator can create a user and assign roles', function () {
    $administrator = makeUserManagementAdministrator();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);

    $response = $this->actingAs($administrator)->post(route('admin.users.store'), [
        'name' => 'Dewi Reporter',
        'email' => 'dewi@example.test',
        'password' => 'a-secure-password-123',
        'password_confirmation' => 'a-secure-password-123',
        'role_ids' => [$reporterRole->id],
        'status' => true,
    ]);

    $response->assertRedirect(route('admin.users.index'));

    $user = User::query()->where('email', 'dewi@example.test')->firstOrFail();
    expect(Hash::check('a-secure-password-123', $user->password))->toBeTrue()
        ->and($user->hasRole('reporter'))->toBeTrue()
        ->and($user->status)->toBeTrue();
});

test('user list uses a bounded cursor page and prefix search', function () {
    $administrator = makeUserManagementAdministrator();
    User::factory()->count(30)->create();
    User::factory()->create(['name' => 'Nadia Target', 'email' => 'nadia.target@example.test']);

    $this->actingAs($administrator)
        ->get(route('admin.users.index', ['search' => 'Nadia']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->has('users.data', 1)
            ->where('users.data.0.name', 'Nadia Target')
            ->where('filters.search', 'Nadia'));

    $this->actingAs($administrator)
        ->get(route('admin.users.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 25)
            ->has('users.next_page_url'));
});

test('administrator cannot delete the last active administrator', function () {
    $administrator = makeUserManagementAdministrator();

    $this->actingAs($administrator)
        ->delete(route('admin.users.destroy', $administrator))
        ->assertSessionHasErrors();

    expect($administrator->fresh())->not->toBeNull();
});

test('legacy export columns can be imported into the access tables', function () {
    $timestamp = now();
    $roleId = DB::table('roles')->insertGetId([
        'name' => 'admin',
        'guard_name' => 'web',
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
    ]);
    $userId = DB::table('users')->insertGetId([
        'name' => 'Imported User',
        'email' => 'imported-user@example.test',
        'email_verified_at' => null,
        'password' => Hash::make('imported-password'),
        'remember_token' => null,
        'created_at' => $timestamp,
        'updated_at' => $timestamp,
        'status' => '1',
    ]);
    $menuId = DB::table('menu')->insertGetId([
        'name' => 'Dashboard S0',
        'url' => 'dashboard_so',
        'color' => null,
        'parent_id' => null,
        'position' => '1',
        'role_restricted' => true,
    ]);

    DB::table('menu_role')->insert([
        'menu_id' => $menuId,
        'role_id' => $roleId,
    ]);

    DB::table('user_roles')->insert([
        'user_id' => $userId,
        'role_id' => $roleId,
    ]);

    $user = User::query()->findOrFail($userId);
    $role = Role::query()->findOrFail($roleId);
    $menu = Menu::query()->findOrFail($menuId);

    expect($user->status)->toBeTrue()
        ->and($user->hasRole('administrator'))->toBeTrue()
        ->and($role->guard_name)->toBe('web')
        ->and($role->slug)->toBeNull()
        ->and($menu->name)->toBe('Dashboard S0')
        ->and($menu->status)->toBeTrue()
        ->and($menu->roles()->whereKey($roleId)->exists())->toBeTrue();
});
