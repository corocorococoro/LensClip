<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Observation extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'status',
        'original_path',
        'cropped_path',
        'thumb_path',
        'crop_bbox',
        'vision_objects',
        'ai_json',
        'title',
        'summary',
        'kid_friendly',
        'confidence',
        'error_message',
        'gemini_model',
        'latitude',
        'longitude',
        'category',
    ];

    protected $casts = [
        'crop_bbox' => 'array',
        'vision_objects' => 'array',
        'ai_json' => 'array',
        'confidence' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    protected $appends = [
        'original_url',
        'cropped_url',
        'thumb_url',
        'fun_facts',
        'safety_notes',
        'questions',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'observation_tag');
    }

    // Accessors for image URLs.
    // Paths prefixed with "local:" are stored on local disk (pending GCS upload by the job).
    // In that case we serve the thumbnail via a dedicated route instead of a GCS URL.

    public function getOriginalUrlAttribute(): ?string
    {
        if (! $this->original_path) {
            return null;
        }

        if (str_starts_with($this->original_path, 'local:')) {
            return null; // Not yet on GCS; not needed until analysis completes
        }

        return Storage::url($this->original_path);
    }

    public function getCroppedUrlAttribute(): ?string
    {
        return $this->cropped_path ? Storage::url($this->cropped_path) : null;
    }

    public function getThumbUrlAttribute(): ?string
    {
        if (! $this->thumb_path) {
            return null;
        }

        if (str_starts_with($this->thumb_path, 'local:')) {
            return route('observations.thumb', $this->id);
        }

        return Storage::url($this->thumb_path);
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeSearch($query, $keyword)
    {
        return $query->where('title', 'like', '%'.$keyword.'%');
    }

    public function scopeWithTag($query, $tagName)
    {
        return $query->whereHas('tags', function ($q) use ($tagName) {
            $q->where('name', $tagName);
        });
    }

    public function scopeReady($query)
    {
        return $query->where('status', 'ready');
    }

    public function scopeProcessing($query)
    {
        return $query->where('status', 'processing');
    }

    // AI JSON helpers
    public function getFunFactsAttribute()
    {
        return $this->ai_json['fun_facts'] ?? [];
    }

    public function getSafetyNotesAttribute()
    {
        return $this->ai_json['safety_notes'] ?? [];
    }

    public function getQuestionsAttribute()
    {
        return $this->ai_json['questions'] ?? [];
    }

    // Scopes (category)
    public function scopeForCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
