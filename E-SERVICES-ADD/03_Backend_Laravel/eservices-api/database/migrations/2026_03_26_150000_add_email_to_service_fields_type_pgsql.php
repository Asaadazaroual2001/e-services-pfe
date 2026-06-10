<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Laravel's enum() on PostgreSQL adds a CHECK constraint (e.g. service_fields_type_check).
     * The original migration omitted "email", which the API now allows.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE service_fields DROP CONSTRAINT IF EXISTS service_fields_type_check');

        DB::statement(
            "ALTER TABLE service_fields ADD CONSTRAINT service_fields_type_check CHECK ((type)::text IN ('text', 'number', 'email', 'date', 'select', 'textarea', 'file'))"
        );
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE service_fields DROP CONSTRAINT IF EXISTS service_fields_type_check');

        DB::statement(
            "ALTER TABLE service_fields ADD CONSTRAINT service_fields_type_check CHECK ((type)::text IN ('text', 'number', 'date', 'select', 'textarea', 'file'))"
        );
    }
};
