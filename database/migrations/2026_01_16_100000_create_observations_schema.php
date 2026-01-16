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
        // Drop old tables
        Schema::dropIfExists('scrap_tag');
        Schema::dropIfExists('scraps');

        // Create observations table
        Schema::create('observations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['processing', 'ready', 'failed'])->default('processing');
            $table->string('original_path');
            $table->string('cropped_path')->nullable();
            $table->string('thumb_path');
            $table->json('crop_bbox')->nullable();
            $table->json('vision_objects')->nullable();
            $table->json('ai_json')->nullable();
            $table->string('title')->nullable();
            $table->text('summary')->nullable();
            $table->text('kid_friendly')->nullable();
            $table->float('confidence')->nullable();
            $table->string('error_message')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'status']);
        });

        // Update tags table - add user_id for user-scoped tags
        Schema::table('tags', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
        });

        // Add unique constraint for user_id + name
        Schema::table('tags', function (Blueprint $table) {
            $table->unique(['user_id', 'name']);
        });

        // Create observation_tag pivot table
        Schema::create('observation_tag', function (Blueprint $table) {
            $table->uuid('observation_id');
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['observation_id', 'tag_id']);
            $table->foreign('observation_id')->references('id')->on('observations')->cascadeOnDelete();
        });

        // Create collections table
        Schema::create('collections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->uuid('cover_observation_id')->nullable();
            $table->timestamps();

            $table->foreign('cover_observation_id')->references('id')->on('observations')->nullOnDelete();
            $table->index('user_id');
        });

        // Create collection_observation pivot table
        Schema::create('collection_observation', function (Blueprint $table) {
            $table->uuid('collection_id');
            $table->uuid('observation_id');
            $table->integer('position')->nullable();
            $table->primary(['collection_id', 'observation_id']);
            $table->foreign('collection_id')->references('id')->on('collections')->cascadeOnDelete();
            $table->foreign('observation_id')->references('id')->on('observations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_observation');
        Schema::dropIfExists('collections');
        Schema::dropIfExists('observation_tag');

        Schema::table('tags', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'name']);
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::dropIfExists('observations');

        // Restore old tables (simplified)
        Schema::create('scraps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('image_path');
            $table->string('thumbnail_path')->nullable();
            $table->string('primary_name')->nullable();
            $table->string('description')->nullable();
            $table->integer('category_id')->nullable();
            $table->json('analyzed_raw_json')->nullable();
            $table->boolean('is_safe')->default(false);
            $table->float('confidence_score')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('scrap_tag', function (Blueprint $table) {
            $table->foreignId('scrap_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->primary(['scrap_id', 'tag_id']);
        });
    }
};
