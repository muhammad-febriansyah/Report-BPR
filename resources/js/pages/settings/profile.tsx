import { Form, Head, usePage } from '@inertiajs/react';
import { LockKeyhole, Upload } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { PageHeader } from '@/components/admin/page-header';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toAvatarUrl } from '@/lib/utils';
import { edit as editProfile } from '@/routes/profile';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
    profile: {
        status: boolean;
        roles: Array<{ id: number; name: string }>;
    };
};

export default function Profile() {
    const { auth, profile } = usePage<PageProps>().props;
    const initials = auth.user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase();
    const avatarUrl = toAvatarUrl(auth.user.avatar);
    const [avatarPreview, setAvatarPreview] = useState<string | undefined>(
        avatarUrl,
    );

    useEffect(() => {
        return () => {
            if (avatarPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
    };

    return (
        <>
            <Head title="Pengaturan profil" />
            <main className="font-poppins text-foreground min-h-[calc(100svh-76px)] bg-[#F6F8FC] px-4 py-6 sm:px-6 xl:px-8 xl:py-7">
                <PageHeader
                    title="Pengaturan profil"
                    description="Kelola informasi akun, foto profil, dan kata sandi Anda."
                    breadcrumbs={[
                        { title: 'Pengaturan', href: editProfile().url },
                        { title: 'Profil' },
                    ]}
                />

                <Card className="border-border/80 gap-0 overflow-hidden py-0 shadow-sm">
                    <CardHeader className="border-border/70 gap-4 border-b px-5 py-5 sm:px-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="size-16">
                                <AvatarImage
                                    src={avatarPreview}
                                    alt={auth.user.name}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                                    {initials || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base">
                                    {auth.user.name}
                                </CardTitle>
                                <p className="text-muted-foreground mt-1 text-sm">
                                    {auth.user.email}
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        className="space-y-6 p-5 sm:p-6"
                    >
                        {({ errors, processing, wasSuccessful }) => (
                            <>
                                <div className="grid gap-5 lg:grid-cols-2">
                                    <div className="grid gap-2 lg:col-span-2">
                                        <Label htmlFor="avatar">
                                            Foto profil
                                        </Label>
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <label
                                                htmlFor="avatar"
                                                className="border-input hover:bg-accent flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors sm:w-fit"
                                            >
                                                <Upload className="size-4" />
                                                Pilih foto
                                            </label>
                                            <Input
                                                id="avatar"
                                                name="avatar"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={handleAvatarChange}
                                                className="sr-only"
                                            />
                                            {avatarPreview?.startsWith(
                                                'blob:',
                                            ) && (
                                                <span className="text-muted-foreground text-xs">
                                                    Preview foto baru aktif
                                                </span>
                                            )}
                                            <p className="text-muted-foreground text-xs">
                                                PNG, JPG, atau WEBP · maksimal 2
                                                MB
                                            </p>
                                        </div>
                                        <InputError message={errors.avatar} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            Nama lengkap
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={auth.user.name}
                                            autoComplete="name"
                                            required
                                            aria-invalid={Boolean(errors.name)}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            Alamat email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            defaultValue={auth.user.email}
                                            autoComplete="email"
                                            required
                                            aria-invalid={Boolean(errors.email)}
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="current_password">
                                            Kata sandi saat ini
                                        </Label>
                                        <PasswordInput
                                            id="current_password"
                                            name="current_password"
                                            autoComplete="current-password"
                                            placeholder="Isi jika ingin ganti password"
                                            aria-invalid={Boolean(
                                                errors.current_password,
                                            )}
                                        />
                                        <InputError
                                            message={errors.current_password}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            Kata sandi baru
                                        </Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            autoComplete="new-password"
                                            placeholder="Masukkan kata sandi baru"
                                            aria-invalid={Boolean(
                                                errors.password,
                                            )}
                                        />
                                        <InputError message={errors.password} />
                                    </div>
                                    <div className="grid gap-2 lg:col-span-2">
                                        <Label htmlFor="password_confirmation">
                                            Konfirmasi kata sandi baru
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            placeholder="Ulangi kata sandi baru"
                                            aria-invalid={Boolean(
                                                errors.password_confirmation,
                                            )}
                                        />
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="border-border/70 grid gap-4 border-t pt-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="roles">Role</Label>
                                        <Input
                                            id="roles"
                                            value={
                                                profile.roles
                                                    .map((role) => role.name)
                                                    .join(', ') ||
                                                'Belum ada role'
                                            }
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="status">
                                            Status akses
                                        </Label>
                                        <Input
                                            id="status"
                                            value={
                                                profile.status
                                                    ? 'Aktif'
                                                    : 'Tidak aktif'
                                            }
                                            disabled
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                                    <p
                                        aria-live="polite"
                                        className="text-muted-foreground text-sm"
                                    >
                                        {wasSuccessful
                                            ? 'Perubahan profil berhasil disimpan.'
                                            : 'Role dan status akses hanya dapat diubah administrator.'}
                                    </p>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        {processing
                                            ? 'Menyimpan…'
                                            : 'Simpan perubahan'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </Card>

                <div className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
                    <LockKeyhole className="size-3.5" />
                    Informasi role dan status dilindungi oleh administrator.
                </div>
            </main>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Profil', href: editProfile() }],
};
