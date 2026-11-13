import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function Analysis() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/analyze/writing', { text });
      setResult(response.data);
      toast.success('Analysis complete');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Writing Quality Analysis</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyse readability, structure, and clarity with actionable suggestions
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Text to Analyse
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="textarea h-48"
            placeholder="Enter text to analyze..."
          />
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BarChart3 className="mr-2 h-4 w-4 inline" />
          {loading ? 'Analyzing...' : 'Analyse Writing Quality'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Readability Score</p>
              <p className="text-2xl font-bold text-primary-600">{result.readability_score}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{result.readability_level}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Words</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.word_count}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Sentences</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.sentence_count}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Sentence Length</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.avg_sentence_length}</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Objective Metrics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Flesch Reading Ease</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.objective_metrics.flesch_reading_ease}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Flesch-Kincaid Grade</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.objective_metrics.flesch_kincaid_grade}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Gunning Fog</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{result.objective_metrics.gunning_fog}</p>
              </div>
            </div>
          </div>

          {result.clarity_suggestions.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Clarity Suggestions</h3>
              <ul className="space-y-2">
                {result.clarity_suggestions.map((suggestion: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-primary-600">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4 bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Disclaimer:</strong> Readability scores are statistical measures, not indicators of writing quality or authorship. 
              Suggestions are recommendations based on objective metrics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
