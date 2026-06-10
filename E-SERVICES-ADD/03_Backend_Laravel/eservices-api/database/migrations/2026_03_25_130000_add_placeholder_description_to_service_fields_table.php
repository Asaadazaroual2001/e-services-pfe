<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_fields', function (Blueprint $table) {
            $table->string('placeholder')->nullable()->after('label');
            $table->text('description')->nullable()->after('placeholder');
        });
    }

    public function down(): void
    {
        Schema::table('service_fields', function (Blueprint $table) {
            $table->dropColumn(['placeholder', 'description']);
        });
    }
};

