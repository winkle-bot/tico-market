import Link from 'next/link';
import { PackageSearch } from 'lucide-react';

interface EmptyDeliveryStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyDeliveryState({
  title,
  description,
  actionHref = '/delivery/tasks',
  actionLabel = 'Browse Open Tasks',
}: EmptyDeliveryStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#c8d7f5] bg-[#f8fbff] px-5 py-8 text-center sm:px-8">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6efff] text-[#2f56a1]">
        <PackageSearch className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-black text-[#1e3562]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6078a8]">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="tm-btn tm-btn-muted mt-4 inline-flex">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
