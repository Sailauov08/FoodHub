import { Skeleton } from "@/components/ui/misc";

export default function MenuLoading() {
  return (
    <div className="container-page pt-32 lg:pt-40" aria-busy>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-14 w-80 max-w-full" />
      <Skeleton className="mt-4 h-5 w-[28rem] max-w-full" />
      <Skeleton className="mt-10 h-32 w-full rounded-[20px]" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[22px] border border-border bg-surface">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="size-11 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
