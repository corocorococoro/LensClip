<?php

namespace Tests\Feature;

use App\Models\Observation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class QuizTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('quiz'))->assertRedirect(route('login'));
    }

    public function test_only_own_ready_titled_observations_are_eligible(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $own = Observation::factory()->count(3)->create(['user_id' => $user->id]);
        // 出題対象外: 他ユーザー / processing / failed / title 未確定
        Observation::factory()->count(3)->create(['user_id' => $other->id]);
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'processing']);
        Observation::factory()->create(['user_id' => $user->id, 'status' => 'failed']);
        Observation::factory()->create(['user_id' => $user->id, 'title' => null]);

        $response = $this->actingAs($user)->get(route('quiz'));

        $response->assertOk();
        $response->assertInertia(function (Assert $page) use ($own) {
            $page->component('Quiz')
                ->where('eligibleCount', 3)
                ->has('questions', 3);

            $questions = collect($page->toArray()['props']['questions']);
            $this->assertEqualsCanonicalizing(
                $own->pluck('id')->all(),
                $questions->pluck('id')->all(),
            );

            return $page;
        });
    }

    public function test_empty_state_when_fewer_than_three_eligible(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(2)->create(['user_id' => $user->id]);

        $this->actingAs($user)->get(route('quiz'))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page) => $page
                    ->component('Quiz')
                    ->where('eligibleCount', 2)
                    ->has('questions', 0)
            );
    }

    public function test_returns_at_most_five_questions(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(8)->create(['user_id' => $user->id]);

        $this->actingAs($user)->get(route('quiz'))
            ->assertOk()
            ->assertInertia(
                fn (Assert $page) => $page
                    ->where('eligibleCount', 8)
                    ->has('questions', 5)
            );
    }

    public function test_category_filter_limits_questions(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(4)->create(['user_id' => $user->id, 'category' => 'insect']);
        Observation::factory()->count(4)->create(['user_id' => $user->id, 'category' => 'plant']);

        $this->actingAs($user)->get(route('quiz', ['category' => 'insect']))
            ->assertOk()
            ->assertInertia(function (Assert $page) {
                $page->where('eligibleCount', 4)->has('questions', 4);

                foreach ($page->toArray()['props']['questions'] as $question) {
                    $this->assertSame('insect', $question['category']);
                }

                return $page;
            });
    }

    public function test_invalid_category_is_rejected(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->get(route('quiz', ['category' => 'not-a-category']))
            ->assertSessionHasErrors('category');
    }

    public function test_question_payload_is_minimal_and_does_not_leak_ai_json(): void
    {
        $user = User::factory()->create();
        Observation::factory()->count(3)->create([
            'user_id' => $user->id,
            'ai_json' => [
                'fun_facts' => ['まめちしき'],
                'safety_notes' => ['さわらないでね'],
                'questions' => ['なにいろかな?'],
            ],
        ]);

        $response = $this->actingAs($user)->get(route('quiz'));

        $response->assertInertia(function (Assert $page) {
            foreach ($page->toArray()['props']['questions'] as $question) {
                $this->assertEqualsCanonicalizing(
                    ['id', 'image_url', 'title', 'kid_friendly', 'fun_fact', 'english_name', 'category'],
                    array_keys($question),
                );
                $this->assertSame('まめちしき', $question['fun_fact']);
            }

            return $page;
        });
    }

    public function test_english_name_prefers_selected_candidate_card(): void
    {
        $user = User::factory()->create();

        Observation::factory()->create([
            'user_id' => $user->id,
            'selected_candidate_index' => 1,
            'ai_json' => [
                'candidate_cards' => [
                    ['name' => 'モンシロチョウ', 'english_name' => 'Cabbage White'],
                    ['name' => 'モンキチョウ', 'english_name' => 'Eastern Pale Clouded Yellow'],
                ],
            ],
        ]);
        Observation::factory()->count(2)->create([
            'user_id' => $user->id,
            'ai_json' => [
                'candidate_cards' => [
                    ['name' => 'タンポポ', 'english_name' => 'Dandelion'],
                ],
            ],
        ]);

        $response = $this->actingAs($user)->get(route('quiz'));

        $response->assertInertia(function (Assert $page) {
            $englishNames = collect($page->toArray()['props']['questions'])->pluck('english_name');
            $this->assertContains('Eastern Pale Clouded Yellow', $englishNames);
            $this->assertNotContains('Cabbage White', $englishNames);

            return $page;
        });
    }
}
