<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->text('instructions')->nullable(); // Tips to help the client prepare
            $table->text('procedure_steps')->nullable(); // Step-by-step for the client
            $table->text('required_documents')->nullable(); // What the client must upload/provide
            $table->text('eligibility_criteria')->nullable(); // Who can request this service
            $table->string('estimated_duration')->nullable(); // e.g. "3-5 jours"
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn([
                'instructions',
                'procedure_steps',
                'required_documents',
                'eligibility_criteria',
                'estimated_duration',
            ]);
        });
    }
};

