<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use App\Support\ObservationSummary;
use Inertia\Inertia;

class DashboardController extends Controller
{
    // 「過去の発見」とみなす最低経過日数。直近の記録ばかりが振り返りに出ないようにする
    private const LOOKBACK_MIN_AGE_DAYS = 14;

    // 「1年前のきょう」「1か月前」の日付窓(±日数)
    private const LOOKBACK_DATE_WINDOW_DAYS = 3;

    /**
     * Display the dashboard/home page with stats and recent observations.
     */
    public function index()
    {
        $userId = auth()->id();

        return Inertia::render('Home', [
            'stats' => fn () => [
                'today' => Observation::forUser($userId)->whereDate('created_at', today())->count(),
                'total' => Observation::forUser($userId)->count(),
                'processing' => Observation::forUser($userId)->processing()->count(),
            ],
            'recent' => fn () => Observation::forUser($userId)
                ->select(ObservationSummary::COLUMNS)
                ->whereIn('status', ['processing', 'ready'])
                ->orderByRaw("case when status = 'processing' then 0 else 1 end")
                ->latest()->orderByDesc('id')->take(3)->get()
                ->map(fn (Observation $observation) => ObservationSummary::from($observation)),
            'lookback' => fn () => $this->buildLookback($userId),
            'quizAvailable' => fn () => Observation::forUser($userId)->ready()
                ->whereNotNull('title')->count() >= QuizController::MIN_ELIGIBLE,
            'magazine' => fn () => $this->buildMagazineTeaser($userId),
        ]);
    }

    /**
     * Pick one past discovery to resurface, falling back through sources so
     * that any user with a reviewable past always gets something:
     * ①1年前のきょう → ②1か月前 → ③同じ季節 → ④直近の記録の座標の近く → ⑤最初の発見
     */
    private function buildLookback(int|string $userId): ?array
    {
        $past = fn () => Observation::forUser($userId)
            ->select(ObservationSummary::COLUMNS)
            ->ready()
            ->where('created_at', '<=', now()->subDays(self::LOOKBACK_MIN_AGE_DAYS));

        // ① 1年前のきょう(±数日)
        $observation = $past()
            ->whereBetween('created_at', $this->dateWindow(now()->subYear()))
            ->latest()
            ->first();
        if ($observation) {
            return ['label' => '1年前のきょう', 'observation' => ObservationSummary::from($observation)];
        }

        // ② 1か月前(±数日)
        $observation = $past()
            ->whereBetween('created_at', $this->dateWindow(now()->subMonthNoOverflow()))
            ->latest()
            ->first();
        if ($observation) {
            return ['label' => '1か月前の はっけん', 'observation' => ObservationSummary::from($observation)];
        }

        // ③ 同じ季節の過去の発見
        $seasonMonths = $this->seasonMonths((int) now()->month);
        $observation = $past()
            ->where(function ($query) use ($seasonMonths) {
                foreach ($seasonMonths as $i => $month) {
                    $i === 0
                        ? $query->whereMonth('created_at', $month)
                        : $query->orWhereMonth('created_at', $month);
                }
            })
            ->latest()
            ->first();
        if ($observation) {
            return ['label' => 'おなじ きせつの はっけん', 'observation' => ObservationSummary::from($observation)];
        }

        // ④ 直近の記録の保存済み座標の近く(クライアントの現在地はページ生成時に使えない)
        $anchor = Observation::forUser($userId)
            ->ready()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->latest()
            ->first();
        if ($anchor) {
            $delta = 0.005; // 緯度経度およそ±500m
            $observation = $past()
                ->whereKeyNot($anchor->id)
                ->whereBetween('latitude', [$anchor->latitude - $delta, $anchor->latitude + $delta])
                ->whereBetween('longitude', [$anchor->longitude - $delta, $anchor->longitude + $delta])
                ->latest()
                ->first();
            if ($observation) {
                return ['label' => 'この ばしょの ちかくの はっけん', 'observation' => ObservationSummary::from($observation)];
            }
        }

        // ⑤ いちばん最初の発見
        $observation = $past()->oldest()->first();
        if ($observation) {
            return ['label' => 'いちばん さいしょの はっけん', 'observation' => ObservationSummary::from($observation)];
        }

        return null;
    }

    /**
     * 月刊マイずかんの導線。当月に ready な発見があれば当月号、
     * なければ前月号、それも無ければ導線を出さない(null)。
     */
    private function buildMagazineTeaser(int|string $userId): ?array
    {
        $months = [now()->startOfMonth(), now()->subMonthNoOverflow()->startOfMonth()];

        foreach ($months as $start) {
            $count = Observation::forUser($userId)
                ->ready()
                ->whereBetween('created_at', [$start, $start->copy()->endOfMonth()])
                ->count();

            if ($count > 0) {
                return [
                    'yearMonth' => $start->format('Y-m'),
                    'label' => $start->format('Y年n月'),
                    'count' => $count,
                ];
            }
        }

        return null;
    }

    private function dateWindow(\Illuminate\Support\Carbon $center): array
    {
        return [
            $center->copy()->subDays(self::LOOKBACK_DATE_WINDOW_DAYS)->startOfDay(),
            $center->copy()->addDays(self::LOOKBACK_DATE_WINDOW_DAYS)->endOfDay(),
        ];
    }

    private function seasonMonths(int $month): array
    {
        return match (true) {
            in_array($month, [3, 4, 5], true) => [3, 4, 5],
            in_array($month, [6, 7, 8], true) => [6, 7, 8],
            in_array($month, [9, 10, 11], true) => [9, 10, 11],
            default => [12, 1, 2],
        };
    }
}
