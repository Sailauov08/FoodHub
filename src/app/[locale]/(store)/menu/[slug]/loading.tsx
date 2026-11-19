import { Skeleton } from "@/components/ui/misc";

export default function ProductLoading() {
  return (
    <div className="container-page pt-28 lg:pt-36" aria-busy>
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Skeleton className="aspect-square w-full rounded-[30px]" />
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <div className="grid grid-cols-3 gap-2 pt-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <div className="space-y-2 pt-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-14 w-32 rounded-full" />
            <Skeleton className="h-14 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
