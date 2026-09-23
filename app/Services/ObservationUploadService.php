<?php

namespace App\Services;

use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\User;
use App\Support\DispatchObservationJob;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ObservationUploadService
{
    public function createObservation(User $user, UploadedFile $file, ?float $latitude, ?float $longitude, string $uploadId): Observation
    {
        $uploadId = strtolower($uploadId);
        $fingerprint = hash('sha256', hash_file('sha256', $file->getPathname()).json_encode([$latitude, $longitude]));
        $created = null;
        try {
            $observation = DB::transaction(function () use ($user, $file, $latitude, $longitude, $uploadId, $fingerprint, &$created) {
                // Serialize receipt creation across workers, including the first request.
                User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                $receipt = DB::table('observation_uploads')->where('user_id', $user->id)->where('upload_id', $uploadId)->first();
                if ($receipt) {
                    abort_unless(hash_equals($receipt->fingerprint, $fingerprint), 409);
                    // Keep a tombstone after deletion so an uncertain retry cannot resurrect it.
                    abort_unless($receipt->observation_id, 410);

                    $existing = Observation::forUser($user->id)->find($receipt->observation_id);
                    abort_unless($existing, 410);

                    return $existing;
                }
                $created = app(ObservationService::class)->stageObservation($user, $file, $latitude, $longitude);
                DB::table('observation_uploads')->insert([
                    'user_id' => $user->id, 'upload_id' => $uploadId, 'fingerprint' => $fingerprint,
                    'observation_id' => $created->id, 'created_at' => now(), 'updated_at' => now(),
                ]);

                return $created;
            });
        } catch (\Throwable $exception) {
            if ($created) {
                Storage::disk('local')->delete([substr($created->original_path, 6), substr($created->thumb_path, 6)]);
            }
            throw $exception;
        }
        if ($created) {
            app(DispatchObservationJob::class)->execute(new AnalyzeObservationJob($created->id, $created->processing_token));
        }

        return $observation->refresh();
    }
}
