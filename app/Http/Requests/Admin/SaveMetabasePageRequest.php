<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveMetabasePageRequest extends FormRequest
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
            'master_menu_id' => ['required', 'integer', Rule::exists('master_menu', 'id')],
            'iframe_url' => ['required', 'url:http,https', 'max:2048'],
            'iframe_title' => ['nullable', 'string', 'max:160'],
            'iframe_description' => ['nullable', 'string', 'max:500'],
            'status' => ['required', 'boolean'],
        ];
    }

    /**
     * Ensure the selected master menu and iframe source are valid.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $parsedUrl = parse_url((string) $this->input('iframe_url'));
            $host = is_array($parsedUrl) && isset($parsedUrl['host'])
                ? strtolower((string) $parsedUrl['host'])
                : '';
            $allowedHosts = config('services.metabase.embed_hosts', []);

            if (
                ! is_array($parsedUrl)
                || ($parsedUrl['scheme'] ?? null) !== 'https'
                || ! in_array($host, $allowedHosts, true)
            ) {
                $validator->errors()->add(
                    'iframe_url',
                    'URL iframe harus HTTPS dan berasal dari host Metabase yang diizinkan.',
                );
            }
        }];
    }
}
