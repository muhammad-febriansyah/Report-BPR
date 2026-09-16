<?php

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;

test('successful logins are recorded with user and ip details', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $log = AuditLog::query()->where('event', 'login')->latest('id')->first();

    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBe($user->id)
        ->and($log->user_name)->toBe($user->name)
        ->and($log->description)->toBe('Login berhasil')
        ->and($log->ip_address)->toBe('127.0.0.1');
});

test('authenticated route activity is recorded', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('dashboard'));

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'GET',
        'description' => 'Membuka dashboard',
        'path' => '/dashboard',
    ]);
});

test('logouts are recorded with the signed-in user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('logout'));

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'logout',
        'description' => 'Logout',
    ]);
});

test('administrators can view the activity history page', function () {
    $user = User::factory()->create();
    $administrator = Role::factory()->create(['name' => 'Administrator', 'slug' => 'administrator']);
    $user->roles()->attach($administrator);

    $response = $this->actingAs($user)->get(route('admin.audit-logs.index'));

    $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/audit-logs/index'));
});
