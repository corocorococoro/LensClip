# LensClip テスト計画

## テスト方針
- **Feature テスト**: 主要ユースケースをカバー（APIレベル）
- **Unit テスト**: ビジネスロジック（bbox選定、crop計算）
- **ブラウザテスト**: 主要導線の動作確認（手動 or Dusk）

---

## Feature テスト

### 1. Observation 作成→ready遷移
**ファイル**: `tests/Feature/ObservationCreateTest.php`

```php
/** @test */
public function user_can_create_observation_and_it_becomes_ready()
{
    // Given: 認証済みユーザー
    // When: 画像をアップロード
    // Then: status=processing で作成される
    // And: Jobを実行
    // Then: status=ready になり、title/kid_friendlyが設定される
}
```

**実行方法**:
```bash
php artisan test --filter=ObservationCreateTest
```

---

### 2. 失敗→リトライ
**ファイル**: `tests/Feature/ObservationRetryTest.php`

```php
/** @test */
public function user_can_retry_failed_observation()
{
    // Given: status=failed の Observation
    // When: POST /observations/{id}/retry
    // Then: status=processing に戻る
    // And: Jobが再投入される
}
```

---

### 3. タグ付け・検索
**ファイル**: `tests/Feature/ObservationTagTest.php`

```php
/** @test */
public function observations_can_be_filtered_by_tag()
{
    // Given: タグ付きObservationが複数ある
    // When: GET /library?tag=植物
    // Then: 該当タグのObservationのみ返る
}

/** @test */
public function observations_can_be_searched_by_title()
{
    // Given: title="チューリップ" のObservation
    // When: GET /library?q=チューリップ
    // Then: 該当Observationが返る
}
```

---

### 4. 全削除
**ファイル**: `tests/Feature/ObservationDeleteAllTest.php`

```php
/** @test */
public function user_can_delete_all_observations()
{
    // Given: ユーザーが複数のObservationを持つ
    // When: DELETE /observations {confirm: true}
    // Then: 全Observationが削除される
    // And: 画像ファイルも削除される
}

/** @test */
public function delete_all_requires_confirmation()
{
    // When: DELETE /observations (confirmなし)
    // Then: 422 エラー
}
```

---

### 5. 管理者アクセス制御
**ファイル**: `tests/Feature/AdminAccessTest.php`

```php
/** @test */
public function unauthenticated_user_cannot_access_admin()
{
    // When: GET /admin/logs (未認証)
    // Then: ログイン画面へリダイレクト
}

/** @test */
public function regular_user_cannot_access_admin()
{
    // Given: role=user のユーザー
    // When: GET /admin/logs
    // Then: 403 Forbidden
}

/** @test */
public function admin_can_access_admin_pages()
{
    // Given: role=admin のユーザー
    // When: GET /admin/logs
    // Then: 200 OK
}
```

---

### 6. AI設定変更
**ファイル**: `tests/Feature/AiSettingsTest.php`

```php
/** @test */
public function admin_can_update_gemini_model()
{
    // Given: role=admin のユーザー
    // When: PUT /admin/settings/ai {model: 'gemini-1.5-flash'}
    // Then: 設定が保存される
}

/** @test */
public function invalid_model_is_rejected()
{
    // When: PUT /admin/settings/ai {model: 'invalid-model'}
    // Then: 422 エラー
}
```

---

## Unit テスト

### 1. bbox選定ロジック
**ファイル**: `tests/Unit/BboxSelectorTest.php`

```php
/** @test */
public function selects_highest_scoring_bbox()
{
    $objects = [
        ['name' => 'Dog', 'score' => 0.9, 'bbox' => [...], 'area' => 0.3, 'centerDist' => 0.2],
        ['name' => 'Cat', 'score' => 0.7, 'bbox' => [...], 'area' => 0.5, 'centerDist' => 0.1],
    ];
    
    // 合成スコアで1件選定
    $selected = BboxSelector::select($objects, $imageWidth, $imageHeight);
    
    // 期待: 合成スコアが最も高いもの
}

/** @test */
public function returns_null_when_no_objects()
{
    $selected = BboxSelector::select([], 1024, 768);
    $this->assertNull($selected);
}
```

---

### 2. Crop計算（マージン・クリップ）
**ファイル**: `tests/Unit/CropCalculatorTest.php`

```php
/** @test */
public function applies_margin_and_clips_to_image_bounds()
{
    // Given: 画像 1000x800, bbox at x=100, y=100, w=300, h=200
    // When: 10%マージン適用
    // Then: x=70, y=80, w=360, h=240 (マージン拡張)
    // And: 画像端でクリップ
}

/** @test */
public function clips_bbox_at_image_edges()
{
    // Given: bbox が画像端に近い
    // When: マージン適用
    // Then: はみ出し部分がクリップされる
}
```

---

## ブラウザテスト（手動）

### 主要導線
1. **ログイン** → ダッシュボード表示
2. **撮影ボタン** → カメラ or ファイル選択 → プレビュー
3. **送信** → Processing表示 → 結果表示
4. **保存** → ライブラリに表示
5. **検索** → フィルタ結果表示

### 確認観点
- [ ] モバイルでのタッチ操作
- [ ] カメラ起動（iOS/Android）
- [ ] Processing中のスピナー表示
- [ ] エラー時のリトライボタン
- [ ] 画像の表示速度

---

## 実行コマンド

```bash
# 全テスト実行
php artisan test

# Featureテストのみ
php artisan test tests/Feature

# Unitテストのみ
php artisan test tests/Unit

# 特定テスト
php artisan test --filter=ObservationCreateTest

# カバレッジ（Xdebug必要）
php artisan test --coverage
```
