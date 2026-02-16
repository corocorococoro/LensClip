<?php

namespace Database\Seeders;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PerformanceTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create User
        $user = User::firstOrCreate(
            ['email' => 'perf@example.com'],
            [
                'name' => 'Performance User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Cleaup existing observations for this user to avoid duplicates on re-run
        Observation::where('user_id', $user->id)->delete();

        // 2. Prepare Dummy Images (Calm colors)
        $disk = Storage::disk();
        $dummyDir = 'observations';
        $disk->makeDirectory($dummyDir);

        $colors = [
            ['r' => 176, 'g' => 196, 'b' => 222], // LightSteelBlue
            ['r' => 240, 'g' => 128, 'b' => 128], // LightCoral
            ['r' => 144, 'g' => 238, 'b' => 144], // LightGreen
            ['r' => 255, 'g' => 222, 'b' => 173], // NavajoWhite
            ['r' => 221, 'g' => 160, 'b' => 221], // Plum
        ];

        $dummyFiles = [];
        foreach ($colors as $index => $rgb) {
            $filename = "dummy_calm_{$index}.webp";
            $path = "$dummyDir/$filename";

            // Re-create to ensure new style
            if ($disk->exists($path)) {
                $disk->delete($path);
            }

            if (extension_loaded('gd')) {
                $width = 640;
                $height = 480;
                $img = imagecreatetruecolor($width, $height);
                $color = imagecolorallocate($img, $rgb['r'], $rgb['g'], $rgb['b']);
                imagefill($img, 0, 0, $color);

                // Add some text
                $text = "DUMMY IMAGE $index";
                $font = 5; // Built-in font size 1-5
                $fontWidth = imagefontwidth($font);
                $fontHeight = imagefontheight($font);
                $textWidth = $fontWidth * strlen($text);

                $x = ($width - $textWidth) / 2;
                $y = ($height - $fontHeight) / 2;

                $textColor = imagecolorallocate($img, 60, 60, 60); // Dark Gray for contrast
                imagestring($img, $font, $x, $y, $text, $textColor);

                ob_start();
                imagewebp($img);
                $contents = ob_get_clean();
                imagedestroy($img);

                $disk->put($path, $contents);
            } else {
                $disk->put($path, "DUMMY IMAGE CONTENT (GD not installed)");
            }
            $dummyFiles[] = $filename;
        }

        // 3. Generate Observations (Clustered around Tsunashima, Yokohama)
        // Tsunashima Station: 35.5381, 139.6354
        $baseLat = 35.5381;
        $baseLng = 139.6354;

        $categories = ['animal', 'insect', 'plant', 'food', 'vehicle', 'place', 'tool', 'other'];

        $observations = [];
        for ($i = 0; $i < 600; $i++) {
            $dummyImage = $dummyFiles[array_rand($dummyFiles)];

            // Random location within ~2km radius
            // 0.01 degree ~ 1.1km
            $latOffset = (mt_rand(-200, 200) / 10000); // +/- 0.02
            $lngOffset = (mt_rand(-200, 200) / 10000); // +/- 0.02

            $observations[] = [
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'status' => 'ready',
                'original_path' => "observations/$dummyImage",
                'thumb_path' => "observations/$dummyImage",
                'cropped_path' => "observations/$dummyImage",
                'title' => "Tsunashima Obs #$i",
                'summary' => "Located near Tsunashima ($i).",
                'confidence' => 0.99,
                'category' => $categories[array_rand($categories)],
                'latitude' => $baseLat + $latOffset,
                'longitude' => $baseLng + $lngOffset,
                'created_at' => now()->subDays(mt_rand(0, 360)), // Recent 3 months
                'updated_at' => now(),
            ];
        }

        // Insert in chunks
        foreach (array_chunk($observations, 50) as $chunk) {
            Observation::insert($chunk);
        }

        $count = count($observations);
        $this->command->info("Created {$count} observations for {$user->email} around Tsunashima (Last 360 days)");
    }
}
