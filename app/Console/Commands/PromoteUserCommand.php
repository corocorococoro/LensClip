<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PromoteUserCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'user:promote {email : The email of the user to promote}';

    /**
     * The console command description.
     */
    protected $description = 'Promote a user to admin role';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return Command::FAILURE;
        }

        if ($user->isAdmin()) {
            $this->info("User '{$email}' is already an admin.");
            return Command::SUCCESS;
        }

        $user->update(['role' => User::ROLE_ADMIN]);

        Log::info('User promoted to admin', [
            'user_id' => $user->id,
            'email' => $user->email,
            'promoted_by' => 'artisan command',
        ]);

        $this->info("User '{$email}' has been promoted to admin.");

        return Command::SUCCESS;
    }
}
