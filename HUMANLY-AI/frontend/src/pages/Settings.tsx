import { useState } from 'react';
import { Server, Key, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/health');
      setHealth(response.data);
      toast.success('Health check complete');
    } catch (error: any) {
      toast.error('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your HUMANLY AI platform
        </p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Backend Status</h2>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Backend Health'}
        </button>
        {health && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <p className="text-sm"><span className="font-medium">Status:</span> {health.status}</p>
            <p className="text-sm"><span className="font-medium">App:</span> {health.app}</p>
            <p className="text-sm"><span className="font-medium">Version:</span> {health.version}</p>
            {health.detector_model && (
              <p className="text-sm"><span className="font-medium">Detector Model:</span> {health.detector_model}</p>
            )}
            {health.humanization_provider && (
              <p className="text-sm"><span className="font-medium">Humanization Provider:</span> {health.humanization_provider}</p>
            )}
          </div>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">API Configuration</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Configure API keys and providers in the backend .env file
        </p>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>• OpenAI API Key (optional)</p>
          <p>• Anthropic API Key (optional)</p>
          <p>• Ollama (local) - default provider</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Privacy & Data</h2>
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>• Documents are processed locally where possible</p>
          <p>• Temporary files are cleaned up automatically</p>
          <p>• No full document contents are logged by default</p>
          <p>• You can delete documents at any time</p>
        </div>
      </div>
    </div>
  );
}
