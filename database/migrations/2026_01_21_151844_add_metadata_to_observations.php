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
        Schema::table('observations', function (Blueprint $table) {
            // AI model used for analysis
            $table->string('gemini_model')->nullable()->after('ai_json');

            // GPS coordinates from EXIF (for future map feature)
            $table->decimal('latitude', 10, 7)->nullable()->after('gemini_model');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');

            // Index for geospatial queries
            $table->index(['user_id', 'latitude', 'longitude']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'latitude', 'longitude']);
            $table->dropColumn(['gemini_model', 'latitude', 'longitude']);
        });
    }
};
