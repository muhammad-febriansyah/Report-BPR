import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { ChevronsUpDown, CornerDownRight, Search } from 'lucide-react';
import { update as updateMenu, store as storeMenu } from '@/routes/admin/menus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MenuIcon } from '@/components/admin/menu-icon';
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
    FieldLegend,
    FieldSet,
    RequiredMark,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

type RoleOption = {
    id: number;
    name: string;
};

type ParentOption = {
    id: number;
    parent_id: number | null;
    title: string;
};

type AdminMenu = {
    id: number;
    parent_id: number | null;
    title: string;
    route_name: string | null;
    url: string | null;
    icon: string | null;
    sort_order: number;
    status: boolean;
    role_restricted: boolean;
    roles: RoleOption[];
};

type MenuFormData = {
    parent_id: number | '';
    title: string;
    route_name: string;
    url: string;
    icon: string;
    sort_order: number;
    status: boolean;
    role_restricted: boolean;
    role_ids: number[];
};

type MenuFormDialogProps = {
    open: boolean;
    menu: AdminMenu | null;
    roles: RoleOption[];
    parents: ParentOption[];
    routeNames: string[];
    icons: string[];
    onOpenChange: (open: boolean) => void;
};

type DestinationType = 'group' | 'route' | 'url';

type RoleGroup = {
    ids: number[];
    name: string;
};

function formatRouteLabel(routeName: string): string {
    const label = routeName
        .split('.')
        .filter(
            (segment) =>
                ![
                    'index',
                    'show',
                    'store',
                    'create',
                    'edit',
                    'update',
                ].includes(segment),
        )
        .map((segment) =>
            segment
                .replace(/[-_]/g, ' ')
                .replace(/\b\w/g, (character) => character.toUpperCase()),
        )
        .join(' / ');

    return label || routeName;
}

