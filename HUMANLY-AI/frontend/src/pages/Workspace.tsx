import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function Workspace() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: extract, 3: process

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const newJobId = response.data.job_id;
      setJobId(newJobId);
      toast.success('File uploaded. Extracting text...');

      const extractRes = await api.post('/api/extract', { job_id: newJobId });
      const extracted = extractRes.data?.text || '';
      if (!extracted.trim()) {
        toast.error('No text could be extracted from this document.');
        setStep(2);
        return;
      }
      setExtractedText(extracted);
      toast.success('Text extracted successfully');
      if (Array.isArray(extractRes.data?.warnings) && extractRes.data.warnings.length > 0) {
        toast('Extraction completed with warnings. Review the text if needed.', { icon: '⚠️' });
      }
      setStep(3);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || 'Upload/extraction failed');
      setStep(2);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const extractText = async () => {
    if (!jobId) return;
    setLoading(true);
    
    try {
      const response = await api.post('/api/extract', { job_id: jobId });
      setExtractedText(response.data.text);
      toast.success('Text extracted successfully');
      setStep(3);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Document Workspace</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload, process, and work with complete documents
        </p>
      </div>

      {/* Progress Steps */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary-100 dark:bg-primary-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              1
            </div>
            <span className="ml-2 font-medium">Upload</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700 mx-4" />
          <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary-100 dark:bg-primary-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              2
            </div>
            <span className="ml-2 font-medium">Extract</span>
          </div>
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700 mx-4" />
          <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary-100 dark:bg-primary-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              3
            </div>
            <span className="ml-2 font-medium">Process</span>
          </div>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload Document</h2>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Supports PDF, DOCX, and TXT files (max 50MB)
            </p>
            <label className="btn-primary cursor-pointer inline-flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Select File
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
            {file && (
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Extract */}
      {step === 2 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Extract Text</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            File uploaded: {file?.name}
          </p>
          <button
            onClick={extractText}
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Extracting...' : 'Extract Text'}
          </button>
        </div>
      )}

      {/* Step 3: Process */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Extracted Text</h2>
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              className="textarea h-64 bg-gray-50 dark:bg-gray-800"
            />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Words: {extractedText.split(/\s+/).filter(w => w).length} | Characters: {extractedText.length}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button className="card p-4 hover:shadow-md transition-shadow text-left">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Analyse with Detector</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Check writing patterns</p>
            </button>
            <button className="card p-4 hover:shadow-md transition-shadow text-left">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Humanize Document</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Improve readability</p>
            </button>
            <button className="card p-4 hover:shadow-md transition-shadow text-left">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Analyse Writing Quality</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Get insights and suggestions</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
