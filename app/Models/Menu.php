<?php

namespace App\Models;

use Database\Factories\MenuFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Menu extends Model
{
    /** @use HasFactory<MenuFactory> */
    use HasFactory;

    protected $table = 'menu';

    /** @var list<string> */
    public const ICONS = [
        'LayoutDashboard',
        'FileText',
        'ChartColumn',
        'Users',
        'Landmark',
        'Wallet',
        'ShieldCheck',
        'UserRoundCog',
        'Settings',
        'PanelsTopLeft',
        'ChartNoAxesCombined',
        'Activity',
    ];

    /** @var list<string> */
    protected $fillable = [
        'parent_id',
        'name',
        'route_name',
        'url',
        'color',
        'position',
        'status',
        'role_restricted',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'status' => 'boolean',
            'role_restricted' => 'boolean',
        ];
    }

    /**
     * Get the parent entry for a nested menu.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Get the nested entries for this menu.
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }

    /**
     * Roles allowed to see this menu entry.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'menu_role');
    }

    public function page(): HasOne
    {
        return $this->hasOne(MenuPage::class);
    }
}
