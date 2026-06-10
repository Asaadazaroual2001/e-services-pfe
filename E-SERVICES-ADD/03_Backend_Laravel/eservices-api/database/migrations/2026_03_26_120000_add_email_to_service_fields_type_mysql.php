<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SQLite (and some setups) already store flexible string values for enum columns.
     * MySQL native ENUM must include every allowed value.
     */
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE service_fields MODIFY COLUMN type ENUM('text', 'number', 'email', 'date', 'select', 'textarea', 'file') NOT NULL");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE service_fields MODIFY COLUMN type ENUM('text', 'number', 'date', 'select', 'textarea', 'file') NOT NULL");
    }
};
