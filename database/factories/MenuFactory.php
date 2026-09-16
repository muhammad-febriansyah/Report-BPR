<?php

namespace Database\Factories;

use App\Models\Menu;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Menu>
 */
class MenuFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'parent_id' => null,
            'name' => fake()->words(2, true),
            'route_name' => null,
            'url' => '/'.fake()->slug(),
            'color' => 'FileText',
            'position' => fake()->numberBetween(0, 100),
            'status' => true,
        ];
    }
}
