import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface DetectionResult {
  classification: string;
  confidence?: number;
  probability_ai?: number;
  analysable_text_length: number;
  passages: Array<{
    text: string;
    start_index: number;
    end_index: number;
    score: number;
    label: string;
    explanation: string;
  }>;
  explanation: string;
  limitations: string[];
  model_used: string;
  is_inconclusive: boolean;
  warnings: string[];
}

export default function Detector() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const jobId = uploadRes.data?.job_id;
      if (!jobId) throw new Error('Upload did not return a job ID');
      const extractRes = await api.post('/api/extract', { job_id: jobId });
      const extracted = extractRes.data?.text || '';
      if (!extracted.trim()) {
        toast.error('No text could be extracted from this document.');
        return;
      }
      setText(extracted);
      toast.success(`Extracted text from ${selectedFile.name}`);
      if (Array.isArray(extractRes.data?.warnings) && extractRes.data.warnings.length > 0) {
        toast('Extraction completed with warnings. Review the text if needed.', { icon: '⚠️' });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to upload/extract document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const analyzeAI = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/detect/ai', { text, mode: 'ai' });
      setResult(response.data);
      toast.success('Analysis complete');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const analyzeHuman = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to analyze');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/detect/human', { text, mode: 'human' });
      setResult(response.data);
      toast.success('Analysis complete');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    if (classification.includes('AI-generated')) return 'text-red-600 dark:text-red-400';
    if (classification.includes('human-written')) return 'text-green-600 dark:text-green-400';
    if (classification.includes('Mixed')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getClassificationIcon = (classification: string) => {
    if (classification.includes('AI-generated')) return <XCircle className="h-6 w-6" />;
    if (classification.includes('human-written')) return <CheckCircle className="h-6 w-6" />;
    if (classification.includes('Mixed')) return <AlertCircle className="h-6 w-6" />;
    return <Info className="h-6 w-6" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Writing Detector</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyze text for AI-writing patterns with transparent, evidence-based reporting
        </p>
      </div>

      {/* Input Section */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Paste text or upload document
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="textarea h-48"
            placeholder="Enter text to analyze (minimum 50 characters recommended)..."
          />
        </div>

        <div className="flex items-center gap-4">
          <label className={`btn-secondary cursor-pointer inline-flex items-center ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading & extracting...' : 'Upload Document (PDF, DOCX, TXT)'}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              disabled={uploading || loading}
              className="hidden"
            />
          </label>
          {file && <span className="text-sm text-gray-600 dark:text-gray-400">{file.name}</span>}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={analyzeAI}
            disabled={loading || uploading || !text.trim()}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyse for AI-Writing Patterns'}
          </button>
          <button
            onClick={analyzeHuman}
            disabled={loading || uploading || !text.trim()}
            className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Analyzing...' : 'Analyse for Human-Writing Patterns'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className={getClassificationColor(result.classification)}>
                {getClassificationIcon(result.classification)}
              </div>
              <div className="flex-1 space-y-2">
                <h2 className={`text-xl font-semibold ${getClassificationColor(result.classification)}`}>
                  {result.classification}
                </h2>
                {result.confidence !== null && result.confidence !== undefined && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                    {result.probability_ai !== null && result.probability_ai !== undefined && (
                      <span className="ml-2">(AI probability: {(result.probability_ai * 100).toFixed(1)}%)</span>
                    )}
                  </p>
                )}
                <p className="text-gray-700 dark:text-gray-300">{result.explanation}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Analysable text length: {result.analysable_text_length} characters | Model: {result.model_used}
                </p>
              </div>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="space-y-1">
                  {result.warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.passages.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Passage-Level Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Passage-level classifications are uncertain and are not proof of authorship.
              </p>
              <div className="space-y-3">
                {result.passages.map((passage, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{passage.text}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{passage.label}</span>
                      <span className="text-gray-600 dark:text-gray-400">Score: {passage.score.toFixed(3)}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{passage.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Limitations</h3>
            <ul className="space-y-2">
              {result.limitations.map((limitation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-600">•</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 italic">
              AI authorship detection cannot be 100% accurate. Results should not be used to accuse or label individuals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
