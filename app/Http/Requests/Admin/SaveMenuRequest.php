<?php

namespace App\Http\Requests\Admin;

use App\Models\Menu;
use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveMenuRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'parent_id' => ['nullable', 'integer', Rule::exists(Menu::class, 'id')],
            'route_name' => ['nullable', 'string', 'max:150', 'regex:/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/'],
            'url' => ['nullable', 'string', 'max:255', 'regex:/^(?!\/\/)(?:\/?[A-Za-z0-9_-])[A-Za-z0-9_.\/?=&%#-]*$/'],
            'icon' => ['nullable', 'string', Rule::in(Menu::ICONS)],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'status' => ['required', 'boolean'],
            'role_restricted' => ['sometimes', 'boolean'],
            'role_ids' => ['present', 'array'],
            'role_ids.*' => ['integer', Rule::exists(Role::class, 'id')],
        ];
    }

    /**
     * Validate menu relationships and destinations after primitive validation.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['parent_id', 'title'])) {
                return;
            }

            $menu = $this->route('menu');
            $menu = $menu instanceof Menu ? $menu : null;
            $parentId = $this->input('parent_id');
            $routeName = $this->input('route_name');
            $url = $this->input('url');

            $namedRoute = is_string($routeName) && $routeName !== ''
                ? Route::getRoutes()->getByName($routeName)
                : null;

            if (is_string($routeName) && $routeName !== '' && ($namedRoute === null || str_contains($namedRoute->uri(), '{'))) {
                $validator->errors()->add('route_name', 'Pilih route yang tersedia.');
            }

            if (is_string($routeName) && $routeName !== '' && is_string($url) && $url !== '') {
                $validator->errors()->add('url', 'Gunakan route atau URL internal, jangan keduanya.');
            }

            if ($parentId !== null && $parentId !== '') {
                $parentId = (int) $parentId;
                $parents = Menu::query()->pluck('parent_id', 'id');
                $visited = [];
                $ancestorId = $parentId;

                while ($parents->has($ancestorId) && ! isset($visited[$ancestorId])) {
                    if ($menu !== null && $ancestorId === $menu->id) {
                        $validator->errors()->add('parent_id', 'Menu tidak dapat dipindahkan ke dalam dirinya sendiri atau turunannya.');

                        return;
                    }

                    $visited[$ancestorId] = true;
                    $nextAncestorId = $parents[$ancestorId];

                    if ($nextAncestorId === null) {
                        break;
                    }

                    $ancestorId = (int) $nextAncestorId;
                }
            }
        }];
    }
}
