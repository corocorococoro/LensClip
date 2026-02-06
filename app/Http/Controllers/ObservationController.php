<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyAllObservationsRequest;
use App\Http\Requests\StoreObservationRequest;
use App\Http\Requests\UpdateObservationTagsRequest;
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
     * カテゴリ定義
     */
    private const CATEGORIES = [
        ['id' => 'food_drink', 'name' => '食事と飲み物', 'color' => '#a78bfa'],
        ['id' => 'people_family', 'name' => '人々と家族', 'color' => '#7dd3fc'],
        ['id' => 'body_health', 'name' => '身体と健康', 'color' => '#f0abfc'],
        ['id' => 'animals_nature', 'name' => '動物と自然', 'color' => '#86efac'],
        ['id' => 'home_furniture', 'name' => '住まいと家具', 'color' => '#fda4af'],
        ['id' => 'school_study', 'name' => '学校と勉強', 'color' => '#fdba74'],
        ['id' => 'transport_travel', 'name' => '交通と旅行', 'color' => '#fcd34d'],
        ['id' => 'sports_hobby', 'name' => 'スポーツと趣味', 'color' => '#6ee7b7'],
        ['id' => 'clothes_fashion', 'name' => '服とファッション', 'color' => '#c4b5fd'],
        ['id' => 'other', 'name' => 'その他', 'color' => '#cbd5e1'],
    ];

    /**
     * Display a listing of the observations.
     */
    public function index(Request $request)
    {
        $viewMode = $request->get('view', 'date');

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

        // Filter by category
        if ($request->filled('category')) {
            $query->where('ai_json->category', $request->category);
        }

        // Get user's tags for filter
        $tags = Tag::forUser(auth()->id())->orderBy('name')->get();

        // Build response based on view mode
        if ($viewMode === 'category') {
            // Category view - return all with category counts
            $observations = $query->get();
            $categoryCounts = $this->buildCategoryCounts($observations);

            return Inertia::render('Library', [
                'observations' => ['data' => $observations],
                'tags' => $tags,
                'filters' => $request->only(['q', 'tag', 'view', 'category']),
                'viewMode' => $viewMode,
                'categories' => self::CATEGORIES,
                'categoryCounts' => $categoryCounts,
            ]);
        }

        if ($viewMode === 'map') {
            // Map view - return all observations with location
            $observations = $query->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->get();

            return Inertia::render('Library', [
                'observations' => ['data' => $observations],
                'tags' => $tags,
                'filters' => $request->only(['q', 'tag', 'view']),
                'viewMode' => $viewMode,
            ]);
        }

        // Date view (default) - group by year/month
        $observations = $query->get();
        $dateGroups = $this->buildDateGroups($observations);

        return Inertia::render('Library', [
            'observations' => ['data' => $observations],
            'tags' => $tags,
            'filters' => $request->only(['q', 'tag', 'view']),
            'viewMode' => $viewMode,
            'dateGroups' => $dateGroups,
        ]);
    }

    /**
     * Build date groups from observations.
     */
    private function buildDateGroups($observations): array
    {
        $groups = [];
        foreach ($observations as $obs) {
            $date = $obs->created_at;
            $yearMonth = $date->format('Y-m');
            $label = $date->format('n月') . ($date->year !== now()->year ? ', ' . $date->year : '');

            if (!isset($groups[$yearMonth])) {
                $groups[$yearMonth] = [
                    'yearMonth' => $yearMonth,
                    'label' => $label,
                    'observations' => [],
                ];
            }
            $groups[$yearMonth]['observations'][] = $obs;
        }

        // Sort by date descending
        krsort($groups);

        return array_values($groups);
    }

    /**
     * Build category counts from observations.
     */
    private function buildCategoryCounts($observations): array
    {
        $counts = [];
        foreach (self::CATEGORIES as $cat) {
            $counts[$cat['id']] = 0;
        }

        foreach ($observations as $obs) {
            $category = $obs->category ?? 'other';
            if (isset($counts[$category])) {
                $counts[$category]++;
            } else {
                $counts['other']++;
            }
        }

        return $counts;
    }

    /**
     * Store a newly created observation.
     */
    public function store(StoreObservationRequest $request)
    {
        $observation = $this->observationService->createObservation(
            $request->user(),
            $request->file('image'),
            $request->validated('latitude'),
            $request->validated('longitude')
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
    public function destroyAll(DestroyAllObservationsRequest $request)
    {
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
    public function updateTags(UpdateObservationTagsRequest $request, Observation $observation)
    {
        $this->authorize('update', $observation);

        $validated = $request->validated();

        $tagIds = [];
        foreach ($validated['tags'] ?? [] as $name) {
            $name = trim($name);
            if (empty($name)) {
                continue;
            }

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
