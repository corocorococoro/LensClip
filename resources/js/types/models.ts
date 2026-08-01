/**
 * 共通モデル型定義
 * 全ページで使用される型を一元管理
 */

// タグ
export interface Tag {
    id: number;
    name: string;
}

// 観察記録のステータス
export type ObservationStatus = 'processing' | 'ready' | 'failed';

// カテゴリID
export type CategoryId = 'animal' | 'insect' | 'plant' | 'food' | 'vehicle' | 'place' | 'tool' | 'other';

// 節目（初めて ready になった時に一度だけ付与される履歴）
export type Milestone =
    | { type: 'first_discovery' }
    | { type: 'first_category'; category: CategoryId }
    | { type: 'count'; value: number };

// 観察記録（リスト用・軽量版）
export interface ObservationSummary {
    id: string;
    title: string;
    thumb_url: string | null;
    status: ObservationStatus;
    tags?: Tag[];
    created_at?: string;
    category?: CategoryId | null;
    latitude?: number | null;
    longitude?: number | null;
    milestones?: Milestone[] | null;
}

// 表示モード
export type LibraryViewMode = 'date' | 'category' | 'map';

// カテゴリ定義
export interface CategoryDefinition {
    id: CategoryId;
    name: string;
    color: string;
}

// 日付グループ
export interface DateGroup {
    yearMonth: string;
    label: string;
    observations: ObservationSummary[];
}

// カテゴリグループ
export interface CategoryGroup {
    category: CategoryDefinition;
    count: number;
    observations: ObservationSummary[];
}

// ページネーション情報（カーソルベース）
export interface CursorPagination {
    hasMore: boolean;
    nextCursor: string | null;
}

// カテゴリプレビュー（グリッド表示用）
export type CategoryPreviews = Record<string, ObservationSummary[]>;

// 観察記録（詳細用・フル版）
export interface Observation extends ObservationSummary {
    summary: string;
    kid_friendly: string;
    confidence: number;
    selected_candidate_index?: number | null;
    original_url: string | null;
    cropped_url: string | null;
    ai_json: ObservationAIJson | null;
    created_at: string;
    error_message?: string;
    gemini_model?: string;
    latitude?: number | null;
    longitude?: number | null;
}

// AI解析結果
export interface ObservationAIJson {
    fun_facts?: string[];
    safety_notes?: string[];
    questions?: string[];
    category?: CategoryId | null;
    candidate_cards?: CandidateCard[];
}

// 候補カード（タップ切替用）
export interface CandidateCard {
    name: string;
    english_name?: string;
    confidence: number;
    summary: string;
    kid_friendly: string;
    look_for?: string[];
    fun_facts?: string[];
    questions?: string[];
    tags?: string[];
}

// ホームページの統計
export interface HomeStats {
    today: number;
    total: number;
    processing: number;
}

// 振り返り「あのときの発見」
export interface LookbackHighlight {
    label: string;
    observation: ObservationSummary;
}

// 月刊マイずかん: 号のアーカイブ1件
export interface MagazineIssueSummary {
    yearMonth: string;
    label: string;
    count: number;
    coverThumbUrl: string | null;
}

// 月刊マイずかん: 誌面の1エントリ(サーバー側で最小属性に map 済み)
export interface MagazineEntry {
    id: string;
    image_url: string | null;
    date: string;
    title: string | null;
    category: CategoryId | null;
    description: string | null;
    milestones: Milestone[];
}

// 月刊マイずかん: 裏表紙のカテゴリ内訳
export interface MagazineCategoryBreakdown {
    id: CategoryId;
    name: string;
    color: string;
    count: number;
}

// Home の月刊マイずかん導線
export interface MagazineTeaser {
    yearMonth: string;
    label: string;
    count: number;
}

// はかせクイズの1問(サーバー側で最小属性に map 済み)
export interface QuizQuestion {
    id: string;
    image_url: string | null;
    title: string;
    kid_friendly: string | null;
    fun_fact: string | null;
    english_name: string | null;
    category: CategoryId | null;
}
