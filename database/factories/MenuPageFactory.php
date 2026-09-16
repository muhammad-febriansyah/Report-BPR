<?php

namespace Database\Factories;

use App\Models\Menu;
use App\Models\MenuPage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MenuPage>
 */
class MenuPageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'menu_id' => Menu::factory(),
            'page_type' => 'iframe',
            'iframe_url' => 'https://metabase.simgroup.co.id/public/dashboard/example',
            'iframe_title' => fake()->sentence(3),
            'iframe_description' => fake()->sentence(),
            'status' => true,
        ];
    }
}
