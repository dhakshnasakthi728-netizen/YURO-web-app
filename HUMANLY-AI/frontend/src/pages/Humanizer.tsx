import { useState } from 'react';
import { Upload, Wand2, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const modes = [
  { value: 'natural_conversational', label: 'Natural and Conversational' },
  { value: 'academic_clear', label: 'Academic and Clear' },
  { value: 'professional', label: 'Professional' },
  { value: 'simple_english', label: 'Simple English' },
  { value: 'concise', label: 'Concise Writing' },
  { value: 'detailed_explanation', label: 'Detailed Explanation' },
  { value: 'personal_voice', label: 'Personal Writing Voice' },
  { value: 'grammar_clarity', label: 'Grammar and Clarity Improvement' },
];

export default function Humanizer() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('natural_conversational');
  const [voiceSample, setVoiceSample] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFileName(selectedFile.name);
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

  const handleHumanize = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to humanize');
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    try {
      const response = await api.post('/api/humanize', {
        text,
        mode,
        preserve_voice_sample: mode === 'personal_voice' ? voiceSample : null,
        check_facts: true
      }, { signal: controller.signal });
      setResult(response.data);
      toast.success('Humanization complete');
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again with shorter text.');
      } else {
        toast.error(error.response?.data?.detail || error.message || 'Humanization failed');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Text Humanizer</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Transform text into natural, fluent writing while preserving meaning and facts
        </p>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Text to Humanize
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="textarea h-48"
            placeholder="Enter text to humanize or upload a document..."
          />
          <div className="mt-2 flex items-center gap-3">
            <label className={`btn-secondary cursor-pointer inline-flex items-center text-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
            {fileName && <span className="text-sm text-gray-600 dark:text-gray-400">{fileName}</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Humanization Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="input"
          >
            {modes.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {mode === 'personal_voice' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Writing Sample (for voice adaptation)
            </label>
            <textarea
              value={voiceSample}
              onChange={(e) => setVoiceSample(e.target.value)}
              className="textarea h-32"
              placeholder="Paste a sample of your writing to match your personal style..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Your sample is kept private and used only for style adaptation.
            </p>
          </div>
        )}

        <button
          onClick={handleHumanize}
          disabled={loading || uploading || !text.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wand2 className="mr-2 h-4 w-4 inline" />
          {loading ? 'Humanizing...' : 'Humanize Text'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Humanized Result</h2>
              <div className="flex items-center gap-2">
                {result.verification_passed ? (
                  <span className="flex items-center text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Verification Issues
                  </span>
                )}
              </div>
            </div>
            <textarea
              value={result.rewritten_text}
              readOnly
              className="textarea h-48 bg-gray-50 dark:bg-gray-800"
            />
            <div className="mt-4 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Original: {result.word_count_original} words</span>
              <span>Rewritten: {result.word_count_rewritten} words</span>
              <span>Provider: {result.provider_used}</span>
            </div>
          </div>

          {!result.verification_passed && (
            <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Verification Issues</p>
                  <ul className="mt-1 space-y-1">
                    {result.preservation_check.issues?.map((issue: string, idx: number) => (
                      <li key={idx} className="text-sm text-amber-800 dark:text-amber-300">• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="card p-4 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-1">
                {result.warnings.map((warning: string, idx: number) => (
                  <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">{warning}</p>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Humanized content is not guaranteed to evade AI detectors. Results depend on the detector used.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
