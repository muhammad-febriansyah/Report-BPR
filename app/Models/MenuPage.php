<?php

namespace App\Models;

use Database\Factories\MenuPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MenuPage extends Model
{
    /** @use HasFactory<MenuPageFactory> */
    use HasFactory;

    protected $fillable = [
        'menu_id',
        'page_type',
        'iframe_url',
        'iframe_title',
        'iframe_description',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'boolean',
        ];
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(Menu::class);
    }
}
