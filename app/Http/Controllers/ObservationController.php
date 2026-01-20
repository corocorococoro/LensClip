<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreObservationRequest;
use App\Jobs\AnalyzeObservationJob;
use App\Models\Observation;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class ObservationController extends Controller
{
    protected $observationService;

    public function __construct(\App\Services\ObservationService $observationService)
    {
        $this->observationService = $observationService;
    }

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
            $query->search($request->q);
        }

        // Filter by tag
        if ($request->filled('tag')) {
            $query->withTag($request->tag);
        }

        $observations = $query->paginate($request->get('per_page', 20));

        // Get user's tags for filter
        $tags = Tag::forUser(auth()->id())->orderBy('name')->get();

        return Inertia::render('Library', [
            'observations' => $observations,
            'tags' => $tags,
            'filters' => $request->only(['q', 'tag']),
        ]);
    }

    /**
     * Store a newly created observation.
     */
    public function store(StoreObservationRequest $request)
    {
        $observation = $this->observationService->createObservation(
            $request->user(),
            $request->file('image')
        );

        // Return JSON for API calls, redirect for Inertia
        if ($request->wantsJson()) {
            return response()->json(new \App\Http\Resources\ObservationResource($observation), 201);
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

        Log::withContext([
            'observation_id' => $observation->id,
            'user_id' => auth()->id(),
        ]);

        $observation->load('tags');

        // Return JSON for polling
        if (request()->wantsJson()) {
            return response()->json(new \App\Http\Resources\ObservationResource($observation));
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

        $this->observationService->deleteObservation($observation);

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
            $this->observationService->deleteObservation($observation);
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

        // Tag logic could also be moved to TagService, but kept simple here for now
        // or strictly moved as per plan. Let's keep it here for now as it's simple enough
        // but cleaner to refactor if we want to be strict.
        // Given the plan says "TagService", let's stick to the plan for syncing if complex.
        // Actually, preventing over-engineering: standard sync is fine here.
        // But let's clean up the logic slightly.

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
