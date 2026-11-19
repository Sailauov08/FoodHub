import { Skeleton } from "@/components/ui/misc";

export default function CheckoutLoading() {
  return (
    <div className="container-page pt-32 lg:pt-40" aria-busy>
      <Skeleton className="h-12 w-80 max-w-full" />
      <Skeleton className="mt-6 h-8 w-96 max-w-full" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Skeleton className="h-56 w-full rounded-[24px]" />
          <Skeleton className="h-72 w-full rounded-[24px]" />
        </div>
        <Skeleton className="h-96 w-full rounded-[24px]" />
      </div>
    </div>
  );
}
