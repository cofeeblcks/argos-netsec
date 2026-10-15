<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('kind'); // scanner | ids
            $table->string('token_hash');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });

        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->string('mac', 17)->unique();
            $table->string('ip', 45);
            $table->string('hostname')->nullable();
            $table->string('vendor')->nullable();
            $table->string('os_guess')->nullable();
            $table->boolean('authorized')->default(false);
            $table->timestamp('first_seen');
            $table->timestamp('last_seen');
            $table->string('risk')->default('unknown');
            $table->timestamps();
        });

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('port');
            $table->string('protocol', 8);
            $table->string('name')->nullable();
            $table->string('version')->nullable();
            $table->json('cve_ids')->nullable();
            $table->string('severity')->default('unknown');
            $table->timestamp('last_seen');
            $table->timestamps();
            $table->unique(['device_id', 'port', 'protocol']);
        });

        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->timestamp('occurred_at');
            $table->string('type');
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->json('detail');
            $table->timestamps();
            $table->index(['occurred_at', 'type']);
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->timestamp('occurred_at');
            $table->string('rule');
            $table->string('severity');
            $table->string('src_ip', 45)->nullable();
            $table->string('dst_ip', 45)->nullable();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->json('raw')->nullable();
            $table->string('status')->default('open');
            $table->timestamp('telegram_sent_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'severity', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('events');
        Schema::dropIfExists('services');
        Schema::dropIfExists('devices');
        Schema::dropIfExists('sensors');
    }
};
