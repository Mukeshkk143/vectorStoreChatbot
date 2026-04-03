import React, { useState } from 'react';
import { saveDataAnalysis } from '../api/chatbotApi';

export default function DataAnalysisModal({ token, sessionId, onClose, onSuccess }) {
  const [urlConfigs, setUrlConfigs] = useState([{ url: "", pages: 1 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scannedCount, setScannedCount] = useState(null);

  const handleAddRow = () => {
    setUrlConfigs([...urlConfigs, { url: "", pages: 1 }]);
  };

  const handleRemoveRow = (index) => {
    const updated = [...urlConfigs];
    updated.splice(index, 1);
    setUrlConfigs(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...urlConfigs];
    updated[index][field] = value;
    setUrlConfigs(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate
    const validConfigs = urlConfigs.filter(c => c.url.trim().length > 0);
    if (validConfigs.length === 0) {
      setError("Please add at least one valid URL.");
      return;
    }

    // Format numbers
    const payloadVars = validConfigs.map(c => ({
      url: c.url.trim(),
      pages: parseInt(c.pages, 10) || 1
    }));

    setLoading(true);
    try {
      const response = await saveDataAnalysis(token, sessionId, payloadVars);
      setScannedCount(response.scrapedCount);
      if (onSuccess) onSuccess(payloadVars);
      // Close the modal after a short delay so the user can see the result
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message || "Failed to save data analysis configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-lg rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">Data Analysis</h2>
          <button 
            onClick={onClose}
            className="text-[#6e6e80] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="px-6 py-5 overflow-y-auto w-full">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {scannedCount !== null && (
            <div className="mb-4 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Scan complete! Found {scannedCount} pages.
            </div>
          )}
          
          <p className="text-sm text-[#8e8ea0] mb-5">
            Provide the web URLs you'd like to analyze and the maximum number of pages to scrape for each.
          </p>

          <form id="data-analysis-form" onSubmit={handleSubmit} className="space-y-4">
            {urlConfigs.map((config, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[#c5c5d2] mb-1">Web URL</label>
                  <input 
                    type="url"
                    value={config.url}
                    onChange={(e) => handleChange(idx, 'url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border border-[#3a3a3a] bg-[#121212] px-3 py-2 text-sm text-white placeholder-[#6e6e80] outline-none focus:border-[#10a37f] transition-colors"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-[#c5c5d2] mb-1">Pages</label>
                  <input 
                    type="number"
                    min="1"
                    max="1000"
                    value={config.pages}
                    onChange={(e) => handleChange(idx, 'pages', e.target.value)}
                    className="w-full rounded-lg border border-[#3a3a3a] bg-[#121212] px-3 py-2 text-sm text-white outline-none focus:border-[#10a37f] transition-colors"
                    required
                  />
                </div>
                {urlConfigs.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveRow(idx)}
                    className="mt-6 p-2 text-[#6e6e80] hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                    title="Remove URL"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRow}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[#10a37f] hover:text-[#0d8a6a] transition-colors py-1 px-2 rounded hover:bg-[#10a37f]/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add URL
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2a2a2a] px-6 py-4 flex justify-end gap-3 bg-[#1e1e1e] rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-transparent rounded-lg hover:bg-[#2a2a2a] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            form="data-analysis-form"
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#10a37f] rounded-lg hover:bg-[#0e906f] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Scanning & Processing...
              </>
            ) : (
              "Submit Configuration"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
