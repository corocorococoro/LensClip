<?php

namespace App\Support;

class CategoryCatalog
{
    /**
     * config('categories') をフロントエンド向けの最小形 (id / name / color) に変換する。
     */
    public static function forFrontend(): array
    {
        return collect(config('categories'))->map(fn ($c) => [
            'id' => $c['id'],
            'name' => $c['name'],
            'color' => $c['color'],
        ])->all();
    }

    /**
     * 有効なカテゴリ id の一覧。
     */
    public static function ids(): array
    {
        return array_column(config('categories'), 'id');
    }
}
