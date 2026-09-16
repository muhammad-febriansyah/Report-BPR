<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveUserRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'role' => ['nullable', 'integer', Rule::exists(Role::class, 'id')],
            'sort' => ['nullable', Rule::in(['name', 'email'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $query = User::query()
            ->select(['id', 'name', 'email', 'status', 'created_at'])
            ->with(['roles:id,name,slug'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $prefix = $search.'%';

                $query->where(function (Builder $query) use ($prefix): void {
                    $query->where('name', 'like', $prefix)
                        ->orWhere('email', 'like', $prefix);
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status === 'active'))
            ->when($filters['role'] ?? null, fn (Builder $query, string|int $roleId) => $query->whereHas('roles', fn (Builder $roles) => $roles->whereKey((int) $roleId)));

        $sort = $filters['sort'] ?? 'id';
        $direction = $filters['direction'] ?? 'desc';
        $query->orderBy($sort, $direction);

        if ($sort !== 'id') {
            $query->orderBy('id', $direction);
        }

        return Inertia::render('admin/users/index', [
            'users' => $query->cursorPaginate(25)->withQueryString(),
            'roles' => Role::query()->select(['id', 'name'])->orderBy('name')->get(),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? 'all',
                'role' => $filters['role'] ?? 'all',
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): never
    {
        abort(404);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(SaveUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $roleIds = $data['role_ids'];
        unset($data['role_ids']);

        DB::transaction(function () use ($data, $roleIds): void {
            $user = User::create([
                ...$data,
                'email_verified_at' => now(),
            ]);
            $user->roles()->sync($roleIds);
        });

        return to_route('admin.users.index')->with('success', 'Pengguna berhasil dibuat.');
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): never
    {
        abort(404);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user): never
    {
        abort(404);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(SaveUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();
        $roleIds = $data['role_ids'];
        unset($data['role_ids']);

        $this->assertAdministratorWillRemain($user, $roleIds, (bool) $data['status']);

        DB::transaction(function () use ($user, $data, $roleIds): void {
            if (($data['password'] ?? null) === null) {
                unset($data['password']);
            }

            $user->fill($data)->save();
            $user->roles()->sync($roleIds);
        });

        return to_route('admin.users.index')->with('success', 'Pengguna berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        $this->assertAdministratorWillRemain($user, [], false);

        DB::transaction(function () use ($user): void {
            $user->roles()->detach();
            $user->delete();
        });

        return to_route('admin.users.index')->with('success', 'Pengguna berhasil dihapus.');
    }

    /**
     * Prevent the active administrator account from removing its own access or the last administrator.
     *
     * @param  array<int, int|string>  $roleIds
     */
    private function assertAdministratorWillRemain(User $user, array $roleIds, bool $willBeActive): void
    {
        $administratorRoleIds = Role::query()->administrator()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $willHaveAdministratorRole = array_intersect($administratorRoleIds, array_map('intval', $roleIds)) !== [];
        $removingSelf = $user->is(auth()->user()) && (! $willBeActive || ! $willHaveAdministratorRole);

        if ($removingSelf) {
            throw ValidationException::withMessages([
                'role_ids' => 'Akun administrator yang sedang digunakan tidak dapat dinonaktifkan atau diturunkan rolenya.',
            ]);
        }

        if (! $user->status || ! $user->hasRole('administrator') || ($willBeActive && $willHaveAdministratorRole)) {
            return;
        }

        $activeAdministrators = User::query()
            ->where('status', true)
            ->whereHas('roles', fn (Builder $query) => $query->administrator())
            ->count();

        if ($activeAdministrators <= 1) {
            throw ValidationException::withMessages([
                'role_ids' => 'Sistem harus memiliki minimal satu administrator aktif.',
            ]);
        }
    }
}
