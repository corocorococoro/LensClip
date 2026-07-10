<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DocumentationStructureTest extends TestCase
{
    public function test_documentation_index_lists_every_document_once(): void
    {
        $documents = collect(glob(base_path('docs/*.md')) ?: [])
            ->map(fn (string $path): string => basename($path))
            ->reject(fn (string $name): bool => $name === 'index.md')
            ->sort()
            ->values()
            ->all();

        $index = file_get_contents(base_path('docs/index.md'));
        $this->assertIsString($index);
        $inventoryStart = strpos($index, '## 文書一覧');
        $inventoryEnd = strpos($index, '## 実装上の一次ソース');
        $this->assertIsInt($inventoryStart);
        $this->assertIsInt($inventoryEnd);
        $inventory = substr($index, $inventoryStart, $inventoryEnd - $inventoryStart);

        preg_match_all(
            '/\[[^\]]+\]\(([^)#]+\.md)(?:#[^)]+)?\)/',
            $inventory,
            $matches,
        );

        $listed = collect($matches[1])
            ->map(fn (string $link): string => basename($link))
            ->sort()
            ->values()
            ->all();

        $this->assertSame($documents, $listed);
    }

    #[DataProvider('markdownFiles')]
    public function test_relative_markdown_links_resolve(string $path): void
    {
        $this->assertFileExists($path);
        $content = file_get_contents($path);
        $this->assertIsString($content);

        preg_match_all('/\[[^\]]*\]\(([^)]+)\)/', $content, $matches);

        foreach ($matches[1] as $link) {
            $link = trim($link, '<>');

            if ($link === '' || preg_match('/^(?:https?:|mailto:|#)/', $link) === 1) {
                continue;
            }

            $target = explode('#', $link, 2)[0];
            $resolved = dirname($path).DIRECTORY_SEPARATOR.$target;

            $this->assertFileExists($resolved, "Broken Markdown link in {$path}: {$link}");
        }
    }

    #[DataProvider('markdownFiles')]
    public function test_markdown_structure_is_well_formed(string $path): void
    {
        $content = file_get_contents($path);
        $this->assertIsString($content);
        $this->assertSame(1, preg_match_all('/^# /m', $content), "{$path} must have exactly one H1");
        $this->assertSame(0, preg_match_all('/^#######/m', $content), "{$path} has an invalid heading level");

        preg_match_all('/^(#{1,6})\s+/m', $content, $headings);
        $previousLevel = 0;

        foreach ($headings[1] as $heading) {
            $level = strlen($heading);
            $this->assertLessThanOrEqual(
                $previousLevel + 1,
                $level,
                "{$path} skips from H{$previousLevel} to H{$level}",
            );
            $previousLevel = $level;
        }

        $this->assertSame(
            0,
            preg_match_all('/^```/m', $content) % 2,
            "{$path} has an unclosed fenced code block",
        );
    }

    #[DataProvider('documentationFiles')]
    public function test_documented_repository_paths_exist(string $path): void
    {
        $content = file_get_contents($path);
        $this->assertIsString($content);
        preg_match_all('/`([^`\n]+)`/', $content, $matches);

        foreach ($matches[1] as $reference) {
            $isRepositoryPath = preg_match(
                '#^(?:(?:app|resources|routes|database|config|tests|docs|railway)/|(?:Dockerfile|compose\.yaml|composer\.json|composer\.lock|package\.json|package-lock\.json|tailwind\.config\.js|\.env\.example|\.dockerignore)$)#',
                $reference,
            ) === 1;

            if (! $isRepositoryPath || str_contains($reference, '*')) {
                continue;
            }

            $this->assertFileExists(
                base_path($reference),
                "Missing repository path referenced by {$path}: {$reference}",
            );
        }
    }

    public static function markdownFiles(): array
    {
        $root = dirname(__DIR__, 2);
        $documents = glob($root.'/docs/*.md') ?: [];
        $skills = glob($root.'/.codex/skills/*/SKILL.md') ?: [];
        $paths = [$root.'/README.md', $root.'/AGENTS.md', ...$documents, ...$skills];

        $cases = [];

        foreach ($paths as $path) {
            $cases[str_replace($root.'/', '', $path)] = [$path];
        }

        return $cases;
    }

    public static function documentationFiles(): array
    {
        $root = dirname(__DIR__, 2);
        $paths = glob($root.'/docs/*.md') ?: [];
        $cases = [];

        foreach ($paths as $path) {
            $cases[str_replace($root.'/', '', $path)] = [$path];
        }

        return $cases;
    }
}
