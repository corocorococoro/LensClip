<?php

namespace App\Http\Controllers;

use App\Models\Tag;
use Illuminate\Http\Request;

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
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:50',
        ]);

        $tag = Tag::firstOrCreate(
            ['user_id' => auth()->id(), 'name' => $request->name],
            ['user_id' => auth()->id(), 'name' => $request->name]
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
