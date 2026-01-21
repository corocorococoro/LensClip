<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;

class LogController extends Controller
{
    /**
     * Sensitive patterns to mask in logs.
     */
    protected array $sensitivePatterns = [
        // API keys
        '/(["\']?(?:api[_-]?key|token|secret|password|authorization)["\']?\s*[:=]\s*)["\']?[^"\'\s,}\]]+["\']?/i' => '$1[MASKED]',
        // Email addresses
        '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i' => '[EMAIL]',
        // Bearer tokens
        '/Bearer\s+[A-Za-z0-9\-_\.]+/i' => 'Bearer [MASKED]',
    ];

    /**
     * Display the log viewer.
     */
    public function index(Request $request)
    {
        $level = $request->get('level', 'all');
        $date = $request->get('date', now()->format('Y-m-d'));
        $page = max(1, (int) $request->get('page', 1));
        $perPage = 50;

        $logs = $this->parseLogs($date, $level, $page, $perPage);

        return Inertia::render('Admin/Logs', [
            'logs' => $logs['entries'],
            'pagination' => [
                'current_page' => $page,
                'has_more' => $logs['hasMore'],
                'total' => $logs['total'],
            ],
            'filters' => [
                'level' => $level,
                'date' => $date,
            ],
            'levels' => ['all', 'emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'],
        ]);
    }

    /**
     * Parse log file for the given date.
     */
    protected function parseLogs(string $date, string $level, int $page, int $perPage): array
    {
        $logPath = storage_path("logs/laravel-{$date}.log");

        if (!File::exists($logPath)) {
            // Try the default laravel.log
            $logPath = storage_path('logs/laravel.log');
        }

        if (!File::exists($logPath)) {
            return ['entries' => [], 'hasMore' => false, 'total' => 0];
        }

        $content = File::get($logPath);
        $entries = $this->parseLogContent($content);

        // Filter by level
        if ($level !== 'all') {
            $entries = array_filter(
                $entries,
                fn($entry) =>
                strtolower($entry['level']) === strtolower($level)
            );
            $entries = array_values($entries);
        }

        // Sort by timestamp descending (newest first)
        usort($entries, fn($a, $b) => strtotime($b['timestamp']) <=> strtotime($a['timestamp']));

        $total = count($entries);
        $offset = ($page - 1) * $perPage;
        $paginatedEntries = array_slice($entries, $offset, $perPage);

        return [
            'entries' => $paginatedEntries,
            'hasMore' => ($offset + $perPage) < $total,
            'total' => $total,
        ];
    }

    /**
     * Parse log file content into structured entries.
     */
    protected function parseLogContent(string $content): array
    {
        $pattern = '/\[(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2})?)\]\s+(\w+)\.(\w+):\s+(.*?)(?=\[\d{4}-\d{2}-\d{2}|\Z)/s';

        preg_match_all($pattern, $content, $matches, PREG_SET_ORDER);

        $entries = [];
        foreach ($matches as $match) {
            $message = $this->maskSensitiveData(trim($match[4]));

            // Split message and stack trace
            $parts = preg_split('/(\n\[stacktrace\]|\n#\d+\s)/', $message, 2);
            $mainMessage = trim($parts[0]);
            $stackTrace = isset($parts[1]) ? trim($parts[1]) : null;

            $entries[] = [
                'timestamp' => $match[1],
                'environment' => $match[2],
                'level' => $match[3],
                'message' => $mainMessage,
                'stack_trace' => $stackTrace,
            ];
        }

        return $entries;
    }

    /**
     * Mask sensitive data in log content.
     */
    protected function maskSensitiveData(string $content): string
    {
        foreach ($this->sensitivePatterns as $pattern => $replacement) {
            $content = preg_replace($pattern, $replacement, $content);
        }

        return $content;
    }
}
