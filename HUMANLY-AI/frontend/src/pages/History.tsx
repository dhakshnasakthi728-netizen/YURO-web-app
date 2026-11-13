export default function History() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">History</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View your past analyses and documents
        </p>
      </div>

      <div className="card p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">No history yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Your analyses and documents will appear here
        </p>
      </div>
    </div>
  );
}
