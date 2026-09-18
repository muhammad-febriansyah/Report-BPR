<?php

use App\Models\Menu;
use App\Models\MenuPage;

test('backfills every Metabase report menu into an iframe page idempotently', function () {
    $metabase = Menu::query()
        ->whereNull('parent_id')
        ->where('name', 'Metabase')
        ->firstOrFail();
    $osm = Menu::factory()->create([
        'name' => 'OSM',
        'parent_id' => $metabase->id,
        'url' => null,
    ]);
    $report = Menu::factory()->create([
        'name' => 'Akses Area Status Pegawai',
        'parent_id' => $osm->id,
        'url' => 'metabase.osms.aksesareastatuspegawai',
    ]);
    $existing = Menu::factory()->create([
        'name' => 'Report Mutasi',
        'parent_id' => $osm->id,
        'url' => 'metabase.boms.reportmutasi',
    ]);
    $existing->page()->create([
        'page_type' => 'iframe',
        'iframe_url' => 'https://metabase.simgroup.co.id/public/question/old',
        'iframe_title' => 'Report Mutasi',
        'iframe_description' => 'Report Mutasi',
        'status' => true,
    ]);
    $outside = Menu::factory()->create(['name' => 'ERP', 'parent_id' => null]);

    $iframeUrl = 'https://metabase.simgroup.co.id/public/question/021d9a98-d31d-43cb-9503-6acb6acf57e3';

    $this->artisan('app:backfill-metabase-pages', ['iframe-url' => $iframeUrl])
        ->assertExitCode(0);

    expect(MenuPage::query()->whereIn('menu_id', [$report->id, $existing->id])->count())->toBe(2)
        ->and($report->fresh()->url)->toBeNull()
        ->and($existing->fresh()->url)->toBeNull()
        ->and($report->page()->value('iframe_url'))->toBe($iframeUrl)
        ->and($existing->page()->value('iframe_url'))->toBe($iframeUrl)
        ->and($outside->page()->exists())->toBeFalse();

    $this->artisan('app:backfill-metabase-pages', ['iframe-url' => $iframeUrl])
        ->assertExitCode(0);

    expect(MenuPage::query()->whereIn('menu_id', [$report->id, $existing->id])->count())->toBe(2);
});

test('backfill rejects iframe URLs outside the configured Metabase host', function () {
    $this->artisan('app:backfill-metabase-pages', [
        'iframe-url' => 'https://example.com/public/question/report',
    ])->assertExitCode(1);

    expect(MenuPage::query()->count())->toBe(0);
});
