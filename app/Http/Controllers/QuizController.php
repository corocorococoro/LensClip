<?php

namespace App\Http\Controllers;

use App\Models\Observation;
use App\Support\CategoryCatalog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class QuizController extends Controller
{
    // 出題に必要な最低件数。少なすぎると同じ写真ばかりでクイズにならない
    public const MIN_ELIGIBLE = 3;

    public const QUESTION_COUNT = 5;

    /**
     * 自分の図鑑からランダムに出題する「はかせクイズ」。
     * 正誤判定は行わず、親子で答え合わせする前提のめくり式。
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', Rule::in(CategoryCatalog::ids())],
        ]);
        $category = $validated['category'] ?? null;

        // title 未確定(???)の記録は出題しない
        $eligible = Observation::forUser(auth()->id())
            ->ready()
            ->whereNotNull('title');

        if ($category !== null) {
            $eligible->forCategory($category);
        }

        $eligibleCount = (clone $eligible)->count();

        $questions = $eligibleCount >= self::MIN_ELIGIBLE
            ? $eligible->inRandomOrder()
                ->limit(self::QUESTION_COUNT)
                ->get()
                ->map(fn (Observation $obs) => $this->toQuestion($obs))
                ->values()
                ->all()
            : [];

        return Inertia::render('Quiz', [
            'questions' => $questions,
            'eligibleCount' => $eligibleCount,
            'categories' => CategoryCatalog::forFrontend(),
            'filters' => ['category' => $category],
        ]);
    }

    /**
     * 出題に必要な最小限の属性だけを返す(ai_json 全体を露出させない)。
     */
    private function toQuestion(Observation $obs): array
    {
        // 英語名は利用者が確定した候補カードを正とする(未確定なら先頭カード)
        $card = $obs->selectedCandidateCard() ?? ($obs->ai_json['candidate_cards'][0] ?? null);

        return [
            'id' => $obs->id,
            'image_url' => $obs->original_url ?? $obs->thumb_url,
            'title' => $obs->title,
            'kid_friendly' => $obs->kid_friendly,
            'fun_fact' => $obs->fun_facts[0] ?? null,
            'english_name' => is_array($card) ? ($card['english_name'] ?? null) : null,
            'category' => $obs->category,
        ];
    }
}
