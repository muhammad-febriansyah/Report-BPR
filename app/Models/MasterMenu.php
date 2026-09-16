<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MasterMenu extends Model
{
    protected $table = 'master_menu';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'name',
    ];
}
