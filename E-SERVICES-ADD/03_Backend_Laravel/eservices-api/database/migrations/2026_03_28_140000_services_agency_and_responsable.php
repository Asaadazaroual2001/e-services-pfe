<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->foreignId('responsable_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropUnique(['name']);
        });

        Schema::table('services', function (Blueprint $table) {
            $table->foreignId('agency_id')
                ->nullable()
                ->constrained('agencies')
                ->nullOnDelete();
            $table->unique(['agency_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropUnique(['agency_id', 'name']);
            $table->dropForeign(['agency_id']);
            $table->dropColumn('agency_id');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->unique('name');
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->dropForeign(['responsable_user_id']);
            $table->dropColumn('responsable_user_id');
        });
    }
};
