<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * コレクション機能を削除
     */
    public function up(): void
    {
        Schema::dropIfExists('collection_observation');
        Schema::dropIfExists('collections');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore collections table
        Schema::create('collections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->uuid('cover_observation_id')->nullable();
            $table->timestamps();

            $table->foreign('cover_observation_id')->references('id')->on('observations')->nullOnDelete();
            $table->index('user_id');
        });

        // Restore collection_observation pivot table
        Schema::create('collection_observation', function (Blueprint $table) {
            $table->uuid('collection_id');
            $table->uuid('observation_id');
            $table->integer('position')->nullable();
            $table->primary(['collection_id', 'observation_id']);
            $table->foreign('collection_id')->references('id')->on('collections')->cascadeOnDelete();
            $table->foreign('observation_id')->references('id')->on('observations')->cascadeOnDelete();
        });
    }
};
