<?php

namespace App\Console\Commands;

use App\Services\TtsService;
use Illuminate\Console\Command;

class CleanupExpiredTtsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tts:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cleanup expired TTS audio files based on TTL';

    /**
     * Execute the console command.
     */
    public function handle(TtsService $ttsService): int
    {
        $this->info('Starting TTS cleanup...');

        try {
            $count = $ttsService->cleanupExpired();
            $this->info("Deleted {$count} expired TTS files.");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Cleanup failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
