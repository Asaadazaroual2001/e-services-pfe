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
        Schema::create('requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique(); // ADD-2026-000123
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // client
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null'); // agent/employee
            $table->enum('current_status', [
                'DRAFT',
                'SUBMITTED',
                'IN_REVIEW',
                'NEEDS_INFO',
                'APPROVED',
                'REJECTED',
                'CLOSED'
            ])->default('DRAFT');
            $table->boolean('is_active')->default(true);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('reference');
            $table->index('current_status');
            $table->index('user_id');
            $table->index('assigned_to');
            $table->index('service_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requests');
    }
};
