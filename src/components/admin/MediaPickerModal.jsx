import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  UploadCloud,
  Search,
  Check,
  Trash2,
  Loader2,
  FolderOpen,
  RefreshCw,
  Image as ImageIcon,
  Copy,
} from "lucide-react";
import { apiClient } from "../../services/api";

const FOLDER_OPTIONS = [
  { id: "all", label: "All Media" },
  { id: "products", label: "Products" },
  { id: "sliders", label: "Sliders" },
  { id: "branding", label: "Logos & Branding" },
  { id: "library", label: "General Library" },
];

export const MediaPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  defaultFolder = "all",
  uploadFolder = "library",
  title = "Select from Media Library",
}) => {
  const [activeTab, setActiveTab] = useState("library");
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [folderFilter, setFolderFilter] = useState(defaultFolder);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [inspectedAsset, setInspectedAsset] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
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
    if (isOpen) {
      setSelectedUrls([]);
      setInspectedAsset(null);
      setStatusMsg("");
      loadAssets();
    }
  }, [isOpen, loadAssets]);

  const handleToggleSelect = (asset) => {
    setInspectedAsset(asset);
    if (multiple) {
      setSelectedUrls((prev) =>
        prev.includes(asset.url)
          ? prev.filter((u) => u !== asset.url)
          : [...prev, asset.url]
      );
    } else {
      setSelectedUrls([asset.url]);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedUrls.length === 0) return;
    if (onSelect) {
      onSelect(multiple ? selectedUrls : selectedUrls[0]);
    }
    onClose();
  };

  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && f.type.startsWith("image/"));
    if (files.length === 0) return;
    setIsUploading(true);
    setStatusMsg("");
    try {
      const targetFolder = folderFilter !== "all" ? folderFilter : (uploadFolder || "library");
      const res = await apiClient.uploadMediaAssets(files, targetFolder);
      const uploaded = res?.assets || (res?.asset ? [res.asset] : []);
      if (uploaded.length > 0) {
        setAssets((prev) => [...uploaded, ...prev]);
        const newUrls = uploaded.map((a) => a.url);
        setSelectedUrls((prev) => (multiple ? [...prev, ...newUrls] : [newUrls[0]]));
        setInspectedAsset(uploaded[0]);
        setActiveTab("library");
        setStatusMsg(`${uploaded.length} image(s) uploaded to Media Library.`);
      }
    } catch (err) {
      setStatusMsg(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAsset = async (asset) => {
    if (!asset?.id) return;
    setDeletingId(asset.id);
    try {
      const res = await apiClient.deleteMediaAsset(asset.id);
      if (res?.success) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        setSelectedUrls((prev) => prev.filter((u) => u !== asset.url));
        if (inspectedAsset?.id === asset.id) setInspectedAsset(null);
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
      setStatusMsg(`Scanned store assets (${res?.imported || 0} newly indexed).`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-neutral-900">{title}</h3>
              <p className="text-[11px] text-neutral-500">
                Central Database & Cloudinary / Server Media Library
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-neutral-200/70 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  activeTab === "library" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600"
                }`}
              >
                Media Library ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  activeTab === "upload" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600"
                }`}
              >
                Upload Files
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {activeTab === "upload" ? (
          <div className="p-8 flex-1 flex flex-col items-center justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
            />
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
              className={`w-full max-w-xl border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-emerald-600 bg-emerald-50/70 scale-[1.01]"
                  : "border-neutral-300 hover:border-emerald-500 bg-neutral-50"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
                  <p className="text-sm font-bold text-neutral-900">Uploading to Media Library...</p>
                  <p className="text-xs text-neutral-500 mt-1">Saving file & indexing in central database</p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-black text-neutral-900">
                    Drop images here or click to browse
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Supports multiple JPG, PNG, WEBP images — saved permanently in Media Library
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Grid Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Filter Bar */}
              <div className="p-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2.5 bg-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-neutral-100 rounded-xl px-2.5 py-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
                    <select
                      value={folderFilter}
                      onChange={(e) => setFolderFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
                    >
                      {FOLDER_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncExisting}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Index existing product, slider & logo images into Media Library"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                    <span>Sync Existing Assets</span>
                  </button>
                </div>

                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search media..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-neutral-100 border border-transparent focus:border-emerald-500 focus:bg-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              {statusMsg && (
                <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-[11px] font-bold text-emerald-800">
                  {statusMsg}
                </div>
              )}

              {/* Media Thumbnails Grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading && assets.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                    <span className="text-xs font-semibold">Loading Media Library...</span>
                  </div>
                ) : assets.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center space-y-3">
                    <ImageIcon className="w-10 h-10 text-neutral-300" />
                    <div>
                      <p className="text-sm font-bold text-neutral-700">No media files found</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Upload new files or click "Sync Existing Assets" to import existing product/logo images.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("upload")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Upload Images
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {assets.map((asset) => {
                      const isSelected = selectedUrls.includes(asset.url);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => handleToggleSelect(asset)}
                          className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all bg-neutral-100 ${
                            isSelected
                              ? "border-emerald-600 ring-3 ring-emerald-500/25 shadow-md"
                              : "border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          <img
                            src={asset.url}
                            alt={asset.alt_text || asset.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-semibold text-white truncate">
                              {asset.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Attachment Details Sidebar */}
            {inspectedAsset && (
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-neutral-200 bg-neutral-50 p-4 flex flex-col justify-between gap-3 overflow-y-auto shrink-0">
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block">
                    Attachment Details
                  </span>
                  <div className="aspect-video rounded-xl overflow-hidden border border-neutral-200 bg-white">
                    <img
                      src={inspectedAsset.url}
                      alt={inspectedAsset.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-neutral-900 break-words">{inspectedAsset.title}</p>
                    <p className="text-[11px] text-neutral-500 capitalize">
                      Folder: {inspectedAsset.folder} • {inspectedAsset.storage}
                    </p>
                    {inspectedAsset.width && inspectedAsset.height && (
                      <p className="text-[11px] text-neutral-500 font-mono">
                        {inspectedAsset.width} × {inspectedAsset.height}px
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(inspectedAsset.url)}
                    className="w-full py-1.5 px-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-[11px] font-bold text-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Image URL</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={deletingId === inspectedAsset.id}
                  onClick={() => handleDeleteAsset(inspectedAsset)}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletingId === inspectedAsset.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Permanently</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-neutral-600">
            {selectedUrls.length > 0
              ? `${selectedUrls.length} image(s) selected`
              : multiple
                ? "Select 1 or more images from library"
                : "Click an image to select"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedUrls.length === 0}
              onClick={handleConfirmSelection}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-40 cursor-pointer transition-all"
            >
              Use Selected Image{multiple && selectedUrls.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaPickerModal;

