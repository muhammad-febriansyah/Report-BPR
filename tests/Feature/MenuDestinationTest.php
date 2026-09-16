<?php

use App\Models\Menu;
use App\Models\Role;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('a leaf menu with an unregistered route opens its dynamic destination', function () {
    $user = User::factory()->create();
    $erp = Menu::factory()->create([
        'name' => 'ERP',
        'url' => null,
    ]);
    $outstandingInvoice = Menu::factory()->create([
        'name' => 'OUTSTANDING INVOICE',
        'parent_id' => $erp->id,
        'route_name' => 'erp.outstanding',
        'url' => null,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('menuItems.0.children.0.href', route('menu-destination.show', $outstandingInvoice, absolute: false)));

    $this->actingAs($user)
        ->get(route('menu-destination.show', $outstandingInvoice))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('menu-destinations/show')
            ->where('menu.title', 'OUTSTANDING INVOICE')
            ->where('menu.route_name', 'erp.outstanding')
            ->where('breadcrumbs.0.title', 'ERP')
            ->where('breadcrumbs.1.title', 'OUTSTANDING INVOICE'));
});

test('a user cannot open a menu destination restricted to another role', function () {
    $user = User::factory()->create();
    $reporterRole = Role::query()->create([
        'name' => 'Reporter',
        'slug' => 'reporter',
    ]);
    $menu = Menu::factory()->create([
        'url' => null,
        'role_restricted' => true,
    ]);
    $menu->roles()->attach($reporterRole);

    $this->actingAs($user)
        ->get(route('menu-destination.show', $menu))
        ->assertNotFound();
});

test('an inactive menu destination cannot be opened', function () {
    $user = User::factory()->create();
    $menu = Menu::factory()->create([
        'status' => false,
        'url' => null,
    ]);

    $this->actingAs($user)
        ->get(route('menu-destination.show', $menu))
        ->assertNotFound();
});
