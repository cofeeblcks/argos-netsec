<?php

namespace App\Http\Controllers\API;

use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Helpers\MessageHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Traits\Api\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            return $this->errorResponse(ErrorMessages::UNAUTHENTICATED, ApiStatuses::STATUS_UNAUTHORIZED);
        }

        $token = $user->createToken('dashboard')->plainTextToken;

        return $this->successResponse([
            'tokenType' => 'Bearer',
            'accessToken' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 'Sesión iniciada');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ], MessageHelper::make('usuario', 'show'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->successResponse([], 'Sesión cerrada');
    }
}
