<?php

namespace Database\Seeders;

use App\Models\Sensor;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ArgosSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@argos.local'],
            [
                'name' => 'Argos Admin',
                'password' => Hash::make('password'),
            ]
        );

        Sensor::query()->updateOrCreate(
            ['name' => 'scanner-lab'],
            [
                'kind' => 'scanner',
                'token_hash' => Hash::make('scanner-dev-token'),
                'last_seen_at' => null,
            ]
        );

        Sensor::query()->updateOrCreate(
            ['name' => 'ids-lab'],
            [
                'kind' => 'ids',
                'token_hash' => Hash::make('ids-dev-token'),
                'last_seen_at' => null,
            ]
        );
    }
}
