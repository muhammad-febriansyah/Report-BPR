<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MappingNetworkArea extends Model
{
    protected $table = 'mapping_network_area';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $guarded = [];
}
