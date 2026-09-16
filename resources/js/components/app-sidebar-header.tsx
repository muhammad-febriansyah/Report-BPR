import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { AppCommandMenu } from '@/components/app-command-menu';
import { NotificationSheet } from '@/components/notification-sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { toAvatarUrl } from '@/lib/utils';

export function AppSidebarHeader() {
    const { auth } = usePage().props;
    const getInitials = useInitials();

    return (
        <header className="font-poppins sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="size-10 shrink-0 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900" />
                <div className="hidden sm:block">
                    <AppCommandMenu />
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                <NotificationSheet />
                <span className="hidden h-8 w-px bg-slate-200 sm:block" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-auto gap-3 rounded-xl p-1.5 text-left hover:bg-slate-50"
                        >
                            <Avatar className="size-9 rounded-full">
                                <AvatarImage
                                    src={toAvatarUrl(auth.user?.avatar)}
                                    alt={auth.user?.name ?? 'Pengguna'}
                                />
                                <AvatarFallback className="bg-[#2547F9]/10 text-xs font-bold text-[#2547F9]">
                                    {getInitials(auth.user?.name ?? '')}
                                </AvatarFallback>
                            </Avatar>
                            <span className="hidden min-w-0 text-left sm:block">
                                <span className="block max-w-40 truncate text-xs font-semibold text-slate-900">
                                    {auth.user?.name ?? 'Pengguna'}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-400">
                                    BPR Report
                                </span>
                            </span>
                            <ChevronDown className="hidden size-4 text-slate-400 sm:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-56 rounded-xl"
                        align="end"
                    >
                        {auth.user && <UserMenuContent user={auth.user} />}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
