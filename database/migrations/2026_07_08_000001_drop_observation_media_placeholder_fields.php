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
            if (Schema::hasColumn('observations', 'client_ref')) {
                try {
                    $table->dropIndex(['user_id', 'client_ref']);
                } catch (\Throwable) {
                    // Older or manually adjusted databases may have the column without this index.
                }
            }

            $columns = array_values(array_filter([
                Schema::hasColumn('observations', 'media_uploaded') ? 'media_uploaded' : null,
                Schema::hasColumn('observations', 'media_uploaded_at') ? 'media_uploaded_at' : null,
                Schema::hasColumn('observations', 'client_ref') ? 'client_ref' : null,
            ]));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('observations', function (Blueprint $table) {
            if (! Schema::hasColumn('observations', 'media_uploaded')) {
                $table->boolean('media_uploaded')->default(true)->after('thumb_path');
            }

            if (! Schema::hasColumn('observations', 'media_uploaded_at')) {
                $table->timestamp('media_uploaded_at')->nullable()->after('media_uploaded');
            }

            if (! Schema::hasColumn('observations', 'client_ref')) {
                $table->string('client_ref', 64)->nullable()->after('media_uploaded_at');
                $table->index(['user_id', 'client_ref']);
            }
        });
    }
};
