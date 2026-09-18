<?php

namespace App\Console\Commands;

use App\Models\Menu;
use App\Models\MenuPage;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

#[Signature('app:backfill-metabase-pages {iframe-url : HTTPS URL yang digunakan semua halaman iframe Metabase}')]
#[Description('Convert menu laporan Metabase lama menjadi halaman iframe di Page Builder.')]
class BackfillMetabasePages extends Command
{
    public function handle(): int
    {
        $iframeUrl = trim((string) $this->argument('iframe-url'));

        if (! $this->isAllowedIframeUrl($iframeUrl)) {
            $this->components->error('URL harus HTTPS dan berasal dari host Metabase yang diizinkan.');

            return self::FAILURE;
        }

        $menus = Menu::query()
            ->select(['id', 'parent_id', 'name', 'url', 'status', 'position'])
            ->orderBy('position')
            ->orderBy('id')
            ->get();
        $metabase = $menus->first(fn (Menu $menu): bool => $menu->parent_id === null
            && mb_strtolower($menu->name) === 'metabase');

        if (! $metabase instanceof Menu) {
            $this->components->error('Menu Metabase tidak ditemukan.');

            return self::FAILURE;
        }

        $childrenByParent = $menus->groupBy(fn (Menu $menu): int => $menu->parent_id ?? 0);
        $reportMenus = $this->reportMenus($metabase, $childrenByParent);

        if ($reportMenus->isEmpty()) {
            $this->components->warn('Tidak ada menu laporan di bawah Metabase.');

            return self::SUCCESS;
        }

        $created = 0;
        $updated = 0;
        $clearedLegacyUrls = 0;

        DB::transaction(function () use ($reportMenus, $iframeUrl, &$created, &$updated, &$clearedLegacyUrls): void {
            foreach ($reportMenus as $menu) {
                $page = MenuPage::query()->firstOrNew(['menu_id' => $menu->id]);
                $isNew = ! $page->exists;

                $page->fill([
                    'page_type' => 'iframe',
                    'iframe_url' => $iframeUrl,
                    'status' => (bool) $menu->status,
                ]);

                if ($isNew) {
                    $page->iframe_title = $menu->name;
                }

                $page->save();

                if ($isNew) {
                    $created++;
                } else {
                    $updated++;
                }

                if ($menu->url !== null) {
                    $menu->fill(['url' => null])->save();
                    $clearedLegacyUrls++;
                }
            }
        });

        $this->components->info(sprintf(
            'Backfill selesai: %d halaman dibuat, %d diperbarui, %d URL menu lama dikosongkan.',
            $created,
            $updated,
            $clearedLegacyUrls,
        ));

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, Collection<int, Menu>>  $childrenByParent
     * @return Collection<int, Menu>
     */
    private function reportMenus(Menu $metabase, Collection $childrenByParent): Collection
    {
        $reports = collect();
        $visit = function (Menu $menu, array $ancestors = []) use (&$visit, &$reports, $childrenByParent): void {
            if (isset($ancestors[$menu->id])) {
                return;
            }

            $ancestors[$menu->id] = true;
            $children = $childrenByParent->get($menu->id, collect());

            if ($children->isEmpty()) {
                $reports->push($menu);

                return;
            }

            foreach ($children as $child) {
                $visit($child, $ancestors);
            }
        };

        foreach ($childrenByParent->get($metabase->id, collect()) as $child) {
            $visit($child, [$metabase->id => true]);
        }

        return $reports->values();
    }

    private function isAllowedIframeUrl(string $iframeUrl): bool
    {
        $parsedUrl = parse_url($iframeUrl);
        $host = is_array($parsedUrl) && isset($parsedUrl['host'])
            ? strtolower((string) $parsedUrl['host'])
            : '';

        return is_array($parsedUrl)
            && ($parsedUrl['scheme'] ?? null) === 'https'
            && in_array($host, config('services.metabase.embed_hosts', []), true);
    }
}
