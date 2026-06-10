<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_user_id_foreign');
            DB::statement('ALTER TABLE requests ALTER COLUMN user_id DROP NOT NULL');
            DB::statement('ALTER TABLE requests ADD CONSTRAINT requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');

            Schema::table('requests', function (Blueprint $table) {
                $table->string('public_submission_token', 64)->nullable()->unique();
            });

            DB::statement('ALTER TABLE request_histories DROP CONSTRAINT IF EXISTS request_histories_actor_id_foreign');
            DB::statement('ALTER TABLE request_histories ALTER COLUMN actor_id DROP NOT NULL');
            DB::statement('ALTER TABLE request_histories ADD CONSTRAINT request_histories_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL');

            DB::statement('ALTER TABLE request_documents DROP CONSTRAINT IF EXISTS request_documents_uploaded_by_foreign');
            DB::statement('ALTER TABLE request_documents ALTER COLUMN uploaded_by DROP NOT NULL');
            DB::statement('ALTER TABLE request_documents ADD CONSTRAINT request_documents_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL');

            DB::statement('ALTER TABLE request_comments DROP CONSTRAINT IF EXISTS request_comments_user_id_foreign');
            DB::statement('ALTER TABLE request_comments ALTER COLUMN user_id DROP NOT NULL');
            DB::statement('ALTER TABLE request_comments ADD CONSTRAINT request_comments_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');

            return;
        }

        if ($driver === 'mysql') {
            Schema::table('requests', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            DB::statement('ALTER TABLE requests MODIFY user_id BIGINT UNSIGNED NULL');
            Schema::table('requests', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
                $table->string('public_submission_token', 64)->nullable()->unique();
            });

            Schema::table('request_histories', function (Blueprint $table) {
                $table->dropForeign(['actor_id']);
            });
            DB::statement('ALTER TABLE request_histories MODIFY actor_id BIGINT UNSIGNED NULL');
            Schema::table('request_histories', function (Blueprint $table) {
                $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            });

            Schema::table('request_documents', function (Blueprint $table) {
                $table->dropForeign(['uploaded_by']);
            });
            DB::statement('ALTER TABLE request_documents MODIFY uploaded_by BIGINT UNSIGNED NULL');
            Schema::table('request_documents', function (Blueprint $table) {
                $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            });

            Schema::table('request_comments', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
            });
            DB::statement('ALTER TABLE request_comments MODIFY user_id BIGINT UNSIGNED NULL');
            Schema::table('request_comments', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            Schema::table('requests', function (Blueprint $table) {
                $table->dropUnique(['public_submission_token']);
                $table->dropColumn('public_submission_token');
            });

            DB::statement('ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_user_id_foreign');
            DB::statement('DELETE FROM requests WHERE user_id IS NULL');
            DB::statement('ALTER TABLE requests ALTER COLUMN user_id SET NOT NULL');
            DB::statement('ALTER TABLE requests ADD CONSTRAINT requests_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');

            DB::statement('ALTER TABLE request_histories DROP CONSTRAINT IF EXISTS request_histories_actor_id_foreign');
            DB::statement('DELETE FROM request_histories WHERE actor_id IS NULL');
            DB::statement('ALTER TABLE request_histories ALTER COLUMN actor_id SET NOT NULL');
            DB::statement('ALTER TABLE request_histories ADD CONSTRAINT request_histories_actor_id_foreign FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE');

            DB::statement('ALTER TABLE request_documents DROP CONSTRAINT IF EXISTS request_documents_uploaded_by_foreign');
            DB::statement('DELETE FROM request_documents WHERE uploaded_by IS NULL');
            DB::statement('ALTER TABLE request_documents ALTER COLUMN uploaded_by SET NOT NULL');
            DB::statement('ALTER TABLE request_documents ADD CONSTRAINT request_documents_uploaded_by_foreign FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE');

            DB::statement('ALTER TABLE request_comments DROP CONSTRAINT IF EXISTS request_comments_user_id_foreign');
            DB::statement('DELETE FROM request_comments WHERE user_id IS NULL');
            DB::statement('ALTER TABLE request_comments ALTER COLUMN user_id SET NOT NULL');
            DB::statement('ALTER TABLE request_comments ADD CONSTRAINT request_comments_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        }
    }
};
