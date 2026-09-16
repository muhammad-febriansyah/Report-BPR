<?php

namespace App\Http\Requests\Admin;

use App\Models\Menu;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderMenusRequest extends FormRequest
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
            'items' => ['present', 'array'],
            'items.*.id' => ['required', 'integer', 'distinct:strict', Rule::exists(Menu::class, 'id')],
            'items.*.parent_id' => ['nullable', 'integer', Rule::exists(Menu::class, 'id')],
            'items.*.position' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /**
     * Validate that the submitted flat list represents one complete, acyclic menu tree.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $items = collect($this->input('items'));
            $storedIds = Menu::query()
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
            $submittedIds = $items
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->sort()
                ->values()
                ->all();

            if ($storedIds !== $submittedIds) {
                $validator->errors()->add('items', 'Daftar menu harus memuat semua item yang tersimpan.');

                return;
            }

            $parents = $items->mapWithKeys(fn (array $item): array => [
                (int) $item['id'] => $item['parent_id'] === null ? null : (int) $item['parent_id'],
            ])->all();

            foreach ($parents as $id => $parentId) {
                if ($parentId === $id) {
                    $validator->errors()->add('items', 'Menu tidak dapat menjadi induk bagi dirinya sendiri.');

                    return;
                }

                $visited = [];
                $ancestorId = $id;

                while ($ancestorId !== null) {
                    if (isset($visited[$ancestorId])) {
                        $validator->errors()->add('items', 'Susunan menu tidak boleh membentuk siklus.');

                        return;
                    }

                    $visited[$ancestorId] = true;
                    $ancestorId = $parents[$ancestorId] ?? null;
                }
            }
        }];
    }
}
