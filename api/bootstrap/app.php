<?php

use App\Constants\ApiStatuses;
use App\Constants\ErrorMessages;
use App\Http\Middleware\AuthenticateSensor;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'sensor' => AuthenticateSensor::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => $exception->getMessage(),
                    'errors' => $exception->errors(),
                ], ApiStatuses::STATUS_UNPROCESSABLE_ENTITY);
            }

            return null;
        });

        $exceptions->render(function (AuthenticationException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => ErrorMessages::UNAUTHENTICATED,
                ], ApiStatuses::STATUS_UNAUTHORIZED);
            }

            return null;
        });

        $exceptions->render(function (ModelNotFoundException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => ErrorMessages::NOT_FOUND,
                ], ApiStatuses::STATUS_NOT_FOUND);
            }

            return null;
        });

        $exceptions->render(function (NotFoundHttpException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => ErrorMessages::NOT_FOUND,
                ], ApiStatuses::STATUS_NOT_FOUND);
            }

            return null;
        });

        $exceptions->render(function (AccessDeniedHttpException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => ErrorMessages::FORBIDDEN,
                ], ApiStatuses::STATUS_FORBIDDEN);
            }

            return null;
        });

        $exceptions->render(function (MethodNotAllowedHttpException $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'status' => 'error',
                    'message' => ErrorMessages::METHOD_NOT_ALLOWED,
                ], ApiStatuses::STATUS_METHOD_NOT_ALLOWED);
            }

            return null;
        });

        $exceptions->render(function (\Throwable $exception, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                $message = ErrorMessages::SERVER_ERROR;
                $error = config('app.debug') ? $exception->getMessage() : null;

                return response()->json(array_filter([
                    'status' => 'error',
                    'message' => $message,
                    'error' => $error,
                ], fn ($value) => $value !== null && $value !== ''), ApiStatuses::STATUS_INTERNAL_SERVER_ERROR);
            }

            return null;
        });
    })->create();
