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
            $table->string('category', 50)->nullable()->default(null)->change();
        });

        DB::table('observations')
            ->whereIn('status', ['processing', 'failed'])
            ->where('category', 'other')
            ->update(['category' => null]);
    }

    public function down(): void
    {
        DB::table('observations')
            ->whereNull('category')
            ->update(['category' => 'other']);

        Schema::table('observations', function (Blueprint $table) {
            $table->string('category', 50)->default('other')->nullable(false)->change();
        });
    }
};
