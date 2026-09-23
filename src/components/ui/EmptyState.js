'use client';

export default function EmptyState({ children = 'No records found in your accessible scope.' }) {
  return <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>;
}