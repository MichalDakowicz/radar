import { useRef, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, description, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false, isLoading = false }) {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div 
                ref={modalRef}
                className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white leading-tight">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-neutral-400 text-sm">
                                {description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                         <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                                isDestructive 
                                    ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20" 
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : isDestructive && (
                                <Trash2 size={18} />
                            )}
                            {isLoading ? "Processing..." : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
