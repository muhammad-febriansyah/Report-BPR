<?php

namespace App\Models;

use Database\Factories\RoleFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    /** @use HasFactory<RoleFactory> */
    use HasFactory;

    /** @var list<string> */
    protected $fillable = ['name', 'slug', 'description', 'guard_name'];

    /**
     * Scope roles that grant administrator access, including imported legacy role names.
     */
    public function scopeAdministrator(Builder $query): Builder
    {
        return $query->where(function (Builder $query): void {
            $query->whereIn('slug', ['admin', 'administrator'])
                ->orWhereRaw('LOWER(name) IN (?, ?)', ['admin', 'administrator']);
        });
    }

    /**
     * Users assigned this role.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_roles');
    }

    /**
     * Menu entries visible to this role.
     */
    public function menus(): BelongsToMany
    {
        return $this->belongsToMany(Menu::class, 'menu_role');
    }
}
