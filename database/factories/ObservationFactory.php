<?php

namespace Database\Factories;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ObservationFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Observation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => 'ready',
            'original_path' => 'observations/test_original.webp',
            'thumb_path' => 'observations/test_thumb.webp',
            'title' => $this->faker->words(3, true),
            'summary' => $this->faker->sentence(),
            'confidence' => 0.95,
        ];
    }
}
