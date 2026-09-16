<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\RedirectResponse;

class NotificationController extends Controller
{
    /**
     * Mark a notification as read for the authenticated user.
     */
    public function markAsRead(Request $request, string $notification): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null, 401);

        $user->notifications()
            ->whereKey($notification)
            ->firstOrFail()
            ->markAsRead();

        return back();
    }
}
