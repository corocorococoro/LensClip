<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuthIdentity extends Model
{
    protected $fillable = [
        'user_id',
        'provider',
        'issuer',
        'subject',
        'email_at_link',
    ];

    /**
     * Get the user that owns this identity.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Find an identity by provider and OIDC claims.
     */
    public static function findByOidc(string $provider, string $issuer, string $subject): ?self
    {
        return static::where('provider', $provider)
            ->where('issuer', $issuer)
            ->where('subject', $subject)
            ->first();
    }
}
