import { Form, Head } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    MessageCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel, RequiredMark } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { store } from '@/routes/login';

type Props = {
    status?: string;
};

export default function Login({ status }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (status) {
            toast.success(status);
        }
    }, [status]);

    return (
        <>
            <Head title="Masuk" />

            <main className="flex min-h-svh items-center justify-center bg-[#F7F9FC] px-3 py-4 text-[#111827] antialiased sm:px-6">
                <section className="w-full max-w-[460px]">
                    <div className="w-full rounded-[22px] border border-slate-200/60 bg-white p-4 shadow-none sm:p-6">
                        <div className="mb-4">
                            <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                                Masuk ke akun Anda
                            </h1>
                            <p className="mt-1 text-[13px] leading-5 text-slate-500">
                                Akses dashboard laporan, analitik, dan
                                monitoring data BPR dengan aman.
                            </p>
                        </div>

                        <Form
                            {...store.form()}
                            resetOnSuccess={['password']}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div>
                                        <FieldLabel
                                            htmlFor="email"
                                            className="mb-1.5 text-[13px] font-medium text-slate-700"
                                        >
                                            Email
                                            <RequiredMark />
                                        </FieldLabel>
                                        <div className="group focus-within:border-primary/50 focus-within:ring-primary/5 flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:ring-4">
                                            <Mail className="group-focus-within:text-primary size-[18px] shrink-0 text-slate-400 transition" />
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                autoFocus
                                                autoComplete="email"
                                                tabIndex={1}
                                                placeholder="nama@perusahaan.co.id"
                                                className="h-full border-0 bg-transparent px-0 py-0 text-[13px] text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0"
                                            />
                                        </div>
                                        <InputError
                                            message={errors.email}
                                            className="mt-1.5"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel
                                            htmlFor="password"
                                            className="mb-1.5 text-[13px] font-medium text-slate-700"
                                        >
                                            Password
                                            <RequiredMark />
                                        </FieldLabel>
                                        <div className="group focus-within:border-primary/50 focus-within:ring-primary/5 flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:ring-4">
                                            <LockKeyhole className="group-focus-within:text-primary size-[18px] shrink-0 text-slate-400 transition" />
                                            <Input
                                                id="password"
                                                name="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                required
                                                autoComplete="current-password"
                                                tabIndex={2}
                                                placeholder="Masukkan password"
                                                className="h-full border-0 bg-transparent px-0 py-0 text-[13px] text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (visible) => !visible,
                                                    )
                                                }
                                                className="size-7 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                                                aria-label={
                                                    showPassword
                                                        ? 'Sembunyikan password'
                                                        : 'Tampilkan password'
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="size-[18px]" />
                                                ) : (
                                                    <Eye className="size-[18px]" />
                                                )}
                                            </Button>
                                        </div>
                                        <InputError
                                            message={errors.password}
                                            className="mt-1.5"
                                        />
                                    </div>

                                    <div className="flex items-center">
                                        <label
                                            htmlFor="remember"
                                            className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-600"
                                        >
                                            <Checkbox
                                                id="remember"
                                                name="remember"
                                                value="1"
                                                defaultChecked
                                                tabIndex={3}
                                            />
                                            Ingat saya
                                        </label>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        tabIndex={4}
                                        data-test="login-button"
                                        className="bg-primary hover:bg-primary/90 h-10 w-full rounded-xl px-5 text-[13px] font-medium text-white shadow-[0_4px_14px_rgba(37,71,249,0.13)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {processing ? 'Memproses…' : 'Masuk'}
                                        {!processing && (
                                            <ArrowRight data-icon="inline-end" />
                                        )}
                                    </Button>
                                </>
                            )}
                        </Form>

                        <div className="my-3 flex items-center gap-3 text-[11px] text-slate-400">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span>Butuh bantuan?</span>
                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <a
                            href="https://wa.me/6281295916567?text=Halo%2C%20saya%20butuh%20bantuan%20akses%20BPR%20Report."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group hover:border-primary/20 hover:bg-primary/[0.025] focus-visible:ring-primary/10 flex w-full items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-left transition-colors focus-visible:ring-4 focus-visible:outline-none"
                        >
                            <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                                <MessageCircle className="size-[18px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-medium text-slate-800">
                                    Hubungi Admin
                                </span>
                                <span className="mt-0.5 block text-[11px] text-slate-500">
                                    Chat langsung melalui WhatsApp
                                </span>
                            </span>
                            <ArrowUpRight className="group-hover:text-primary size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                    </div>
                </section>
            </main>
        </>
    );
}
