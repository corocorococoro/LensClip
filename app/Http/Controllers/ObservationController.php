<?php

namespace App\Http\Controllers;

use App\Actions\RetryObservationAction;
use App\Actions\UpdateObservationTagsAction;
use App\Http\Requests\DestroyAllObservationsRequest;
use App\Http\Requests\StoreObservationRequest;
use App\Http\Requests\UpdateObservationCategoryRequest;
use App\Http\Requests\UpdateObservationTagsRequest;
use App\Models\Observation;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ObservationController extends Controller
{
    protected $observationService;

    public function __construct(
        \App\Services\ObservationService $observationService,
        private RetryObservationAction $retryAction,
        private UpdateObservationTagsAction $updateTagsAction,
    ) {
        $this->observationService = $observationService;
    }

    /**
     * Display a listing of the observations.
     */
    public function index(Request $request)
    {
        $viewMode = $request->get('view', 'date');
        $perPage = config('library.per_page', 30);

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

        // Get user's tags for filter
        $tags = Tag::forUser(auth()->id())->orderBy('name')->get();

        if ($viewMode === 'category') {
            return $this->indexCategory($request, $query, $tags, $perPage);
        }

        if ($viewMode === 'map') {
            return $this->indexMap($request, $query, $tags);
        }

        return $this->indexDate($request, $query, $tags, $perPage);
    }

    /**
     * Date view: cursor-paginated observations grouped by year/month.
     */
    private function indexDate(Request $request, $query, $tags, int $perPage)
    {
        $paginated = $query->cursorPaginate($perPage);
        $dateGroups = $this->buildDateGroups(collect($paginated->items()));
        $pagination = [
            'hasMore' => $paginated->hasMorePages(),
            'nextCursor' => $paginated->nextCursor()?->encode(),
        ];

        if ($request->wantsJson()) {
            return response()->json([
                'dateGroups' => $dateGroups,
                'pagination' => $pagination,
            ]);
        }

        return Inertia::render('Library', [
            'dateGroups' => $dateGroups,
            'pagination' => $pagination,
            'observations' => ['data' => []],
            'tags' => $tags,
            'filters' => $request->only(['q', 'tag', 'view']),
            'viewMode' => 'date',
            'categories' => $this->getCategoriesForFrontend(),
        ]);
    }

    /**
     * Category view: grid (counts + previews) or detail (paginated observations).
     */
    private function indexCategory(Request $request, $query, $tags, int $perPage)
    {
        $categories = $this->getCategoriesForFrontend();
        $filters = $request->only(['q', 'tag', 'view', 'category']);

        // カテゴリ詳細: 特定カテゴリの観察をページネーション
        if ($request->filled('category')) {
            $query->forCategory($request->category);
            $paginated = $query->cursorPaginate($perPage);
            $pagination = [
                'hasMore' => $paginated->hasMorePages(),
                'nextCursor' => $paginated->nextCursor()?->encode(),
            ];

            if ($request->wantsJson()) {
                return response()->json([
                    'observations' => collect($paginated->items())->values(),
                    'pagination' => $pagination,
                ]);
            }

            return Inertia::render('Library', [
                'observations' => ['data' => $paginated->items()],
                'pagination' => $pagination,
                'tags' => $tags,
                'filters' => $filters,
                'viewMode' => 'category',
                'categories' => $categories,
                'categoryCounts' => $this->buildCategoryCountsFromQuery($request),
            ]);
        }

        // カテゴリ一覧: 件数 + プレビュー3件
        $categoryCounts = $this->buildCategoryCountsFromQuery($request);
        $categoryPreviews = $this->buildCategoryPreviews($request, 3);

        return Inertia::render('Library', [
            'observations' => ['data' => []],
            'tags' => $tags,
            'filters' => $filters,
            'viewMode' => 'category',
            'categories' => $categories,
            'categoryCounts' => $categoryCounts,
            'categoryPreviews' => $categoryPreviews,
        ]);
    }

    /**
     * Map view: all observations with location (no pagination).
     */
    private function indexMap(Request $request, $query, $tags)
    {
        $observations = $query->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();

        return Inertia::render('Library', [
            'observations' => ['data' => $observations],
            'tags' => $tags,
            'filters' => $request->only(['q', 'tag', 'view']),
            'viewMode' => 'map',
            'categories' => $this->getCategoriesForFrontend(),
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
            $label = $date->format('Y年n月');

            if (! isset($groups[$yearMonth])) {
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
     * Build category counts via GROUP BY query (lightweight).
     */
    private function buildCategoryCountsFromQuery(Request $request): array
    {
        $query = Observation::forUser(auth()->id());

        if ($request->filled('q')) {
            $query->search($request->q);
        }
        if ($request->filled('tag')) {
            $query->withTag($request->tag);
        }

        $raw = $query->selectRaw('COALESCE(category, ?) as cat, count(*) as cnt', ['other'])
            ->groupBy('cat')
            ->pluck('cnt', 'cat')
            ->toArray();

        $counts = [];
        foreach (config('categories') as $cat) {
            $counts[$cat['id']] = $raw[$cat['id']] ?? 0;
        }

        return $counts;
    }

    /**
     * Build category previews (N thumbnails per category, lightweight).
     */
    private function buildCategoryPreviews(Request $request, int $limit): array
    {
        $previews = [];
        foreach (config('categories') as $cat) {
            $query = Observation::forUser(auth()->id())
                ->forCategory($cat['id'])
                ->latest()
                ->limit($limit);

            if ($request->filled('q')) {
                $query->search($request->q);
            }
            if ($request->filled('tag')) {
                $query->withTag($request->tag);
            }

            // サムネイル用の最小限データのみ返す
            $previews[$cat['id']] = $query->get()->map(fn ($obs) => [
                'id' => $obs->id,
                'thumb_url' => $obs->thumb_url,
                'status' => $obs->status,
                'title' => $obs->title,
                'category' => $obs->category,
            ])->values()->all();
        }

        return $previews;
    }

    /**
     * Get categories formatted for frontend (id, name, color).
     */
    private function getCategoriesForFrontend(): array
    {
        return collect(config('categories'))->map(fn ($c) => [
            'id' => $c['id'],
            'name' => $c['name'],
            'color' => $c['color'],
        ])->all();
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
            'categories' => $this->getCategoriesForFrontend(),
        ]);
    }

    /**
     * Stream observation status changes via Server-Sent Events.
     */
    public function stream(Observation $observation)
    {
        $this->authorize('view', $observation);

        return response()->stream(function () use ($observation) {
            $start = time();

            while (true) {
                if (connection_aborted()) {
                    break;
                }

                if (time() - $start > 90) {
                    echo "event: timeout\ndata: {}\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                $obs = $observation->fresh();

                if ($obs->status === 'ready') {
                    echo "event: ready\ndata: {}\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                if ($obs->status === 'failed') {
                    echo "event: failed\ndata: ".json_encode([
                        'error_message' => $obs->error_message,
                    ])."\n\n";
                    ob_flush();
                    flush();
                    break;
                }

                echo ": heartbeat\n\n";
                ob_flush();
                flush();

                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    /**
     * Retry failed observation.
     */
    public function retry(Observation $observation)
    {
        $this->authorize('retry', $observation);

        $this->retryAction->execute($observation);

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

        $this->updateTagsAction->execute($observation, $request->validated('tags') ?? []);

        if ($request->wantsJson()) {
            $observation->load('tags');

            return response()->json(['tags' => $observation->tags->pluck('name')]);
        }

        return back();
    }

    /**
     * Update observation category.
     */
    public function updateCategory(UpdateObservationCategoryRequest $request, Observation $observation)
    {
        $this->authorize('update', $observation);

        $observation->update($request->validated());

        if ($request->wantsJson()) {
            return response()->json(['category' => $observation->category]);
        }

        return back();
    }
}
