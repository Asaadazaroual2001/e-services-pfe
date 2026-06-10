<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->string('code')->nullable()->unique()->after('id');
            $table->string('label')->nullable()->after('code');
            $table->unsignedSmallInteger('level')->nullable()->default(1)->after('label');
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn(['code', 'label', 'level']);
        });
    }

};
