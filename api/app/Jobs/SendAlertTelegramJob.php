<?php

namespace App\Jobs;

use App\Models\Alert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendAlertTelegramJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $alertId) {}

    public function handle(): void
    {
        $alert = Alert::query()->with('device')->find($this->alertId);

        if (! $alert || ! $alert->shouldNotifyTelegram()) {
            return;
        }

        $windowMinutes = (int) config('argos.telegram_dedupe_minutes', 15);
        $recent = Alert::query()
            ->where('rule', $alert->rule)
            ->where('src_ip', $alert->src_ip)
            ->where('dst_ip', $alert->dst_ip)
            ->whereNotNull('telegram_sent_at')
            ->where('telegram_sent_at', '>=', now()->subMinutes($windowMinutes))
            ->where('id', '!=', $alert->id)
            ->exists();

        if ($recent) {
            return;
        }

        $token = config('services.telegram.bot_token');
        $chatId = config('services.telegram.chat_id');

        if (! $token || ! $chatId) {
            Log::warning('Telegram credentials missing; alert not sent', [
                'alert_id' => $alert->id,
            ]);

            return;
        }

        $hostname = $alert->device?->hostname;
        $lines = [
            '*Argos NetSec*',
            'Rule: `'.$alert->rule.'`',
            'Severity: *'.$alert->severity.'*',
            'Src: `'.($alert->src_ip ?? '—').'`',
            'Dst: `'.($alert->dst_ip ?? '—').'`',
        ];

        if ($hostname) {
            $lines[] = 'Host: `'.$hostname.'`';
        }

        $response = Http::asForm()->post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text' => implode("\n", $lines),
            'parse_mode' => 'Markdown',
        ]);

        if ($response->successful()) {
            $alert->forceFill(['telegram_sent_at' => now()])->save();
        } else {
            Log::warning('Telegram send failed', [
                'alert_id' => $alert->id,
                'status' => $response->status(),
            ]);
        }
    }
}
