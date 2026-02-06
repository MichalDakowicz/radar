import { useState } from "react";
import {
    X,
    Upload,
    Loader2,
    CheckCircle,
    AlertCircle,
    FileJson,
} from "lucide-react";

export default function LegacyImportModal({ isOpen, onClose, addMovie }) {
    const [isImporting, setIsImporting] = useState(false);
    const [importLog, setImportLog] = useState([]); 
    const [dragActive, setDragActive] = useState(false);

    const convertItem = (item) => {
        // Status mapping
        const status = item.wanted ? "Wishlist" : "Collection";

        // Format mapping
        const types = item.types || {};
        let format = "Digital";
        if (types.vinyl || types.cd || types.cassette) format = "Physical";

        // Director mapping (from Artist)
        const rawArtists = item.albumArtists || [];
        const artists = Array.isArray(rawArtists) ? rawArtists : [rawArtists];
        const director = artists.join(", "); 

        // Year/Released
        let year = "";
        if (item.releaseDate) {
           const match = item.releaseDate.match(/(\d{4})/);
           if (match) year = match[1];
           else year = item.releaseDate;
        }

        const newItem = {
            title: item.albumName,
            director: director || "Unknown Director",
            releaseDate: year,
            format: format,
            status: status,
            rating: 0,
            addedAt: Date.now(), 
        };
        
        if (item.id) {
            const parsed = parseInt(parseFloat(item.id));
             if (!isNaN(parsed) && parsed > 1000000000) newItem.addedAt = parsed;
        }

        // Clean up
        if (!newItem.releaseDate) delete newItem.releaseDate;

        return newItem;
    };

    const processFile = async (file) => {
        setIsImporting(true);
        setImportLog([]);
        const logs = [];
        const updateLogs = () => setImportLog([...logs]);

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const data = JSON.parse(text);

                if (!Array.isArray(data)) {
                    throw new Error("File content is not a JSON array.");
                }

                let count = 0;
                for (const item of data) {
                    count++;
                    try {
                        const newItem = convertItem(item);

                        if (!newItem.title) throw new Error("Missing title");

                        await addMovie(newItem);
                        logs.push({
                            status: "success",
                            message: `Imported: ${newItem.title}`,
                        });
                    } catch (err) {
                        console.error(err);
                        logs.push({
                            status: "error",
                            message: `Failed item: ${
                                item.albumName || "Unknown"
                            } - ${err.message}`,
                        });
                    }

                    if (count % 5 === 0) updateLogs();
                }
                updateLogs();
            } catch (err) {
                logs.push({
                    status: "error",
                    message: `File Parse Error: ${err.message}`,
                });
                updateLogs();
            } finally {
                setIsImporting(false);
            }
        };
        reader.onerror = () => {
            logs.push({ status: "error", message: "Failed to read file." });
            updateLogs();
            setIsImporting(false);
        };
        reader.readAsText(file);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    };

    const onDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const onFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            Legacy Import
                        </h2>
                        <p className="text-sm text-neutral-400 mt-1">
                            Import data from Legacy Music Tracker (JSON)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {!isImporting && importLog.length === 0 ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                                dragActive
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50"
                            }`}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                        >
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="p-4 bg-neutral-800 rounded-full">
                                    <Upload className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-white">
                                        Drag and drop your JSON file here
                                    </p>
                                    <p className="text-sm text-neutral-400 mt-1">
                                        or click to browse files
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={onFileChange}
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-full cursor-pointer transition-colors"
                                >
                                    Select File
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isImporting && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <span className="ml-3 text-lg font-medium">
                                        Processing your data...
                                    </span>
                                </div>
                            )}

                            {importLog.length > 0 && (
                                <div className="bg-black/40 rounded-lg p-4 font-mono text-sm max-h-75 overflow-y-auto border border-neutral-800">
                                    {importLog.map((log, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-start gap-2 mb-1 ${
                                                log.status === "error"
                                                    ? "text-red-400"
                                                    : "text-blue-400"
                                            }`}
                                        >
                                            {log.status === "error" ? (
                                                <AlertCircle
                                                    size={14}
                                                    className="mt-0.5 shrink-0"
                                                />
                                            ) : (
                                                <CheckCircle
                                                    size={14}
                                                    className="mt-0.5 shrink-0"
                                                />
                                            )}
                                            <span>{log.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
