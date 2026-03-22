export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3" style={{ color: 'var(--app-text)' }}>
      <div className="text-6xl opacity-20">⏱</div>
      <p className="text-lg font-medium opacity-50">No projects yet</p>
      <p className="text-sm opacity-40">Use the "+ Add Project" button above to get started</p>
    </div>
  );
}
