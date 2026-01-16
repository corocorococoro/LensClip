<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Scrap extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'image_path',
        'thumbnail_path',
        'primary_name',
        'description',
        'category_id',
        'analyzed_raw_json',
        'is_safe',
        'confidence_score',
    ];

    protected $casts = [
        'is_safe' => 'boolean',
        'analyzed_raw_json' => 'array',
        'confidence_score' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class);
    }
}
