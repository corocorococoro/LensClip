<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The user_id + name index already enforces uniqueness within each owner's tags.
        if (Schema::hasIndex('tags', 'tags_name_unique')) {
            Schema::table('tags', fn (Blueprint $table) => $table->dropUnique('tags_name_unique'));
        }
    }

    public function down(): void
    {
        if (DB::table('tags')->select('name')->groupBy('name')->havingRaw('COUNT(*) > 1')->exists()) {
            throw new RuntimeException('Cannot restore global tag uniqueness while different users share tag names. No tags were removed.');
        }

        Schema::table('tags', fn (Blueprint $table) => $table->unique('name'));
    }
};
