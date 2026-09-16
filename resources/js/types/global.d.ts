import type { Auth } from '@/types/auth';
import type { MenuNavigationItem } from '@/types/navigation';

export type NotificationItem = {
    id: string;
    title: string;
    message: string;
    type: string;
    href: string | null;
    read_at: string | null;
    created_at: string | null;
};

export type Notifications = {
    items: NotificationItem[];
    unread_count: number;
};

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            canAccessAdministration: boolean;
            menuItems: MenuNavigationItem[];
            notifications: Notifications;
            flash: { success?: string | null };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
