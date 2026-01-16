<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'name',
        'cover_observation_id',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function observations()
    {
        return $this->belongsToMany(Observation::class, 'collection_observation')
            ->withPivot('position')
            ->orderByPivot('position');
    }

    public function coverObservation()
    {
        return $this->belongsTo(Observation::class, 'cover_observation_id');
    }

    // Accessors
    public function getCoverUrlAttribute()
    {
        if ($this->coverObservation) {
            return $this->coverObservation->thumb_url;
        }
        // Use first observation as fallback
        $first = $this->observations()->first();
        return $first ? $first->thumb_url : null;
    }

    // Scopes
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
