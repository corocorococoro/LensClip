<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            // 初めて ready になった時点で確定する節目(初発見・カテゴリ初・件数節目)の履歴。
            // null は未判定(ready 前 or 機能導入前の記録)を意味し、遡及付与はしない
            $table->json('milestones')->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            $table->dropColumn('milestones');
        });
    }
};
