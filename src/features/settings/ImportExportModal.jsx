import { useState } from 'react';
import { X, Download, Upload, Loader2, CheckCircle, AlertCircle, FileJson, FileSpreadsheet } from 'lucide-react';

export default function ImportExportModal({ isOpen, onClose, movies, addMovie, removeMovie }) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState([]); // { status: 'success'|'error', message: string }
  const [showOtherItems, setShowOtherItems] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Filter count to match Stats/Home view (owned movies only)
  const collectionMovies = movies.filter(m => !m.status || m.status === 'Collection');
  const collectionCount = collectionMovies.length;
  const otherMovies = movies.filter(m => m.status && m.status !== 'Collection');

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(movies, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `radar_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = ['Title', 'Director', 'Year', 'Format', 'Status', 'TmdbID'];
    const rows = movies.map(m => [
        `"${(m.title || "").replace(/"/g, '""')}"`,
        `"${(Array.isArray(m.director) ? m.director.join(", ") : (m.director || "")).replace(/"/g, '""')}"`,
        m.releaseDate || "",
        m.format || "",
        m.status || "",
        m.tmdbId || ""
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `radar_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    setImportLog([]);
    
    const logs = [];
    const updateLogs = () => setImportLog([...logs]);

    // TRY JSON IMPORT FIRST
    try {
        const trimmed = importText.trim();
        // Heuristic: if it looks like JSON array, try to parse it strictly
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                let count = 0;
                for (const item of parsed) {
                    count++;
                    try {
                        const title = item.title;
                        const director = item.director || item.artist; // Fallback
                        
                        if (!title) throw new Error("Missing title");
                        
                        const normalizeDirector = (val) => {
                            if (Array.isArray(val)) return val.join(", ").toLowerCase();
                            return (val || "").toString().toLowerCase();
                        }

                        const isDuplicate = movies.some(m => 
                            (m.tmdbId && item.tmdbId && m.tmdbId === item.tmdbId) || 
                            (m.title.toLowerCase() === title.toLowerCase() && normalizeDirector(m.director) === normalizeDirector(director))
                        );
                        
                        if (isDuplicate) {
                            logs.push({ status: 'error', message: `Skipped Duplicate: ${title}` });
                        } else {
                            await addMovie({
                                ...item,
                                title,
                                director: director || "Unknown",
                                addedAt: item.addedAt || Date.now(),
                            });
                            logs.push({ status: 'success', message: `Imported: ${title}` });
                        }
                    } catch(err) {
                        logs.push({ status: 'error', message: `Failed item: ${item.title || 'Unknown'} - ${err.message}` });
                    }
                    
                    if (count % 10 === 0) updateLogs();
                }
                updateLogs();
                setIsImporting(false);
                return;
            }
        }
    } catch (e) {
        console.log("Not valid JSON, trying CSV/Text line mode", e);
    }

    // FALLBACK: CSV / LINE MODE
    const lines = importText.split('\n').filter(l => l.trim());
    let count = 0;
    
    for (const line of lines) {
        count++;
        try {
            let title, director;
            
            // Try CSV-like
            if (line.includes(',')) {
                const parts = line.split(',');
                title = parts[0].trim();
                director = parts[1].trim();
            } else if (line.includes(' - ')) {
                const parts = line.split(' - ');
                title = parts[0].trim();
                director = parts[1].trim();
            } else {
                 title = line.trim();
                 director = "Unknown";
            }
            
            if (!title) throw new Error("Could not parse Title");

            const normalizeDirector = (val) => {
                if (Array.isArray(val)) return val.join(", ").toLowerCase();
                return (val || "").toString().toLowerCase();
            }

            const isDuplicate = movies.some(m => 
                m.title.toLowerCase() === title.toLowerCase() && normalizeDirector(m.director) === normalizeDirector(director)
            );

            if (isDuplicate) {
                 logs.push({ status: 'error', message: `Skipped Duplicate: ${title}` });
            } else {
                await addMovie({
                    title,
                    director,
                    status: 'Collection',
                    format: 'Digital', // Default
                    addedAt: Date.now()
                });
                logs.push({ status: 'success', message: `Imported: ${title}` });
            }

        } catch (err) {
             logs.push({ status: 'error', message: `Failed line: "${line}" - ${err.message}` });
        }
        if (count % 5 === 0) updateLogs();
    }
    updateLogs();
    setIsImporting(false);
  };

  const currentTabClass = "bg-neutral-800 text-white shadow-sm";
  const inactiveTabClass = "text-neutral-400 hover:text-white hover:bg-neutral-800/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/50">
          <h2 className="text-xl font-bold text-white">Data Management</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-neutral-950/30">
            <button
                onClick={() => setActiveTab('export')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'export' ? currentTabClass : inactiveTabClass}`}
            >
                <Download size={16} /> Export
            </button>
            <button
                onClick={() => setActiveTab('import')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'import' ? currentTabClass : inactiveTabClass}`}
            >
                <Upload size={16} /> Import
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'export' ? (
                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 mb-4">
                            <Download size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-white">Export Your Library</h3>
                        <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                            Download a backup of your entire movie collection.
                            You currently have <span className="text-white font-bold">{movies.length}</span> movies.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <button 
                            onClick={handleExportJSON}
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 transition-all group"
                        >
                            <FileJson className="w-10 h-10 text-neutral-500 group-hover:text-blue-500 transition-colors" />
                            <div className="text-center">
                                <span className="block font-medium text-white">JSON Format</span>
                                <span className="text-xs text-neutral-500">Full backup including all metadata</span>
                            </div>
                        </button>
                        
                        <button 
                            onClick={handleExportCSV}
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 transition-all group"
                        >
                            <FileSpreadsheet className="w-10 h-10 text-neutral-500 group-hover:text-blue-500 transition-colors" />
                            <div className="text-center">
                                <span className="block font-medium text-white">CSV Format</span>
                                <span className="text-xs text-neutral-500">Spreadsheet compatible (Excel, Sheets)</span>
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="shrink-0">
                        <h3 className="text-lg font-semibold text-white mb-2">Import Data</h3>
                        <p className="text-sm text-neutral-400 mb-4">
                            Paste JSON data or CSV content below. Supported formats:
                            <br /> • Radar/Sonar JSON Backup
                            <br /> • Simple text list "Title - Director"
                        </p>
                    </div>

                    <div className="relative flex-1 min-h-[200px]">
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder='[{"title": "Inception", "director": "Christopher Nolan", ...}]'
                            className="w-full h-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-sm font-mono text-neutral-300 focus:outline-none focus:border-blue-500 resize-none"
                            disabled={isImporting}
                        />
                        {isImporting && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                                <Loader2 size={32} className="text-blue-500 animate-spin" />
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 flex items-center justify-between gap-4">
                         <div className="flex-1 h-32 overflow-y-auto bg-neutral-950 rounded-lg p-2 border border-neutral-800 text-xs font-mono">
                            {importLog.length === 0 ? (
                                <span className="text-neutral-600 italic">Logs will appear here...</span>
                            ) : (
                                <div className="space-y-1">
                                    {importLog.map((log, i) => (
                                        <div key={i} className={`flex items-start gap-2 ${log.status === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                                            {log.status === 'error' ? <AlertCircle size={12} className="mt-0.5 shrink-0" /> : <CheckCircle size={12} className="mt-0.5 shrink-0" />}
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                         </div>

                         <button
                            onClick={handleImport}
                            disabled={isImporting || !importText.trim()}
                            className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isImporting ? 'Importing...' : 'Start Import'}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
