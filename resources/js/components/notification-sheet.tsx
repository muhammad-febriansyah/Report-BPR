import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Check, Info, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { read as readNotification } from '@/routes/notifications';
import type { NotificationItem } from '@/types/global';

function notificationTone(type: string): string {
    return (
        {
            success: 'bg-emerald-50 text-emerald-600',
            warning: 'bg-amber-50 text-amber-600',
            error: 'bg-rose-50 text-rose-600',
        }[type] ?? 'bg-blue-50 text-blue-600'
    );
}

function NotificationIcon({ type }: { type: string }) {
    if (type === 'success') {
        return <Check className="size-4" />;
    }

    if (type === 'warning' || type === 'error') {
        return <TriangleAlert className="size-4" />;
    }

    return <Info className="size-4" />;
}

function formatNotificationTime(value: string | null): string {
    if (value === null) {
        return '';
    }

    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function NotificationSheet() {
    const { notifications: initialNotifications } = usePage().props;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>(
        initialNotifications.items,
    );
    const [unreadCount, setUnreadCount] = useState(
        initialNotifications.unread_count,
    );

    useEffect(() => {
        setItems(initialNotifications.items);
        setUnreadCount(initialNotifications.unread_count);
    }, [initialNotifications]);

    const markAsRead = (notification: NotificationItem): void => {
        if (notification.read_at !== null) {
            return;
        }

        const readAt = new Date().toISOString();
        setItems((current) =>
            current.map((item) =>
                item.id === notification.id
                    ? { ...item, read_at: readAt }
                    : item,
            ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));

        router.patch(
            readNotification.url(notification.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['notifications'],
            },
        );
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Notifikasi"
                    className="relative size-10 rounded-xl text-slate-600 hover:bg-slate-50"
                >
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="w-full gap-0 border-slate-200 bg-white p-0 sm:max-w-md"
            >
                <SheetHeader className="border-b border-slate-100 px-5 py-5">
                    <SheetTitle className="text-lg text-slate-900">
                        Notifikasi
                    </SheetTitle>
                    <SheetDescription className="text-sm text-slate-500">
                        Informasi terbaru dari aktivitas sistem Anda.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Bell className="size-5" />
                            </span>
                            <p className="text-sm font-semibold text-slate-800">
                                Belum ada notifikasi
                            </p>
                            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                                Notifikasi aktivitas penting akan muncul di
                                sini.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {items.map((notification) => (
                                <article
                                    key={notification.id}
                                    onDoubleClick={() =>
                                        markAsRead(notification)
                                    }
                                    className={cn(
                                        'px-5 py-4 transition-colors hover:bg-slate-50',
                                        notification.read_at === null &&
                                            'bg-primary/[0.025]',
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                                                notificationTone(
                                                    notification.type,
                                                ),
                                            )}
                                        >
                                            <NotificationIcon
                                                type={notification.type}
                                            />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <h3
                                                    className={cn(
                                                        'text-sm text-slate-900',
                                                        notification.read_at ===
                                                            null
                                                            ? 'font-semibold'
                                                            : 'font-medium',
                                                    )}
                                                >
                                                    {notification.title}
                                                </h3>
                                                {notification.read_at ===
                                                    null && (
                                                    <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <p className="text-[11px] text-slate-400">
                                                    {formatNotificationTime(
                                                        notification.created_at,
                                                    )}
                                                </p>
                                                {notification.href && (
                                                    <Link
                                                        href={notification.href}
                                                        onClick={() =>
                                                            setOpen(false)
                                                        }
                                                        className="text-primary text-xs font-semibold hover:underline"
                                                    >
                                                        Buka
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {notification.read_at === null && (
                                        <p className="mt-2 pl-12 text-[11px] text-slate-400">
                                            Klik dua kali untuk menandai sudah
                                            dibaca
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 px-5 py-3">
                    <p className="text-center text-[11px] text-slate-400">
                        Notifikasi tersimpan untuk akun Anda.
                    </p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
