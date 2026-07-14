<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            // 利用者が確定した候補カードの添字。null は未確定(先頭候補の表示)を意味する
            $table->unsignedTinyInteger('selected_candidate_index')->nullable()->after('confidence');
        });
    }

    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropColumn('selected_candidate_index');
        });
    }
};
