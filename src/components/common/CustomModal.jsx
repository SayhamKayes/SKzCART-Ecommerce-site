import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Trash2, Info, X } from 'lucide-react';

export default function CustomModal({
  isOpen,
  onClose,
  type = 'info', // 'danger' | 'error' | 'success' | 'warning' | 'info'
  title,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  isConfirming = false,
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'error':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
        );
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <Info className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (type === 'danger' || type === 'error') {
      return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white';
    }
    if (type === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white';
    }
    return 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white';
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {getIcon()}
        <div className="text-center">
          <h3 className="text-base font-bold text-neutral-900">{title}</h3>
          {message && (
            <p className="text-xs text-neutral-500 mt-1 whitespace-pre-line leading-relaxed">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2">
          {cancelText && (
            <button
              type="button"
              disabled={isConfirming}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 ${getConfirmButtonClass()}`}
          >
            {isConfirming ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CustomModal };
