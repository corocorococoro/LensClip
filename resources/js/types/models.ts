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

// 観察記録（リスト用・軽量版）
export interface ObservationSummary {
    id: string;
    title: string;
    thumb_url: string;
    status: ObservationStatus;
    tags?: Tag[];
}

// 観察記録（詳細用・フル版）
export interface Observation extends ObservationSummary {
    summary: string;
    kid_friendly: string;
    confidence: number;
    original_url: string;
    cropped_url: string | null;
    collections: CollectionSummary[];
    ai_json: ObservationAIJson | null;
    created_at: string;
    error_message?: string;
}

// AI解析結果
export interface ObservationAIJson {
    fun_facts?: string[];
    safety_notes?: string[];
    questions?: string[];
    category?: string;
}

// コレクション（リスト用・軽量版）
export interface CollectionSummary {
    id: string;
    name: string;
}

// コレクション（詳細用・フル版）
export interface Collection extends CollectionSummary {
    cover_url: string | null;
    observations_count: number;
    observations: ObservationSummary[];
}

// ホームページの統計
export interface HomeStats {
    today: number;
    total: number;
}
