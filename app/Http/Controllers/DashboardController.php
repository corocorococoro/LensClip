<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Display the dashboard/home page with stats and recent observations.
     */
    public function index()
    {
        $userId = auth()->id();

        $today = Observation::forUser($userId)
            ->whereDate('created_at', today())
            ->count();

        $total = Observation::forUser($userId)->count();

        $recent = Observation::forUser($userId)
            ->ready()
            ->latest()
            ->take(3)
            ->get();

        return Inertia::render('Home', [
            'stats' => [
                'today' => $today,
                'total' => $total,
            ],
            'recent' => $recent,
        ]);
    }
}
