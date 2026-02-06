<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->string('category', 50)->default('other')->after('confidence');
            $table->index(['user_id', 'category']);
        });

        // ai_json.category から既存レコードをバックフィル
        $allowed = array_column(config('categories'), 'id');

        DB::table('observations')
            ->whereNotNull('ai_json')
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($allowed) {
                foreach ($rows as $row) {
                    $aiJson = json_decode($row->ai_json, true);
                    $category = $aiJson['category'] ?? 'other';

                    if (!in_array($category, $allowed)) {
                        $category = 'other';
                    }

                    DB::table('observations')
                        ->where('id', $row->id)
                        ->update(['category' => $category]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'category']);
            $table->dropColumn('category');
        });
    }
};
