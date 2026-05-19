export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-bg">
            <span className="text-base font-bold">M</span>
          </div>
          <h1 className="text-base font-semibold">Mihord</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
