import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { ChevronsUpDown, Search } from 'lucide-react';
import { update as updateUser, store as storeUser } from '@/routes/admin/users';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSet,
    FieldLegend,
    RequiredMark,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import PasswordInput from '@/components/password-input';

type RoleOption = {
    id: number;
    name: string;
};

type AdminUser = {
    id: number;
    name: string;
    email: string;
    status: boolean;
    roles: RoleOption[];
};

type UserFormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role_ids: number[];
    status: boolean;
};

type UserFormDialogProps = {
    open: boolean;
    user: AdminUser | null;
    roles: RoleOption[];
    onOpenChange: (open: boolean) => void;
};

function RoleMultiSelect({
    roles,
    selectedRoleIds,
    invalid,
    onRoleToggle,
}: {
    roles: RoleOption[];
    selectedRoleIds: number[];
    invalid: boolean;
    onRoleToggle: (roleId: number, checked: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const filteredRoles = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
            return roles;
        }

        return roles.filter((role) =>
            role.name.toLowerCase().includes(normalizedQuery),
        );
    }, [query, roles]);
    const selectedRoles = roles.filter((role) =>
        selectedRoleIds.includes(role.id),
    );
    const selectedLabel =
        selectedRoles.length === 0
            ? 'Pilih role'
            : selectedRoles.length === 1
              ? selectedRoles[0].name
              : `${selectedRoles[0].name} +${selectedRoles.length - 1} role`;

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (!nextOpen) {
                    setQuery('');
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-invalid={invalid}
                    aria-label={`Pilih role, ${selectedRoles.length} dipilih`}
                    disabled={roles.length === 0}
                    className="h-10 w-full justify-between rounded-lg px-3 font-normal"
                >
                    <span className="truncate text-left">
                        {roles.length === 0
                            ? 'Role tidak tersedia'
                            : selectedLabel}
                    </span>
                    <ChevronsUpDown
                        data-icon="inline-end"
                        className="opacity-50"
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    searchInputRef.current?.focus();
                }}
                className="w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden p-0"
            >
                <div className="border-b p-2">
                    <div className="relative">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            ref={searchInputRef}
                            aria-label="Cari role"
                            autoComplete="off"
                            placeholder="Cari role..."
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            className="h-9 pl-9"
                        />
                    </div>
                </div>
                {filteredRoles.length > 0 ? (
                    <div
                        role="group"
                        aria-label="Daftar role"
                        onWheel={(event) => event.stopPropagation()}
                        className="max-h-60 overflow-y-auto overscroll-contain p-1"
                    >
                        {filteredRoles.map((role) => (
                            <div
                                key={role.id}
                                className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2 text-sm"
                            >
                                <Checkbox
                                    id={`user-role-${role.id}`}
                                    checked={selectedRoleIds.includes(role.id)}
                                    onCheckedChange={(checked) =>
                                        onRoleToggle(role.id, checked === true)
                                    }
                                />
                                <label
                                    htmlFor={`user-role-${role.id}`}
                                    className="min-w-0 flex-1 cursor-pointer break-words"
                                >
                                    {role.name}
                                </label>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p
                        role="status"
                        className="text-muted-foreground px-3 py-6 text-center text-sm"
                    >
                        Role tidak ditemukan.
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}

export function UserFormDialog({
    open,
    user,
    roles,
    onOpenChange,
}: UserFormDialogProps) {
    const form = useForm<UserFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_ids: [],
        status: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: user?.name ?? '',
            email: user?.email ?? '',
            password: '',
            password_confirmation: '',
            role_ids: user?.roles.map((role) => role.id) ?? [],
            status: user?.status ?? true,
        });
        form.clearErrors();
    }, [open, user]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (user) {
            form.put(updateUser(user.id).url, options);
        } else {
            form.post(storeUser().url, options);
        }
    };

    const toggleRole = (roleId: number, checked: boolean) => {
        form.setData(
            'role_ids',
            checked
                ? [...form.data.role_ids, roleId]
                : form.data.role_ids.filter((id) => id !== roleId),
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {user ? 'Ubah pengguna' : 'Tambah pengguna'}
                    </DialogTitle>
                    <DialogDescription>
                        Atur identitas, akses role, dan status akun pengguna.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <FieldGroup>
                        <Field data-invalid={Boolean(form.errors.name)}>
                            <FieldLabel htmlFor="user-name">
                                Nama <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="user-name"
                                autoComplete="name"
                                required
                                placeholder="Contoh: Ahmad Hidayat"
                                value={form.data.name}
                                aria-invalid={Boolean(form.errors.name)}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                            {form.errors.name && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.name}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field data-invalid={Boolean(form.errors.email)}>
                            <FieldLabel htmlFor="user-email">
                                Email <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="user-email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="nama@perusahaan.co.id"
                                value={form.data.email}
                                aria-invalid={Boolean(form.errors.email)}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                            />
                            {form.errors.email && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.email}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field data-invalid={Boolean(form.errors.password)}>
                            <FieldLabel htmlFor="user-password">
                                Password
                                {!user && <RequiredMark />}
                            </FieldLabel>
                            <PasswordInput
                                id="user-password"
                                autoComplete="new-password"
                                required={!user}
                                placeholder={
                                    user
                                        ? 'Kosongkan jika tidak diubah'
                                        : 'Minimal 12 karakter'
                                }
                                value={form.data.password}
                                aria-invalid={Boolean(form.errors.password)}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                            />
                            {form.errors.password && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.password}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field
                            data-invalid={Boolean(
                                form.errors.password_confirmation,
                            )}
                        >
                            <FieldLabel htmlFor="user-password-confirmation">
                                Konfirmasi password
                                {!user && <RequiredMark />}
                            </FieldLabel>
                            <PasswordInput
                                id="user-password-confirmation"
                                autoComplete="new-password"
                                required={
                                    !user && form.data.password.length > 0
                                }
                                placeholder="Ulangi password"
                                value={form.data.password_confirmation}
                                aria-invalid={Boolean(
                                    form.errors.password_confirmation,
                                )}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                            />
                            {form.errors.password_confirmation && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.password_confirmation}
                                </FieldDescription>
                            )}
                        </Field>

                        <FieldSet>
                            <FieldLegend>
                                Role <RequiredMark />
                            </FieldLegend>
                            <FieldDescription>
                                Role menentukan menu dan akses yang diberikan.
                            </FieldDescription>
                            <RoleMultiSelect
                                roles={roles}
                                selectedRoleIds={form.data.role_ids}
                                invalid={Boolean(form.errors.role_ids)}
                                onRoleToggle={toggleRole}
                            />
                            {form.errors.role_ids && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.role_ids}
                                </FieldDescription>
                            )}
                        </FieldSet>

                        <Field
                            orientation="horizontal"
                            className="items-center"
                        >
                            <Checkbox
                                id="user-is-active"
                                checked={form.data.status}
                                onCheckedChange={(checked) =>
                                    form.setData('status', checked === true)
                                }
                            />
                            <FieldLabel
                                htmlFor="user-is-active"
                                className="font-normal"
                            >
                                Akun aktif <RequiredMark />
                            </FieldLabel>
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && (
                                <Spinner data-icon="inline-start" />
                            )}
                            {user ? 'Simpan perubahan' : 'Buat pengguna'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
