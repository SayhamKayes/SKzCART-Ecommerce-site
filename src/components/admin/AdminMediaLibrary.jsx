import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Images,
  UploadCloud,
  Search,
  Trash2,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Save,
  FolderOpen,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";

const FOLDERS = [
  { id: "all", label: "All Files" },
  { id: "products", label: "Products" },
  { id: "sliders", label: "Sliders" },
  { id: "branding", label: "Logos & Branding" },
  { id: "library", label: "General Library" },
];

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const AdminMediaLibrary = () => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState("library");
  const [folderFilter, setFolderFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editFolder, setEditFolder] = useState("library");
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await apiClient.getMediaAssets({
        q: searchQuery.trim() || undefined,
        folder: folderFilter !== "all" ? folderFilter : undefined,
      });
      setAssets(list);
    } finally {
      setIsLoading(false);
    }
  }, [folderFilter, searchQuery]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setEditTitle(asset.title || "");
    setEditAlt(asset.alt_text || "");
    setEditFolder(asset.folder || "library");
  };

  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && f.type.startsWith("image/"));
    if (files.length === 0) return;
    setIsUploading(true);
    setFeedback(null);
    try {
      const res = await apiClient.uploadMediaAssets(files, uploadTargetFolder);
      const uploaded = res?.assets || (res?.asset ? [res.asset] : []);
      if (uploaded.length > 0) {
        setAssets((prev) => [...uploaded, ...prev]);
        handleSelectAsset(uploaded[0]);
        setFeedback({ type: "success", text: `${uploaded.length} file(s) uploaded to Media Library & Central Database.` });
      }
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Upload failed." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedAsset) return;
    setIsSavingMeta(true);
    try {
      const res = await apiClient.updateMediaAsset(selectedAsset.id, {
        title: editTitle,
        alt_text: editAlt,
        folder: editFolder,
      });
      if (res?.success && res.asset) {
        setAssets((prev) => prev.map((a) => (a.id === res.asset.id ? res.asset : a)));
        setSelectedAsset(res.asset);
        setFeedback({ type: "success", text: "Attachment metadata updated in database." });
      }
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteAsset) return;
    const target = confirmDeleteAsset;
    setConfirmDeleteAsset(null);
    setDeletingId(target.id);
    try {
      const res = await apiClient.deleteMediaAsset(target.id);
      if (res?.success) {
        setAssets((prev) => prev.filter((a) => a.id !== target.id));
        if (selectedAsset?.id === target.id) setSelectedAsset(null);
        try {
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "MEDIA" });
        } catch {}
        setFeedback({ type: "success", text: `"${target.title}" moved to Recycle Bin. You can restore it anytime from Recycle Bin.` });
      } else {
        setFeedback({ type: "error", text: res?.message || "Failed to delete media asset." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncExisting = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.syncMediaLibrary();
      await loadAssets();
      setFeedback({
        type: "success",
        text: `Synced existing assets: ${res?.imported || 0} newly added, ${res?.total || 0} total in Media Library.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = (asset) => {
    navigator.clipboard?.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Upload Trigger */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Images className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900">
              Media Library
            </h2>
            <p className="text-xs text-neutral-500">
              WordPress-style central media vault — upload once, reuse across Products, Sliders, Logos & Branding, or delete permanently.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={uploadTargetFolder}
            onChange={(e) => setUploadTargetFolder(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-800"
            title="Upload target folder"
          >
            <option value="library">Folder: General</option>
            <option value="products">Folder: Products</option>
            <option value="sliders">Folder: Sliders</option>
            <option value="branding">Folder: Branding</option>
          </select>

          <button
            type="button"
            onClick={handleSyncExisting}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Store Assets</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUploadFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{isUploading ? "Uploading..." : "Add New Media File"}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Drag & Drop Quick Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleUploadFiles(e.dataTransfer.files);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-600 bg-emerald-50 scale-[1.005]"
            : "border-neutral-300 hover:border-emerald-400 bg-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          </div>
          <div className="text-left">
            <p className="text-xs sm:text-sm font-bold text-neutral-900">
              Drag & Drop images anywhere here to upload to Central Media Library
            </p>
            <p className="text-[11px] text-neutral-500">
              Automatically synced to Cloudinary / Server storage + Central Database ({uploadTargetFolder} folder)
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Split: Grid + Attachment Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${selectedAsset ? "lg:col-span-8" : "lg:col-span-12"} bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden`}>
          {/* Toolbar */}
          <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FOLDERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFolderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    folderFilter === f.id
                      ? "bg-neutral-900 text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, alt text, URL..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="p-4 sm:p-5">
            {isLoading && assets.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-neutral-400">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs font-semibold">Loading Media Library...</span>
              </div>
            ) : assets.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Images className="w-12 h-12 text-neutral-300 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-neutral-800">No media assets yet</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Upload new images or click "Sync Store Assets" to import existing images into Media Library.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {assets.map((asset) => {
                  const isActive = selectedAsset?.id === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className={`group relative aspect-square rounded-2xl overflow-hidden border-2 bg-neutral-100 cursor-pointer transition-all ${
                        isActive
                          ? "border-emerald-600 ring-3 ring-emerald-500/20 shadow-md"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <img
                        src={asset.url}
                        alt={asset.alt_text || asset.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                        {asset.folder}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] font-semibold text-white truncate">{asset.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Attachment Details Panel */}
        {selectedAsset && (
          <div className="lg:col-span-4 bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                Attachment Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="text-xs text-neutral-400 hover:text-neutral-700 font-bold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="aspect-video rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
              <img
                src={selectedAsset.url}
                alt={selectedAsset.alt_text || selectedAsset.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] space-y-1 text-neutral-600">
              <div className="flex justify-between">
                <span>Storage:</span>
                <span className="font-bold uppercase text-neutral-900">{selectedAsset.storage}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-mono font-semibold text-neutral-900">{formatBytes(selectedAsset.file_size)}</span>
              </div>
              {selectedAsset.width && selectedAsset.height && (
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span className="font-mono font-semibold text-neutral-900">
                    {selectedAsset.width} × {selectedAsset.height}px
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">Alt Text (SEO)</label>
                <input
                  type="text"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  <span>Folder</span>
                </label>
                <select
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-semibold bg-white"
                >
                  <option value="library">General Library</option>
                  <option value="products">Products</option>
                  <option value="sliders">Sliders</option>
                  <option value="branding">Logos & Branding</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-neutral-700">File URL</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={selectedAsset.url}
                    className="flex-1 px-2.5 py-2 rounded-xl bg-neutral-100 border border-neutral-200 text-[11px] font-mono text-neutral-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(selectedAsset)}
                    className="px-2.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedId === selectedAsset.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={selectedAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-xs flex items-center"
                    title="Open original"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                disabled={isSavingMeta}
                onClick={handleSaveMetadata}
                className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Details</span>
              </button>
              <button
                type="button"
                disabled={deletingId === selectedAsset.id}
                onClick={() => setConfirmDeleteAsset(selectedAsset)}
                className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingId === selectedAsset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDeleteAsset && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-neutral-900">Move Media to Recycle Bin?</h4>
                <p className="text-xs text-neutral-500">
                  "{confirmDeleteAsset.title}" will be moved to the Recycle Bin. You can restore it anytime or permanently delete it from {confirmDeleteAsset.storage} storage later.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAsset(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
              >
                Move to Recycle Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMediaLibrary;

