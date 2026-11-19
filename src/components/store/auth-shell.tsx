import Image from "next/image";

/** `aside` replaces the decorative burger column (e.g. with the demo accounts panel) and is also shown on phones. */
export function AuthShell({ title, text, children, aside }: { title: string; text: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-dvh items-center gap-10 pt-28 pb-12 lg:grid-cols-2 lg:pt-32">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">{title}</h1>
        <p className="mt-3 text-muted">{text}</p>
        <div className="mt-8 rounded-[24px] border border-border bg-surface p-6 sm:p-8">{children}</div>
      </div>
      {aside ? (
        <div className="mx-auto w-full max-w-md lg:max-w-lg">{aside}</div>
      ) : (
        <div className="relative hidden aspect-square overflow-hidden rounded-[32px] border border-border lg:block">
          <Image src="/images/hero/black-angus.webp" alt="" fill sizes="50vw" className="animate-float object-contain p-10" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgb(255_107_53/0.18),transparent_60%)]" />
        </div>
      )}
    </div>
  );
}