function RoleMultiSelect({
    roles,
    selectedRoleIds,
    disabled,
    invalid,
    onRoleToggle,
}: {
    roles: RoleOption[];
    selectedRoleIds: number[];
    disabled: boolean;
    invalid: boolean;
    onRoleToggle: (roleIds: number[], checked: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const groupedRoles = useMemo(() => {
        const groups = new Map<string, RoleGroup>();

        for (const role of roles) {
            const key = role.name.trim().toLocaleLowerCase();
            const existingGroup = groups.get(key);

            if (existingGroup) {
                existingGroup.ids.push(role.id);
            } else {
                groups.set(key, { ids: [role.id], name: role.name });
            }
        }

        return [...groups.values()];
    }, [roles]);
    const filteredRoles = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
            return groupedRoles;
        }

        return groupedRoles.filter((role) =>
            role.name.toLowerCase().includes(normalizedQuery),
        );
    }, [groupedRoles, query]);
    const selectedRoles = groupedRoles.filter((role) =>
        role.ids.some((id) => selectedRoleIds.includes(id)),
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
                    disabled={roles.length === 0 || disabled}
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
                        className="max-h-72 overflow-y-auto overscroll-contain p-1"
                    >
                        {filteredRoles.map((role) => (
                            <div
                                key={role.name}
                                className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2 text-sm"
                            >
                                <Checkbox
                                    id={`menu-role-${role.ids[0]}`}
                                    checked={role.ids.some((id) =>
                                        selectedRoleIds.includes(id),
                                    )}
                                    disabled={disabled}
                                    onCheckedChange={(checked) =>
                                        onRoleToggle(role.ids, checked === true)
                                    }
                                />
                                <label
                                    htmlFor={`menu-role-${role.ids[0]}`}
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

export function MenuFormDialog({
    open,
    menu,
    roles,
    parents,
    routeNames,
    icons,
    onOpenChange,
}: MenuFormDialogProps) {
    const parentsById = new Map(parents.map((parent) => [parent.id, parent]));
    const excludedParentIds = new Set<number>();

    if (menu) {
        excludedParentIds.add(menu.id);

        let hasNewDescendants = true;

        while (hasNewDescendants) {
            hasNewDescendants = false;

            for (const parent of parents) {
                if (
                    parent.parent_id !== null &&
                    excludedParentIds.has(parent.parent_id) &&
                    !excludedParentIds.has(parent.id)
                ) {
                    excludedParentIds.add(parent.id);
                    hasNewDescendants = true;
                }
            }
        }
    }

    const parentLabel = (parent: ParentOption): string => {
        const path = [parent.title];
        let parentId = parent.parent_id;
        const visited = new Set([parent.id]);

        while (parentId !== null && !visited.has(parentId)) {
            visited.add(parentId);
            const ancestor = parentsById.get(parentId);

            if (!ancestor) {
                break;
            }

            path.unshift(ancestor.title);
            parentId = ancestor.parent_id;
        }

        return path.join(' / ');
    };

    const parentOptions: ComboboxOption[] = [
        { value: 'none', label: 'Menu utama' },
        ...parents
            .filter((parent) => !excludedParentIds.has(parent.id))
            .map((parent) => ({
                value: String(parent.id),
                label: parentLabel(parent),
            })),
    ];

    const form = useForm<MenuFormData>({
        parent_id: '',
        title: '',
        route_name: '',
        url: '',
        icon: '',
        sort_order: 10,
        status: true,
        role_restricted: false,
        role_ids: [],
    });
    const [destinationType, setDestinationType] =
        useState<DestinationType>('group');

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            parent_id: menu?.parent_id ?? '',
            title: menu?.title ?? '',
            route_name: menu?.route_name ?? '',
            url: menu?.url ?? '',
            icon: menu?.icon ?? '',
            sort_order: menu?.sort_order ?? 10,
            status: menu?.status ?? true,
            role_restricted: menu?.role_restricted ?? false,
            role_ids: menu?.roles.map((role) => role.id) ?? [],
        });
        setDestinationType(
            menu
                ? menu.route_name
                    ? 'route'
                    : menu.url
                      ? 'url'
                      : 'group'
                : 'route',
        );
        form.clearErrors();
    }, [open, menu]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => onOpenChange(false),
        };

        if (menu) {
            form.put(updateMenu(menu.id).url, options);
        } else {
            form.post(storeMenu().url, options);
        }
    };

    const toggleRole = (roleIds: number[], checked: boolean) => {
        const nextRoleIds = new Set(form.data.role_ids);

        for (const roleId of roleIds) {
            if (checked) {
                nextRoleIds.add(roleId);
            } else {
                nextRoleIds.delete(roleId);
            }
        }

        form.setData((data) => ({
            ...data,
            role_restricted: true,
            role_ids: [...nextRoleIds],
        }));
    };

    const setAllRoleAccess = (checked: boolean) => {
        form.setData((data) => ({
            ...data,
            role_restricted: !checked,
            role_ids: checked ? [] : data.role_ids,
        }));
    };

    const routeOptions = useMemo(() => {
        const options: ComboboxOption[] = [
            { value: 'none', label: 'Pilih halaman aplikasi' },
            ...routeNames.map((routeName) => ({
                value: routeName,
                label: formatRouteLabel(routeName),
            })),
        ];

        if (
            form.data.route_name !== '' &&
            !options.some((option) => option.value === form.data.route_name)
        ) {
            options.push({
                value: form.data.route_name,
                label: formatRouteLabel(form.data.route_name),
            });
        }

        return options;
    }, [form.data.route_name, routeNames]);

    const handleDestinationTypeChange = (type: DestinationType) => {
        setDestinationType(type);

        if (type === 'group') {
            form.setData('route_name', '');
            form.setData('url', '');
        }

        if (type === 'route') {
            form.setData('url', '');
        }

        if (type === 'url') {
            form.setData('route_name', '');
        }
    };
    const destinationLabel =
        destinationType === 'group'
            ? 'Grup navigasi'
            : destinationType === 'route'
              ? form.data.route_name
                  ? `Halaman: ${formatRouteLabel(form.data.route_name)}`
                  : 'Pilih halaman aplikasi'
              : form.data.url || 'Alamat khusus';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {menu ? 'Ubah menu' : 'Tambah menu'}
                    </DialogTitle>
                    <DialogDescription>
                        Susun navigasi sidebar, tujuan halaman, dan role yang
                        dapat melihat menu ini.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <FieldGroup>
                        <Field data-invalid={Boolean(form.errors.title)}>
                            <FieldLabel htmlFor="menu-title">
                                Nama menu <RequiredMark />
                            </FieldLabel>
                            <Input
                                id="menu-title"
                                required
                                placeholder="Contoh: Laporan Kredit"
                                value={form.data.title}
                                aria-invalid={Boolean(form.errors.title)}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                            />
                            {form.errors.title && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.title}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field data-invalid={Boolean(form.errors.parent_id)}>
                            <FieldLabel htmlFor="menu-parent">
                                Menu induk
                            </FieldLabel>
                            <Combobox
                                id="menu-parent"
                                value={
                                    form.data.parent_id === ''
                                        ? 'none'
                                        : String(form.data.parent_id)
                                }
                                options={parentOptions}
                                placeholder="Pilih menu induk"
                                searchPlaceholder="Cari nama atau jalur menu..."
                                emptyMessage="Menu induk tidak ditemukan."
                                invalid={Boolean(form.errors.parent_id)}
                                onValueChange={(value) =>
                                    form.setData(
                                        'parent_id',
                                        value === 'none' ? '' : Number(value),
                                    )
                                }
                            />
                            {form.errors.parent_id && (
                                <FieldDescription className="text-destructive">
                                    {form.errors.parent_id}
                                </FieldDescription>
                            )}
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="menu-destination">
                                Tujuan menu <RequiredMark />
                            </FieldLabel>
                            <Select
                                value={destinationType}
                                onValueChange={(value) =>
                                    handleDestinationTypeChange(
                                        value as DestinationType,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="menu-destination"
                                    className="w-full"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="group">
                                            Grup navigasi (submenu)
                                        </SelectItem>
                                        <SelectItem value="route">
                                            Halaman aplikasi
                                        </SelectItem>
                                        <SelectItem value="url">
                                            Alamat khusus
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <FieldDescription>
                                {destinationType === 'group'
                                    ? 'Grup navigasi tidak membuka halaman dan dapat memiliki submenu.'
                                    : destinationType === 'route'
                                      ? 'Pilih halaman yang tersedia di aplikasi.'
                                      : 'Masukkan alamat yang ingin dibuka saat menu dipilih.'}
                            </FieldDescription>
                        </Field>

                        {destinationType === 'route' && (
                            <Field
                                data-invalid={Boolean(form.errors.route_name)}
                            >
                                <FieldLabel htmlFor="menu-route">
                                    Halaman aplikasi <RequiredMark />
                                </FieldLabel>
                                <Combobox
                                    id="menu-route"
                                    value={form.data.route_name || 'none'}
                                    options={routeOptions}
                                    placeholder="Pilih halaman aplikasi"
                                    searchPlaceholder="Cari halaman aplikasi..."
                                    emptyMessage="Halaman aplikasi tidak ditemukan."
                                    invalid={Boolean(form.errors.route_name)}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'route_name',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                />
                                {form.errors.route_name && (
                                    <FieldDescription className="text-destructive">
                                        {form.errors.route_name}
                                    </FieldDescription>
                                )}
                            </Field>
                        )}

                        {destinationType === 'url' && (
                            <Field data-invalid={Boolean(form.errors.url)}>
                                <FieldLabel htmlFor="menu-url">
                                    Alamat khusus <RequiredMark />
                                </FieldLabel>
                                <Input
                                    id="menu-url"
                                    placeholder="Contoh: /laporan/kredit"
                                    value={form.data.url}
                                    aria-invalid={Boolean(form.errors.url)}
                                    onChange={(event) =>
                                        form.setData('url', event.target.value)
                                    }
                                />
                                <FieldDescription>
                                    Gunakan path internal seperti
                                    /laporan/kredit.
                                </FieldDescription>
                                {form.errors.url && (
                                    <FieldDescription className="text-destructive">
                                        {form.errors.url}
                                    </FieldDescription>
                                )}
                            </Field>
                        )}

                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field data-invalid={Boolean(form.errors.icon)}>
                                <FieldLabel htmlFor="menu-icon">
                                    Ikon
                                </FieldLabel>
                                <Select
                                    value={form.data.icon || 'none'}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'icon',
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="menu-icon"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pilih ikon" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="none">
                                                Tanpa ikon
                                            </SelectItem>
                                            {icons.map((icon) => (
                                                <SelectItem
                                                    key={icon}
                                                    value={icon}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MenuIcon
                                                            name={icon}
                                                            className="text-muted-foreground size-4"
                                                        />
                                                        {icon}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                {form.errors.icon && (
                                    <FieldDescription className="text-destructive">
                                        {form.errors.icon}
                                    </FieldDescription>
                                )}
                            </Field>

                            <Field
                                data-invalid={Boolean(form.errors.sort_order)}
                            >
                                <FieldLabel htmlFor="menu-order">
                                    Urutan <RequiredMark />
                                </FieldLabel>
                                <Input
                                    id="menu-order"
                                    type="number"
                                    min={0}
                                    max={65535}
                                    required
                                    placeholder="10"
                                    value={form.data.sort_order}
                                    aria-invalid={Boolean(
                                        form.errors.sort_order,
                                    )}
                                    onChange={(event) =>
                                        form.setData(
                                            'sort_order',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                {form.errors.sort_order && (
                                    <FieldDescription className="text-destructive">
                                        {form.errors.sort_order}
                                    </FieldDescription>
                                )}
                            </Field>
                        </div>

                        <FieldSet>
                            <FieldLegend>Akses role</FieldLegend>
                            <Field
                                orientation="horizontal"
                                className="items-start"
                            >
                                <Checkbox
                                    id="menu-all-roles"
                                    checked={!form.data.role_restricted}
                                    onCheckedChange={(checked) =>
                                        setAllRoleAccess(checked === true)
                                    }
                                />
                                <div className="grid gap-1">
                                    <FieldLabel
                                        htmlFor="menu-all-roles"
                                        className="font-normal"
                                    >
                                        Semua role dapat melihat menu
                                    </FieldLabel>
                                    <FieldDescription>
                                        Matikan untuk membatasi menu ke role
                                        yang dipilih. Jika tidak ada role yang
                                        dipilih, menu tidak tampil di sidebar
                                        role mana pun.
                                    </FieldDescription>
                                </div>
                            </Field>
                            <RoleMultiSelect
                                roles={roles}
                                selectedRoleIds={form.data.role_ids}
                                disabled={!form.data.role_restricted}
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
                                id="menu-is-active"
                                checked={form.data.status}
                                onCheckedChange={(checked) =>
                                    form.setData('status', checked === true)
                                }
                            />
                            <FieldLabel
                                htmlFor="menu-is-active"
                                className="font-normal"
                            >
                                Menu aktif <RequiredMark />
                            </FieldLabel>
                        </Field>
                    </FieldGroup>

                    <div className="bg-muted/30 flex flex-col gap-3 rounded-xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium">
                                    Pratinjau sidebar
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                    Tampilan item sebelum disimpan.
                                </p>
                            </div>
                            <Badge
                                variant={
                                    form.data.status ? 'default' : 'outline'
                                }
                            >
                                {form.data.status ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                        </div>

                        <div className="bg-background flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3">
                            {form.data.parent_id !== '' && (
                                <CornerDownRight className="text-muted-foreground size-4 shrink-0" />
                            )}
                            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <MenuIcon
                                    name={form.data.icon || null}
                                    className="size-4"
                                />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">
                                    {form.data.title || 'Nama menu'}
                                </span>
                                <span className="text-muted-foreground block truncate text-xs">
                                    {form.data.parent_id === ''
                                        ? 'Menu utama'
                                        : `Submenu dari ${parents.find((parent) => parent.id === form.data.parent_id)?.title ?? 'menu induk'}`}
                                    {' · '}
                                    {destinationLabel}
                                </span>
                            </span>
                        </div>
                    </div>

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
                            {menu ? 'Simpan perubahan' : 'Buat menu'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
