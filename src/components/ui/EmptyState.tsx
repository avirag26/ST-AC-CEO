type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-muted/50 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-text">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
          {description}
        </p>
      ) : null}
    </div>
  );
}
