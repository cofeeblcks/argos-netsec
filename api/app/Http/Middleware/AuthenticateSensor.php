<?php

namespace App\Http\Middleware;

use App\Constants\ErrorMessages;
use App\Models\Sensor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateSensor
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json([
                'status' => 'error',
                'message' => ErrorMessages::INVALID_SENSOR_TOKEN,
            ], 401);
        }

        $sensor = Sensor::query()->get()->first(
            fn (Sensor $s) => Hash::check($token, $s->token_hash)
        );

        if (! $sensor) {
            return response()->json([
                'status' => 'error',
                'message' => ErrorMessages::INVALID_SENSOR_TOKEN,
            ], 401);
        }

        $sensor->forceFill(['last_seen_at' => now()])->save();
        $request->attributes->set('sensor', $sensor);

        return $next($request);
    }
}
