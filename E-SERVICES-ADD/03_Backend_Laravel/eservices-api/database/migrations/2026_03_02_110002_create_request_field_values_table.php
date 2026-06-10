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
        Schema::create('request_field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_field_id')->constrained()->onDelete('cascade');
            $table->text('value_text')->nullable(); // For text, number, date, textarea
            $table->json('value_json')->nullable(); // For select (multiple), checkbox arrays
            $table->timestamps();

            // Ensure one value per field per request
            $table->unique(['request_id', 'service_field_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('request_field_values');
    }
};
