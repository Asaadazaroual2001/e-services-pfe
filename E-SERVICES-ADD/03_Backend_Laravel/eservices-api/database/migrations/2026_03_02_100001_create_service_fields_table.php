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
        Schema::create('service_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->string('key'); // e.g., 'full_name', 'birth_date'
            $table->string('label'); // e.g., 'Nom complet', 'Date de naissance'
            $table->enum('type', ['text', 'number', 'date', 'select', 'textarea', 'file']);
            $table->boolean('required')->default(false);
            $table->json('options_json')->nullable(); // For select type: ["Option 1", "Option 2"]
            $table->integer('order')->default(0);
            $table->timestamps();

            // Ensure unique key per service
            $table->unique(['service_id', 'key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_fields');
    }
};

