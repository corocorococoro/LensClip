<?php

namespace Tests\Feature;

use App\Models\Observation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorrectedObservationCategoryMilestoneMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_aligns_existing_first_category_milestone_with_observation_category(): void
    {
        $observation = Observation::factory()->create([
            'category' => 'insect',
            'milestones' => [
                ['type' => 'count', 'value' => 10],
                ['type' => 'first_category', 'category' => 'vehicle'],
            ],
        ]);

        $migration = require database_path('migrations/2026_08_13_000001_fix_corrected_observation_category_milestones.php');
        $migration->up();

        $this->assertSame([
            ['type' => 'count', 'value' => 10],
            ['type' => 'first_category', 'category' => 'insect'],
        ], $observation->fresh()->milestones);
    }
}
