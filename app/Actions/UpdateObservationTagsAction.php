<?php

namespace App\Actions;

use App\Models\Observation;
use App\Models\Tag;

class UpdateObservationTagsAction
{
    public function execute(Observation $observation, array $tagNames): void
    {
        $tagIds = [];
        foreach ($tagNames as $name) {
            $name = trim($name);
            if (empty($name)) {
                continue;
            }

            $tag = Tag::firstOrCreate(
                ['user_id' => $observation->user_id, 'name' => $name],
                ['user_id' => $observation->user_id, 'name' => $name]
            );
            $tagIds[] = $tag->id;
        }

        $observation->tags()->sync($tagIds);
    }
}
