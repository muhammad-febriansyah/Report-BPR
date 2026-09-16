<?php

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function createTestNotification(User $user, array $data = []): DatabaseNotification
{
    return DatabaseNotification::query()->create([
        'id' => (string) Str::uuid(),
        'type' => 'system',
        'notifiable_type' => User::class,
        'notifiable_id' => $user->id,
        'data' => $data + [
            'title' => 'Notifikasi sistem',
            'message' => 'Aktivitas terbaru tersedia.',
            'type' => 'info',
        ],
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

it('shares notifications for the authenticated user', function () {
    $user = User::factory()->create();
    createTestNotification($user, [
        'title' => 'Import selesai',
        'message' => 'Data master area berhasil diimpor.',
        'type' => 'success',
        'href' => '/admin/master-area',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('notifications.unread_count', 1)
            ->where('notifications.items.0.title', 'Import selesai')
            ->where('notifications.items.0.href', '/admin/master-area')
            ->where('notifications.items.0.read_at', null));
});

it('marks only the authenticated user notification as read', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $notification = createTestNotification($user);
    $otherNotification = createTestNotification($otherUser);

    $this->actingAs($user)
        ->patch(route('notifications.read', $notification->id))
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull();

    $this->actingAs($user)
        ->patch(route('notifications.read', $otherNotification->id))
        ->assertNotFound();
});
