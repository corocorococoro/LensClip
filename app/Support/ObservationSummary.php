<?php

namespace App\Support;

use App\Models\Observation;

final class ObservationSummary
{
    public const COLUMNS = [
        'id', 'user_id', 'title', 'thumb_path', 'status', 'processing_type',
        'category', 'latitude', 'longitude', 'milestones', 'created_at',
    ];

    public static function from(Observation $observation): array
    {
        return [
            'id' => $observation->id,
            'title' => $observation->title,
            'thumb_url' => $observation->thumb_url,
            'status' => $observation->status,
            'processing_type' => $observation->processing_type,
            'category' => $observation->category,
            'latitude' => $observation->latitude,
            'longitude' => $observation->longitude,
            'milestones' => $observation->milestones,
            'created_at' => $observation->created_at,
        ];
    }
}
