<?php

namespace App\Listeners;

use App\Models\AuditLog;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\Request;

class RecordLogoutActivity
{
    public function __construct(private Request $request) {}

    public function handle(Logout $event): void
    {
        if ($event->user === null) {
            return;
        }

        AuditLog::create([
            'user_id' => $event->user->getAuthIdentifier(),
            'user_name' => $event->user->name,
            'event' => 'logout',
            'description' => 'Logout',
            'method' => $this->request->method(),
            'path' => '/'.$this->request->path(),
            'ip_address' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
            'created_at' => now(),
        ]);
    }
}
