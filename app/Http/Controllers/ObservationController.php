<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreObservationRequest;
use App\Jobs\AnalyzeObservationJob;
use App\Models\Collection;
use App\Models\Observation;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ObservationController extends Controller
{
    /**
     * Display a listing of the observations.
     */
    public function index(Request $request)
    {
        $query = Observation::forUser(auth()->id())
            ->with('tags')
            ->latest();

        // Search by title
        if ($request->filled('q')) {
            $query->where('title', 'like', '%' . $request->q . '%');
        }

        // Filter by tag
        if ($request->filled('tag')) {
            $query->whereHas('tags', function ($q) use ($request) {
                $q->where('name', $request->tag);
            });
        }

        // Filter by collection
        if ($request->filled('collection')) {
            $query->whereHas('collections', function ($q) use ($request) {
                $q->where('collections.id', $request->collection);
            });
        }

        $observations = $query->paginate($request->get('per_page', 20));

        // Get user's tags for filter
        $tags = Tag::forUser(auth()->id())->orderBy('name')->get();

        return Inertia::render('Library', [
            'observations' => $observations,
            'tags' => $tags,
            'filters' => $request->only(['q', 'tag', 'collection']),
        ]);
    }

    /**
     * Store a newly created observation.
     */
    public function store(StoreObservationRequest $request)
    {
        $file = $request->file('image');
        $tempPath = $file->getPathname();

        // Process image
        $manager = new ImageManager(new Driver());
        $image = $manager->read($tempPath);
        $image->orient();

        // Resize for API cost/speed (max 1024px)
        $image->scaleDown(width: 1024);

        // Generate unique filenames
        $hashName = Str::random(40);
        $originalPath = "observations/{$hashName}.webp";
        $thumbPath = "observations/{$hashName}_thumb.webp";

        // Save Original (WebP, strip EXIF by default)
        $encoded = $image->toWebp(quality: 80);
        Storage::disk('public')->put($originalPath, (string) $encoded);

        // Save Thumbnail
        $thumb = clone $image;
        $thumb->scaleDown(width: 300);
        Storage::disk('public')->put($thumbPath, (string) $thumb->toWebp(quality: 70));

        // Create Observation with processing status
        $observation = Observation::create([
            'user_id' => auth()->id(),
            'status' => 'processing',
            'original_path' => $originalPath,
            'thumb_path' => $thumbPath,
        ]);

        // Dispatch analysis job
        AnalyzeObservationJob::dispatch($observation->id);

        // Return JSON for API calls, redirect for Inertia
        if ($request->wantsJson()) {
            return response()->json([
                'id' => $observation->id,
                'status' => $observation->status,
                'thumb_url' => $observation->thumb_url,
            ], 201);
        }

        return redirect()->route('observations.processing', $observation);
    }

    /**
     * Show processing status page.
     */
    public function processing(Observation $observation)
    {
        $this->authorize('view', $observation);

        return Inertia::render('Observations/Processing', [
            'observation' => $observation,
        ]);
    }

    /**
     * Display the specified observation.
     */
    public function show(Observation $observation)
    {
        $this->authorize('view', $observation);

        $observation->load('tags', 'collections');

        // Return JSON for polling
        if (request()->wantsJson()) {
            return response()->json([
                'id' => $observation->id,
                'status' => $observation->status,
                'title' => $observation->title,
                'summary' => $observation->summary,
                'kid_friendly' => $observation->kid_friendly,
                'confidence' => $observation->confidence,
                'category' => $observation->category,
                'tags' => $observation->tags->pluck('name'),
                'fun_facts' => $observation->fun_facts,
                'safety_notes' => $observation->safety_notes,
                'questions' => $observation->questions,
                'original_url' => $observation->original_url,
                'cropped_url' => $observation->cropped_url,
                'thumb_url' => $observation->thumb_url,
                'error_message' => $observation->error_message,
                'created_at' => $observation->created_at,
            ]);
        }

        return Inertia::render('Observations/Show', [
            'observation' => $observation,
        ]);
    }

    /**
     * Retry failed observation.
     */
    public function retry(Observation $observation)
    {
        $this->authorize('retry', $observation);

        $observation->update([
            'status' => 'processing',
            'error_message' => null,
        ]);

        AnalyzeObservationJob::dispatch($observation->id);

        if (request()->wantsJson()) {
            return response()->json([
                'id' => $observation->id,
                'status' => 'processing',
            ], 202);
        }

        return redirect()->route('observations.processing', $observation);
    }

    /**
     * Remove the specified observation.
     */
    public function destroy(Observation $observation)
    {
        $this->authorize('delete', $observation);

        // Delete image files
        Storage::disk('public')->delete([
            $observation->original_path,
            $observation->cropped_path,
            $observation->thumb_path,
        ]);

        $observation->delete();

        if (request()->wantsJson()) {
            return response()->json(null, 204);
        }

        return redirect()->route('library');
    }

    /**
     * Remove all observations for the user.
     */
    public function destroyAll(Request $request)
    {
        $request->validate([
            'confirm' => 'required|boolean|accepted',
        ]);

        $observations = Observation::forUser(auth()->id())->get();

        foreach ($observations as $observation) {
            Storage::disk('public')->delete([
                $observation->original_path,
                $observation->cropped_path,
                $observation->thumb_path,
            ]);
            $observation->forceDelete();
        }

        if ($request->wantsJson()) {
            return response()->json(null, 204);
        }

        return redirect()->route('library');
    }

    /**
     * Update observation tags.
     */
    public function updateTags(Request $request, Observation $observation)
    {
        $this->authorize('update', $observation);

        $request->validate([
            'tags' => 'array',
            'tags.*' => 'string|max:50',
        ]);

        $tagIds = [];
        foreach ($request->tags as $name) {
            $name = trim($name);
            if (empty($name))
                continue;

            $tag = Tag::firstOrCreate(
                ['user_id' => auth()->id(), 'name' => $name],
                ['user_id' => auth()->id(), 'name' => $name]
            );
            $tagIds[] = $tag->id;
        }

        $observation->tags()->sync($tagIds);

        if ($request->wantsJson()) {
            return response()->json(['tags' => $observation->tags->pluck('name')]);
        }

        return back();
    }
}
