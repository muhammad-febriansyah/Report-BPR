<?php

namespace App\Policies;

use App\Models\Menu;
use App\Models\User;

class MenuPolicy
{
    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Menu $menu): bool
    {
        if (! $menu->status) {
            return false;
        }

        if (! $menu->role_restricted) {
            return true;
        }

        $menu->loadMissing('roles:id');
        $allowedRoleIds = $menu->roles
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return $allowedRoleIds !== [] && $user->roles()->whereKey($allowedRoleIds)->exists();
    }
}
