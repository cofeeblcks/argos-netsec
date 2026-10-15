<?php

use App\Http\Controllers\API\AlertController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\DeviceController;
use App\Http\Controllers\API\EventController;
use App\Http\Controllers\API\Ingest\AlertController as IngestAlertController;
use App\Http\Controllers\API\Ingest\BaselineController;
use App\Http\Controllers\API\Ingest\EventController as IngestEventController;
use App\Http\Controllers\API\Ingest\ScanController;
use App\Http\Controllers\API\ServiceController;
use App\Http\Controllers\API\SummaryController;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware('sensor')->prefix('ingest')->group(function () {
        Route::get('heartbeat', [BaselineController::class, 'heartbeat']);
        Route::post('scan', [ScanController::class, 'store']);
        Route::post('events', [IngestEventController::class, 'store']);
        Route::post('alerts', [IngestAlertController::class, 'store']);
        Route::get('devices', [BaselineController::class, 'devices']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('devices', [DeviceController::class, 'index']);
        Route::patch('devices/{device}', [DeviceController::class, 'update']);
        Route::get('services', [ServiceController::class, 'index']);
        Route::get('events', [EventController::class, 'index']);
        Route::get('alerts', [AlertController::class, 'index']);
        Route::patch('alerts/{alert}', [AlertController::class, 'update']);
        Route::get('summary', [SummaryController::class, 'show']);
    });
});
