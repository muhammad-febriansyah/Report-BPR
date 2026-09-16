<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('profile can update avatar without changing password', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $originalPassword = $user->password;

    $response = $this
        ->actingAs($user)
        ->post(route('profile.update'), [
            '_method' => 'PATCH',
            'name' => $user->name,
            'email' => $user->email,
            'current_password' => null,
            'password' => null,
            'password_confirmation' => null,
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
    $user->refresh();

    expect($user->password)->toBe($originalPassword)
        ->and($user->avatar)->not->toBeNull();
    Storage::disk('public')->assertExists($user->avatar);
});

test('profile can update password and avatar without changing access fields', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $role = Role::factory()->create();
    $user->roles()->attach($role);

    $response = $this
        ->actingAs($user)
        ->post(route('profile.update'), [
            '_method' => 'PATCH',
            'name' => 'Updated Profile',
            'email' => $user->email,
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
            'status' => false,
        ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
    $user->refresh();

    expect($user->name)->toBe('Updated Profile')
        ->and(Hash::check('new-password', $user->password))->toBeTrue()
        ->and($user->status)->toBeTrue()
        ->and($user->avatar)->not->toBeNull();
    Storage::disk('public')->assertExists($user->avatar);
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
