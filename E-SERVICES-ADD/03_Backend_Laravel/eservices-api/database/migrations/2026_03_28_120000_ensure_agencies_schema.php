<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Repare les bases où l’entrée migrations existe sans la table (ou jamais migré sur ce PostgreSQL).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('agencies')) {
            Schema::create('agencies', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code', 32)->nullable()->unique();
                $table->text('address')->nullable();
                $table->string('city', 120)->nullable();
                $table->string('phone', 40)->nullable();
                $table->string('email', 190)->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'agency_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('agency_id')
                    ->nullable()
                    ->constrained('agencies')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        // Ne pas supprimer : cette migration est idempotente / correctrice.
    }
};
