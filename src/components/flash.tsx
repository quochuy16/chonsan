export function Flash({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  if (searchParams.error)
    return (
      <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {searchParams.error}
      </div>
    );
  if (searchParams.ok)
    return (
      <div role="status" className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        {searchParams.ok}
      </div>
    );
  return null;
}
