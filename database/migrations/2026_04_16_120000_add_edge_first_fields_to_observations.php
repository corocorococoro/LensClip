<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->boolean('media_uploaded')->default(true)->after('thumb_path');
            $table->timestamp('media_uploaded_at')->nullable()->after('media_uploaded');
            $table->string('client_ref', 64)->nullable()->after('media_uploaded_at');
            $table->index(['user_id', 'client_ref']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'client_ref']);
            $table->dropColumn(['media_uploaded', 'media_uploaded_at', 'client_ref']);
        });
    }
};
