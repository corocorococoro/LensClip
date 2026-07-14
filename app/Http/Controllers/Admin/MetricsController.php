<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Observation;
use App\Models\User;
use Inertia\Inertia;

class MetricsController extends Controller
{
    private const FUNNEL_WEEKS = 8;

    private const RETENTION_DAYS = [1, 7, 30];

    /**
     * Display product metrics derived from existing tables.
     */
    public function index()
    {
        return Inertia::render('Admin/Metrics', [
            'funnel' => $this->buildWeeklyFunnel(),
            'retention' => $this->buildRetention(),
            'usage' => $this->buildMonthlyUsage(),
            'aiCost' => $this->buildAiCost(),
        ]);
    }

    /**
     * Weekly registration cohorts: registered -> first observation -> second observation.
     */
    private function buildWeeklyFunnel(): array
    {
        $since = now()->startOfWeek()->subWeeks(self::FUNNEL_WEEKS - 1);

        $users = User::where('created_at', '>=', $since)->get(['id', 'created_at']);

        // 削除済みの記録も「記録した」行動として集計に含める
        $observationCounts = Observation::withTrashed()
            ->whereIn('user_id', $users->pluck('id'))
            ->selectRaw('user_id, count(*) as cnt')
            ->groupBy('user_id')
            ->pluck('cnt', 'user_id');

        $weeks = [];
        for ($i = self::FUNNEL_WEEKS - 1; $i >= 0; $i--) {
            $weekStart = now()->startOfWeek()->subWeeks($i);
            $weekEnd = $weekStart->copy()->endOfWeek();

            $cohort = $users->filter(
                fn ($u) => $u->created_at->between($weekStart, $weekEnd)
            );

            $registered = $cohort->count();
            $first = $cohort->filter(fn ($u) => ($observationCounts[$u->id] ?? 0) >= 1)->count();
            $second = $cohort->filter(fn ($u) => ($observationCounts[$u->id] ?? 0) >= 2)->count();

            $weeks[] = [
                'weekStart' => $weekStart->format('Y-m-d'),
                'registered' => $registered,
                'firstObservation' => $first,
                'secondObservation' => $second,
            ];
        }

        return $weeks;
    }

    /**
     * D1/D7/D30 retention, approximated by "created an observation on day N after registration".
     */
    private function buildRetention(): array
    {
        $users = User::get(['id', 'created_at']);

        $activityDates = Observation::withTrashed()
            ->selectRaw('user_id, date(created_at) as activity_date')
            ->distinct()
            ->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('activity_date')->flip());

        $retention = [];
        foreach (self::RETENTION_DAYS as $n) {
            $eligible = 0;
            $retained = 0;

            foreach ($users as $user) {
                $registrationDay = $user->created_at->copy()->startOfDay();
                $targetDay = $registrationDay->copy()->addDays($n);

                // 対象日が丸一日経過しているユーザーだけを分母にする
                if (! $targetDay->isBefore(today())) {
                    continue;
                }

                $eligible++;

                $dates = $activityDates[$user->id] ?? collect();
                if ($dates->has($targetDay->format('Y-m-d'))) {
                    $retained++;
                }
            }

            $retention[] = [
                'day' => $n,
                'eligible' => $eligible,
                'retained' => $retained,
            ];
        }

        return $retention;
    }

    /**
     * Distribution of analyses per user for the current month.
     */
    private function buildMonthlyUsage(): array
    {
        $start = now()->startOfMonth();

        $counts = Observation::withTrashed()
            ->where('created_at', '>=', $start)
            ->selectRaw('user_id, count(*) as cnt')
            ->groupBy('user_id')
            ->pluck('cnt')
            ->sort()
            ->values();

        return [
            'month' => $start->format('Y-m'),
            'activeUsers' => $counts->count(),
            'totalAnalyses' => (int) $counts->sum(),
            'median' => $this->percentile($counts, 50),
            'p90' => $this->percentile($counts, 90),
            'max' => (int) ($counts->last() ?? 0),
        ];
    }

    /**
     * Estimated AI cost for the current month, by model. Models without a
     * configured unit cost are listed without an amount (no guessed defaults).
     */
    private function buildAiCost(): array
    {
        $start = now()->startOfMonth();
        $unitCosts = config('ai_costs.per_analysis_jpy', []);

        $byModel = Observation::withTrashed()
            ->where('created_at', '>=', $start)
            ->whereNotNull('gemini_model')
            ->selectRaw('gemini_model, count(*) as cnt')
            ->groupBy('gemini_model')
            ->pluck('cnt', 'gemini_model');

        $rows = [];
        $total = 0.0;
        $hasMissingUnitCost = false;

        foreach ($byModel as $model => $count) {
            $unit = $unitCosts[$model] ?? null;
            $subtotal = $unit !== null ? round($unit * $count, 2) : null;

            if ($subtotal !== null) {
                $total += $subtotal;
            } else {
                $hasMissingUnitCost = true;
            }

            $rows[] = [
                'model' => $model,
                'count' => (int) $count,
                'unitJpy' => $unit,
                'subtotalJpy' => $subtotal,
            ];
        }

        return [
            'month' => $start->format('Y-m'),
            'models' => $rows,
            'totalJpy' => round($total, 2),
            'hasMissingUnitCost' => $hasMissingUnitCost,
        ];
    }

    private function percentile($sortedValues, int $percent): int
    {
        if ($sortedValues->isEmpty()) {
            return 0;
        }

        $index = (int) ceil($sortedValues->count() * $percent / 100) - 1;

        return (int) $sortedValues->get(max(0, $index));
    }
}
