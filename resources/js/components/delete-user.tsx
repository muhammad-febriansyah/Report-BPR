import { Form } from '@inertiajs/react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Card className="gap-0 overflow-hidden border-red-200 py-0 dark:border-red-900">
            <CardHeader className="border-b border-red-200 bg-red-50/70 py-5 dark:border-red-900 dark:bg-red-950/20">
                <CardTitle className="text-base text-red-800 dark:text-red-200">
                    Hapus akun
                </CardTitle>
                <CardDescription>
                    Tindakan ini akan menghapus akun dan tidak dapat dibatalkan.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                    Semua akses BPR Report dengan akun ini akan dihentikan
                    setelah penghapusan.
                </p>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            data-test="delete-user-button"
                        >
                            Hapus akun
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>Hapus akun secara permanen?</DialogTitle>
                        <DialogDescription>
                            Akun dan akses Anda ke BPR Report akan dihapus.
                            Masukkan kata sandi untuk mengonfirmasi tindakan
                            ini.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{ preserveScroll: true }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="delete-account-password"
                                            className="sr-only"
                                        >
                                            Kata sandi saat ini
                                        </Label>
                                        <PasswordInput
                                            id="delete-account-password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Kata sandi saat ini"
                                            autoComplete="current-password"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Batal
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={processing}
                                            data-test="confirm-delete-user-button"
                                        >
                                            {processing
                                                ? 'Menghapus…'
                                                : 'Ya, hapus akun'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
