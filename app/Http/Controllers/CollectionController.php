<?php

namespace App\Http\Controllers;

use App\Models\Collection;
use App\Models\Observation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CollectionController extends Controller
{
    /**
     * Display a listing of collections.
     */
    public function index()
    {
        $collections = Collection::forUser(auth()->id())
            ->with([
                'coverObservation',
                'observations' => function ($q) {
                    $q->take(4);
                }
            ])
            ->withCount('observations')
            ->latest()
            ->get();

        return Inertia::render('Collections/Index', [
            'collections' => $collections,
        ]);
    }

    /**
     * Store a new collection.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $collection = Collection::create([
            'user_id' => auth()->id(),
            'name' => $request->name,
        ]);

        if ($request->wantsJson()) {
            return response()->json($collection, 201);
        }

        return redirect()->route('collections.show', $collection);
    }

    /**
     * Display the specified collection.
     */
    public function show(Collection $collection)
    {
        $this->authorize('view', $collection);

        $collection->load([
            'observations' => function ($q) {
                $q->with('tags')->orderByPivot('position');
            }
        ]);

        return Inertia::render('Collections/Show', [
            'collection' => $collection,
        ]);
    }

    /**
     * Update the specified collection.
     */
    public function update(Request $request, Collection $collection)
    {
        $this->authorize('update', $collection);

        $request->validate([
            'name' => 'sometimes|string|max:100',
            'cover_observation_id' => 'sometimes|nullable|uuid|exists:observations,id',
        ]);

        $collection->update($request->only(['name', 'cover_observation_id']));

        if ($request->wantsJson()) {
            return response()->json($collection);
        }

        return back();
    }

    /**
     * Remove the specified collection.
     */
    public function destroy(Collection $collection)
    {
        $this->authorize('delete', $collection);

        $collection->delete();

        if (request()->wantsJson()) {
            return response()->json(null, 204);
        }

        return redirect()->route('collections.index');
    }

    /**
     * Add an observation to the collection.
     */
    public function addObservation(Request $request, Collection $collection)
    {
        $this->authorize('update', $collection);

        $request->validate([
            'observation_id' => 'required|uuid|exists:observations,id',
        ]);

        // Verify observation belongs to user
        $observation = Observation::where('id', $request->observation_id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        // Get max position
        $maxPosition = $collection->observations()->max('position') ?? 0;

        // Attach if not already attached
        if (!$collection->observations()->where('observation_id', $observation->id)->exists()) {
            $collection->observations()->attach($observation->id, [
                'position' => $maxPosition + 1,
            ]);
        }

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return back();
    }

    /**
     * Remove an observation from the collection.
     */
    public function removeObservation(Collection $collection, Observation $observation)
    {
        $this->authorize('update', $collection);

        $collection->observations()->detach($observation->id);

        if (request()->wantsJson()) {
            return response()->json(null, 204);
        }

        return back();
    }
}
