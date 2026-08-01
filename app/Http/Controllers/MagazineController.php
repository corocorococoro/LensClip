<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use App\Support\CategoryCatalog;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class MagazineController extends Controller
{
    /**
     * 号のアーカイブ一覧。ready な発見が 1 件以上ある月だけを号として列挙する。
     */
    public function index()
    {
        $observations = Observation::forUser(auth()->id())
            ->ready()
            ->orderBy('created_at')
            ->get(['id', 'created_at', 'milestones', 'thumb_path', 'title']);

        $issues = $observations
            ->groupBy(fn (Observation $obs) => $obs->created_at->format('Y-m'))
            ->map(function ($monthObservations, string $yearMonth) {
                $cover = $this->pickCover($monthObservations);

                return [
                    'yearMonth' => $yearMonth,
                    'label' => $monthObservations->first()->created_at->format('Y年n月'),
                    'count' => $monthObservations->count(),
                    'coverThumbUrl' => $cover?->thumb_url,
                ];
            })
            ->sortKeysDesc()
            ->values()
            ->all();

        return Inertia::render('Magazine/Index', [
            'issues' => $issues,
        ]);
    }

    /**
     * 「YYYY年M月号」。掲載は ready のみ、しらべ中は件数を注記して隠さない。
     * 未来月・不正な月は 404。過去の 0 件月は空状態で表示する(オーナー自身の URL 操作)。
     */
    public function show(string $yearMonth)
    {
        [$year, $month] = array_map('intval', explode('-', $yearMonth));
        if ($month < 1 || $month > 12) {
            abort(404);
        }

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        if ($start->greaterThan(now()->startOfMonth())) {
            abort(404);
        }
        $end = $start->copy()->endOfMonth();

        $userId = auth()->id();

        $observations = Observation::forUser($userId)
            ->ready()
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get();

        $processingCount = Observation::forUser($userId)
            ->processing()
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $totalReadyCount = Observation::forUser($userId)->ready()->count();

        $cover = $this->pickCover($observations);

        $categoryBreakdown = $observations
            ->filter(fn (Observation $obs) => $obs->category !== null)
            ->countBy('category')
            ->sortDesc();
        $categoryDefinitions = collect(CategoryCatalog::forFrontend())->keyBy('id');

        return Inertia::render('Magazine/Show', [
            'yearMonth' => $yearMonth,
            'label' => $start->format('Y年n月'),
            'isCurrentMonth' => $start->isSameMonth(now()),
            'isEmpty' => $observations->isEmpty(),
            'cover' => $cover === null ? null : [
                'id' => $cover->id,
                'image_url' => $cover->original_url ?? $cover->thumb_url,
                'title' => $cover->title,
            ],
            'entries' => $observations->map(fn (Observation $obs) => $this->toEntry($obs))->values()->all(),
            'categoryBreakdown' => $categoryBreakdown
                ->map(fn (int $count, string $categoryId) => [
                    'id' => $categoryId,
                    'name' => $categoryDefinitions[$categoryId]['name'] ?? $categoryId,
                    'color' => $categoryDefinitions[$categoryId]['color'] ?? '#94a3b8',
                    'count' => $count,
                ])
                ->values()
                ->all(),
            'processingCount' => $processingCount,
            'totalReadyCount' => $totalReadyCount,
            'categories' => CategoryCatalog::forFrontend(),
        ]);
    }

    /**
     * 表紙の代表写真。印刷のたびに変わらないよう決定的に選ぶ:
     * 節目つきの最古の記録 → なければ月内最初の記録。
     */
    private function pickCover($observations): ?Observation
    {
        return $observations->first(fn (Observation $obs) => ! empty($obs->milestones))
            ?? $observations->first();
    }

    /**
     * 誌面に必要な最小限の属性だけを返す(ai_json 全体を露出させない)。
     * 本文が無い記録に既定文は入れず、写真と名前だけで載せる。
     */
    private function toEntry(Observation $obs): array
    {
        return [
            'id' => $obs->id,
            'image_url' => $obs->original_url ?? $obs->thumb_url,
            'date' => $obs->created_at->format('n月j日'),
            'title' => $obs->title,
            'category' => $obs->category,
            'description' => $obs->kid_friendly ?? ($obs->fun_facts[0] ?? null),
            'milestones' => $obs->milestones ?? [],
        ];
    }
}
