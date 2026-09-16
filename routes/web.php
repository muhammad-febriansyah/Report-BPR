<?php

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\MappingNetworkAreaController;
use App\Http\Controllers\Admin\MasterAreaController;
use App\Http\Controllers\Admin\MenuController;
use App\Http\Controllers\Admin\MetabasePageController;
use App\Http\Controllers\Admin\RoleAccessController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\MenuDestinationController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('menu-destinations/{menu}', [MenuDestinationController::class, 'show'])
        ->name('menu-destination.show');
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
        ->name('notifications.read');

    Route::prefix('admin')->name('admin.')->middleware('administrator')->group(function () {
        Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::get('metabase/pages', [MetabasePageController::class, 'index'])->name('metabase-pages.index');
        Route::post('metabase/pages', [MetabasePageController::class, 'store'])->name('metabase-pages.store');
        Route::put('metabase/pages/{page}', [MetabasePageController::class, 'update'])->name('metabase-pages.update');
        Route::delete('metabase/pages/{page}', [MetabasePageController::class, 'destroy'])->name('metabase-pages.destroy');
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('role-access', [RoleAccessController::class, 'index'])->name('role-access.index');
        Route::get('master-area', [MasterAreaController::class, 'index'])->name('master-area.index');
        Route::get('mapping-network-area', [MappingNetworkAreaController::class, 'index'])->name('mapping-network-area.index');
        Route::put('role-access/{role}', [RoleAccessController::class, 'update'])->name('role-access.update');
        Route::put('menus/reorder', [MenuController::class, 'reorder'])->name('menus.reorder');
        Route::resource('menus', MenuController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
