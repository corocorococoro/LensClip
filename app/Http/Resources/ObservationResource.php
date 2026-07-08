<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ObservationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'title' => $this->title,
            'summary' => $this->summary,
            'kid_friendly' => $this->kid_friendly,
            'confidence' => $this->confidence,
            'category' => $this->category,
            'tags' => $this->tags->pluck('name'),
            'fun_facts' => $this->fun_facts,
            'safety_notes' => $this->safety_notes,
            'questions' => $this->questions,
            'original_url' => $this->original_url,
            'cropped_url' => $this->cropped_url,
            'thumb_url' => $this->thumb_url,
            'error_message' => $this->error_message,
            'created_at' => $this->created_at,
        ];
    }
}
