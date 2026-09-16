<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $user = $request->user();
        $routeName = $request->route()?->getName();

        if ($user === null || $routeName === null || str_contains($routeName, 'audit-logs.')) {
            return $response;
        }

        if (str_starts_with($routeName, 'login') || $routeName === 'logout') {
            return $response;
        }

        AuditLog::create([
            'user_id' => $user->getKey(),
            'user_name' => $user->name,
            'event' => $request->method(),
            'description' => $this->description($request, $routeName),
            'method' => $request->method(),
            'path' => '/'.ltrim($request->path(), '/'),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return $response;
    }

    private function description(Request $request, string $routeName): string
    {
        return match ($routeName) {
            'dashboard' => 'Membuka dashboard',
            'profile.edit' => 'Membuka pengaturan profil',
            'profile.update' => 'Memperbarui profil',
            'security.edit' => 'Membuka pengaturan keamanan',
            'user-password.update' => 'Mengubah kata sandi',
            'admin.users.index' => 'Membuka daftar pengguna',
            'admin.users.store' => 'Menambahkan pengguna',
            'admin.users.update' => 'Memperbarui pengguna',
            'admin.users.destroy' => 'Menghapus pengguna',
            'admin.menus.index' => 'Membuka menu builder',
            'admin.menus.store' => 'Menambahkan menu',
            'admin.menus.update' => 'Memperbarui menu',
            'admin.menus.destroy' => 'Menghapus menu',
            'admin.role-access.index' => 'Membuka pengaturan akses role',
            'admin.role-access.update' => 'Memperbarui akses role',
            default => $request->method().' '.$request->path(),
        };
    }
}
