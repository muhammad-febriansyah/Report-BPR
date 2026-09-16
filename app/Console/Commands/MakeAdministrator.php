<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('app:make-administrator {email} {--name=} {--generate-password}')]
#[Description('Create or promote an administrator account.')]
class MakeAdministrator extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->components->error('Email tidak valid.');

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();
        $requestedName = trim((string) ($this->option('name') ?? ''));
        $name = $requestedName !== '' ? $requestedName : ($user?->name ?? '');
        $generatePassword = (bool) $this->option('generate-password');
        $password = null;

        if ($user === null) {
            if (! $this->input->isInteractive() && ! $generatePassword) {
                $this->components->error('Akun baru harus dibuat secara interaktif agar password tidak dikirim melalui argumen shell.');

                return self::FAILURE;
            }

            $name = $name !== '' ? $name : trim((string) $this->ask('Nama administrator'));

            if ($generatePassword) {
                $password = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
            } else {
                $password = $this->secret('Password administrator (minimal 12 karakter)');
                $passwordConfirmation = $this->secret('Konfirmasi password');

                if (! is_string($password) || $password !== $passwordConfirmation || mb_strlen($password) < 12) {
                    $this->components->error('Password harus sama dengan konfirmasi dan minimal 12 karakter.');

                    return self::FAILURE;
                }
            }
        } elseif ($generatePassword) {
            $this->components->error('Opsi --generate-password hanya dapat digunakan untuk akun baru.');

            return self::FAILURE;
        }

        if ($name === '' || mb_strlen($name) > 255) {
            $this->components->error('Nama administrator wajib diisi dan maksimal 255 karakter.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($user, $email, $name, $password): void {
            $administrator = Role::query()->administrator()->first()
                ?? Role::query()->create([
                    'name' => 'Administrator',
                    'slug' => 'administrator',
                ]);

            if ($user === null) {
                $user = User::query()->create([
                    'name' => $name,
                    'email' => $email,
                    'password' => $password,
                    'email_verified_at' => now(),
                    'status' => true,
                ]);
            } else {
                $user->fill([
                    'name' => $name,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'status' => true,
                ])->save();
            }

            $user->roles()->syncWithoutDetaching([$administrator->id]);
        });

        $this->components->info("{$email} sekarang memiliki akses administrator.");

        if ($generatePassword) {
            $this->components->warn("Password sementara (simpan sekarang): {$password}");
        }

        return self::SUCCESS;
    }
}
