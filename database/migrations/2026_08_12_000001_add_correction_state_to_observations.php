<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->string('processing_type', 20)->default('identify')->after('status');
            $table->string('correction_name')->nullable()->after('title');
            $table->uuid('processing_token')->nullable()->after('correction_name');
        });
    }

    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropColumn(['processing_type', 'correction_name', 'processing_token']);
        });
    }
};
