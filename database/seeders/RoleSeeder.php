<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach ([
            ['name' => 'Administrator', 'slug' => 'administrator'],
            ['name' => 'Reporter', 'slug' => 'reporter'],
            ['name' => 'Account Officer', 'slug' => 'ap'],
        ] as $role) {
            $existingRole = $role['slug'] === 'administrator'
                ? Role::query()->administrator()->first()
                : Role::query()
                    ->where('slug', $role['slug'])
                    ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($role['name'])])
                    ->first();

            if ($existingRole !== null) {
                $existingRole->fill(['slug' => $role['slug']])->save();

                continue;
            }

            Role::query()->create($role);
        }
    }
}
