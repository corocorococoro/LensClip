<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('auth_identities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32); // "google"
            $table->string('issuer', 255); // iss claim
            $table->string('subject', 255); // sub claim
            $table->string('email_at_link', 255)->nullable(); // email at time of linking
            $table->timestamps();

            // OIDC standard: (iss, sub) is unique per user
            $table->unique(['provider', 'issuer', 'subject']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auth_identities');
    }
};
