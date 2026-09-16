<?php

namespace App\Listeners;

use App\Models\AuditLog;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\Request;

class RecordLoginActivity
{
    public function __construct(private Request $request) {}

    public function handle(Login $event): void
    {
        $request = $this->request;
        AuditLog::create([
            'user_id' => $event->user->getAuthIdentifier(),
            'user_name' => $event->user->name,
            'event' => 'login',
            'description' => 'Login berhasil',
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
