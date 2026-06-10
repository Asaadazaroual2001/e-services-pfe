<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cin', 32)->nullable()->after('email');
        });

        Schema::create('staff_client_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->string('recipient_name', 190);
            $table->string('recipient_email', 190);
            $table->string('recipient_cin', 32);
            $table->string('subject', 190);
            $table->text('body');
            $table->foreignId('request_id')->nullable()->constrained('requests')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_client_emails');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('cin');
        });
    }
};
