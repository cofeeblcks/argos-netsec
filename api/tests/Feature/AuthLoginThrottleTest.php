<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

test('login is rate limited after repeated failures', function () {
    $email = 'admin@argos.local';
    $limiterKey = Str::transliterate(Str::lower($email).'|127.0.0.1');
    RateLimiter::clear($limiterKey);

    User::factory()->create([
        'email' => $email,
        'password' => 'password',
    ]);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'wrong-password',
        ])->assertUnauthorized();
    }

    $this->postJson('/api/v1/auth/login', [
        'email' => $email,
        'password' => 'wrong-password',
    ])->assertStatus(429);
});
