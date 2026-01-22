<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTagRequest;
use App\Models\Tag;

class TagController extends Controller
{
    /**
     * Get all tags for the current user.
     */
    public function index()
    {
        $tags = Tag::forUser(auth()->id())
            ->withCount('observations')
            ->orderBy('name')
            ->get();

        return response()->json($tags);
    }

    /**
     * Store a new tag.
     */
    public function store(StoreTagRequest $request)
    {
        $validated = $request->validated();

        $tag = Tag::firstOrCreate(
            ['user_id' => auth()->id(), 'name' => $validated['name']],
            ['user_id' => auth()->id(), 'name' => $validated['name']]
        );

        return response()->json($tag, 201);
    }

    /**
     * Delete a tag.
     */
    public function destroy(Tag $tag)
    {
        if ($tag->user_id !== auth()->id()) {
            abort(403);
        }

        $tag->delete();

        return response()->json(null, 204);
    }
}
