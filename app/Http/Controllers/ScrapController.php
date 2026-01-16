<?php

namespace App\Http\Controllers;

use App\Models\Scrap;
use App\Models\Tag;
use App\Services\ImageAnalysisService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScrapController extends Controller
{
    protected $analysisService;

    public function __construct(ImageAnalysisService $analysisService)
    {
        $this->analysisService = $analysisService;
    }

    public function index()
    {
        $scraps = Scrap::where('user_id', auth()->id())
            ->with('tags')
            ->latest()
            ->paginate(20);

        return Inertia::render('Dashboard', [
            'scraps' => $scraps,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // 10MB max
        ]);

        try {
            $file = $request->file('image');
            $tempPath = $file->getPathname(); // Uploaded file path

            // Analyze
            $data = $this->analysisService->analyzeAndSave($tempPath, auth()->id());

            // Save to DB
            $scrap = Scrap::create($data);

            // Sync Tags
            if (!empty($data['analyzed_raw_json']['tags'])) {
                $tagIds = [];
                foreach ($data['analyzed_raw_json']['tags'] as $tagName) {
                    $tag = Tag::firstOrCreate(['name' => $tagName]);
                    $tagIds[] = $tag->id;
                }
                $scrap->tags()->sync($tagIds);
            }

            return redirect()->route('scraps.show', $scrap);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Upload failed: ' . $e->getMessage());
            \Illuminate\Support\Facades\Log::error($e->getTraceAsString());
            return back()->withErrors(['image' => $e->getMessage()]);
        }
    }

    public function show(Scrap $scrap)
    {
        if ($scrap->user_id !== auth()->id()) {
            abort(403);
        }

        $scrap->load('tags');

        return Inertia::render('Scraps/Show', [
            'scrap' => $scrap
        ]);
    }
}
