import Button from './ui/button';

interface EmptyStateProps {
  onCreateClick: () => void
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="w-16 h-16 mb-6 text-slate-400 dark:text-slate-500">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Create Your First Application
      </h2>

      {/* Description */}
      <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-8">
        Applications help you organize and manage your deployments, environments, secrets, and variables in one place.
      </p>

      {/* CTA Button */}
      <Button onClick={onCreateClick} size="lg">
        Create New Application
      </Button>
    </div>
  );
}