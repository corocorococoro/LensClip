<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('observations')
            ->whereNotNull('category')
            ->whereNotNull('milestones')
            ->orderBy('id')
            ->chunkById(100, function ($observations): void {
                foreach ($observations as $observation) {
                    $milestones = json_decode($observation->milestones, true);

                    if (! is_array($milestones)) {
                        continue;
                    }

                    $changed = false;
                    foreach ($milestones as &$milestone) {
                        if (($milestone['type'] ?? null) !== 'first_category'
                            || ($milestone['category'] ?? null) === $observation->category) {
                            continue;
                        }

                        $milestone['category'] = $observation->category;
                        $changed = true;
                    }
                    unset($milestone);

                    if ($changed) {
                        DB::table('observations')
                            ->where('id', $observation->id)
                            ->update(['milestones' => json_encode($milestones, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
                    }
                }
            }, 'id');
    }

    public function down(): void
    {
        // The previous category cannot be reconstructed safely.
    }
};
