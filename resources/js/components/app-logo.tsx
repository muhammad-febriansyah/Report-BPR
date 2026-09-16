export default function AppLogo() {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#2547F9]/[0.06]">
                <img src="/favicon.ico" alt="" className="size-8" />
            </div>
            <span className="truncate text-[17px] leading-tight font-bold tracking-[-0.03em] text-slate-950">
                BPR Report
            </span>
        </div>
    );
}
