import { Link } from 'react-router-dom';
import { Search, Wand2, FileText, ArrowRight, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Understand Your Writing.{' '}
          <span className="text-primary-600">Improve Every Word.</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Analyse writing patterns, improve clarity, and transform documents with intelligent writing tools.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/detector" className="btn-primary inline-flex items-center justify-center">
            <Search className="mr-2 h-5 w-5" />
            Analyse Text
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link to="/humanizer" className="btn-secondary inline-flex items-center justify-center">
            <Wand2 className="mr-2 h-5 w-5" />
            Humanize Text
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link to="/workspace" className="btn-secondary inline-flex items-center justify-center">
            <FileText className="mr-2 h-5 w-5" />
            Upload Document
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Platform Capabilities</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Comprehensive tools for writing analysis and improvement
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Search className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">AI Writing Detection</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Analyse text patterns to understand writing characteristics with transparent, evidence-based reporting and clear limitations.
            </p>
          </div>
          
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Wand2 className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Text Humanization</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Transform text into natural, fluent writing while preserving meaning, facts, citations, and numerical values.
            </p>
          </div>
          
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Document Processing</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload and process PDF, DOCX, and TXT files with robust extraction and support for long documents.
            </p>
          </div>
          
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Side-by-Side Comparison</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Compare original and rewritten versions with highlighted changes, accept/reject functionality, and diff visualization.
            </p>
          </div>
          
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Writing Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get insights on readability, sentence structure, repetition, and clarity with actionable suggestions.
            </p>
          </div>
          
          <div className="card p-6 space-y-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Export Options</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Export in PDF, DOCX, or TXT formats with formatting preservation and flexible options.
            </p>
          </div>
        </div>
      </section>

      {/* Important Note */}
      <section className="card p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">Important Notice</h3>
        <p className="text-amber-800 dark:text-amber-300 text-sm">
          AI authorship detection is not 100% accurate and cannot guarantee results. Humanized content is not guaranteed to evade all detectors. 
          All analysis includes limitations and uncertainty indicators. We prioritize reducing false accusations against human writers.
        </p>
      </section>
    </div>
  );
}
