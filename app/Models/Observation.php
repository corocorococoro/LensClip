<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

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
        'category',
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

    // Accessors for image URLs
    public function getOriginalUrlAttribute()
    {
        return $this->original_path ? '/storage/' . $this->original_path : null;
    }

    public function getCroppedUrlAttribute()
    {
        return $this->cropped_path ? '/storage/' . $this->cropped_path : null;
    }

    public function getThumbUrlAttribute()
    {
        return $this->thumb_path ? '/storage/' . $this->thumb_path : null;
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeSearch($query, $keyword)
    {
        return $query->where('title', 'like', '%' . $keyword . '%');
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

    public function getCategoryAttribute()
    {
        return $this->ai_json['category'] ?? 'other';
    }
}
