import React, { useRef, useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  UploadCloud,
  ImageIcon,
  Check,
  Sparkles,
  Loader2,
  X,
  Tag,
  Wand2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../../services/api';

export const VariationManager = ({
  variants = [],
  onChangeVariants,
  basePrice = 0,
  baseRegularPrice = 0,
  baseStock = 20,
  baseSku = '',
  galleryImages = [], // Available images from main display and gallery
  isEnglish = false,
  onVariantImageAdded,
}) => {
  // Ensure variants is an array with at least one group
  const groups = Array.isArray(variants) && variants.length > 0
    ? variants
    : [{ name: 'Color', options: [] }];

  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [customInputText, setCustomInputText] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRefs = useRef({});

  // Ensure active index is within bounds
  const safeIdx = Math.min(activeGroupIdx, Math.max(0, groups.length - 1));
  const activeVariantGroup = groups[safeIdx] || { name: 'Color', options: [] };
  const attributeName = activeVariantGroup.name || 'Color';
  const options = Array.isArray(activeVariantGroup.options) ? activeVariantGroup.options : [];

  // Helper to update the options of the currently active attribute group
  const updateCurrentOptions = (newOptions) => {
    const updatedGroups = [...groups];
    updatedGroups[safeIdx] = {
      ...activeVariantGroup,
      name: attributeName,
      options: newOptions,
    };
    onChangeVariants(updatedGroups);
  };

  // Helper to change the name of the currently active attribute group
  const handleAttributeNameChange = (name) => {
    const updatedGroups = [...groups];
    updatedGroups[safeIdx] = {
      ...activeVariantGroup,
      name,
      options,
    };
    onChangeVariants(updatedGroups);
  };

  // Add a new attribute group (e.g. Color, Size, Package)
  const handleAddAttributeGroup = (newAttrName = 'Size') => {
    const newGroup = {
      name: newAttrName,
      options: [],
    };
    const updatedGroups = [...groups, newGroup];
    onChangeVariants(updatedGroups);
    setActiveGroupIdx(updatedGroups.length - 1);
  };

  // Remove an attribute group
  const handleRemoveAttributeGroup = (gIdx) => {
    if (groups.length <= 1) {
      // Just clear options instead of removing the only group
      updateCurrentOptions([]);
      return;
    }
    const updatedGroups = groups.filter((_, idx) => idx !== gIdx);
    onChangeVariants(updatedGroups);
    setActiveGroupIdx(Math.max(0, gIdx - 1));
  };

  // Add custom variations via text input (supports single or comma-separated names)
  const handleAddCustomVariations = (text) => {
    if (!text || !text.trim()) return;
    const names = text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    const currentOpts = [...options];
    const newOpts = names.map((name, i) => {
      const idxTotal = currentOpts.length + i;
      const cleanSkuSuffix = name
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();

      return {
        name,
        image: galleryImages[idxTotal] || galleryImages[idxTotal % Math.max(1, galleryImages.length)] || galleryImages[0] || '',
        price: basePrice || 0,
        regularPrice: baseRegularPrice || 0,
        stock: Math.floor(baseStock / Math.max(1, currentOpts.length + names.length)) || 10,
        sku: baseSku ? `${baseSku}-${cleanSkuSuffix || (idxTotal + 1)}` : '',
      };
    });

    updateCurrentOptions([...currentOpts, ...newOpts]);
    setCustomInputText('');
  };

  // Add a single custom variation from quick suggestion chip
  const handleAddSingleCustomVariation = (name) => {
    // Check if already exists
    const exists = options.some(
      (opt) => (typeof opt === 'object' ? opt.name : opt) === name
    );
    if (exists) return;

    const nextIdx = options.length;
    const newOpt = {
      name,
      image: galleryImages[nextIdx] || galleryImages[nextIdx % Math.max(1, galleryImages.length)] || galleryImages[0] || '',
      price: basePrice || 0,
      regularPrice: baseRegularPrice || 0,
      stock: Math.floor(baseStock / Math.max(1, nextIdx + 1)) || 10,
      sku: baseSku ? `${baseSku}-${name.slice(0, 3).toUpperCase()}` : '',
    };
    updateCurrentOptions([...options, newOpt]);
  };

  // Add a new empty variation card for manual entry
  const handleAddEmptyVariation = () => {
    const nextIdx = options.length + 1;
    const newOpt = {
      name: '', // Empty so merchant can immediately write their custom name
      image: galleryImages[nextIdx - 1] || galleryImages[0] || '',
      price: basePrice || 0,
      regularPrice: baseRegularPrice || 0,
      stock: Math.floor(baseStock / Math.max(1, nextIdx)) || 10,
      sku: baseSku ? `${baseSku}-V${nextIdx}` : '',
    };
    updateCurrentOptions([...options, newOpt]);
  };

  // Remove a variation by index
  const handleRemoveVariation = (idxToRemove) => {
    updateCurrentOptions(options.filter((_, idx) => idx !== idxToRemove));
  };

  // Update a field on a specific variation
  const handleFieldChange = (idx, field, value) => {
    const next = [...options];
    next[idx] = {
      ...next[idx],
      [field]: value,
    };
    updateCurrentOptions(next);
    if (field === 'image' && value && typeof onVariantImageAdded === 'function') {
      onVariantImageAdded(value);
    }
  };

  // Upload an image specifically for this variation
  const handleVariantImageUpload = async (idx, file) => {
    if (!file) return;
    setUploadingIndex(idx);
    try {
      const res = await apiClient.uploadProductImage(file);
      const url = res?.url || (typeof res === 'string' ? res : '');
      if (url) {
        handleFieldChange(idx, 'image', url);
        if (typeof onVariantImageAdded === 'function') {
          onVariantImageAdded(url);
        }
      }
    } catch (err) {
      console.error('Failed to upload variant image:', err);
      alert('Image upload failed. Please try again.');
    } finally {
      setUploadingIndex(null);
    }
  };

  // Dynamic suggestions based on the current attribute name
  const getSuggestions = (attr) => {
    const lower = (attr || '').toLowerCase();
    if (lower.includes('color')) {
      return ['Black', 'White', 'Red', 'Blue', 'Green', 'Pink', 'Maroon', 'Gold', 'Silver', 'Navy Blue'];
    }
    if (lower.includes('size')) {
      return ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
    }
    if (lower.includes('weight') || lower.includes('volume')) {
      return ['100g', '250g', '500g', '1kg', '2kg', '100ml', '250ml', '500ml', '1L'];
    }
    if (lower.includes('package') || lower.includes('combo')) {
      return ['Single Pack (1 Pc)', 'Double Pack (2 Pcs)', 'Family Combo (3 Pcs)', 'Mega Saver Pack'];
    }
    if (lower.includes('flavor')) {
      return ['Vanilla', 'Chocolate', 'Strawberry', 'Mango', 'Orange'];
    }
    if (lower.includes('model') || lower.includes('version')) {
      return ['Standard', 'Pro', 'Max', 'Ultra', 'Classic'];
    }
    return ['Option A', 'Option B', 'Special Edition', 'Premium Quality', 'Combo Set'];
  };

  // Attribute presets
  const attributePresets = [
    { label: 'Color', name: 'Color' },
    { label: 'Size', name: 'Size' },
    { label: 'Package', name: 'Package' },
    { label: 'Flavor', name: 'Flavor' },
    { label: 'Model', name: 'Model' },
    { label: 'Weight', name: 'Weight' },
    { label: 'Material', name: 'Material' },
  ];

  return (
    <div className="p-4 bg-emerald-50/40 rounded-3xl border border-emerald-200/90 space-y-4 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <span>{'Product Variations Management'}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-md">
                Custom Variations
              </span>
            </h4>
            <p className="text-[11px] text-neutral-500">
              Add colors, sizes, or custom variations with your desired labels
            </p>
          </div>
        </div>

        {/* Attribute Group Tabs */}
        {groups.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {groups.map((grp, gIdx) => (
              <div key={gIdx} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveGroupIdx(gIdx)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                    safeIdx === gIdx
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-emerald-50'
                  }`}
                >
                  <span>{grp.name || `Attribute #${gIdx + 1}`}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    safeIdx === gIdx ? 'bg-emerald-800 text-emerald-100' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {grp.options?.length || 0}
                  </span>
                </button>
                {groups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAttributeGroup(gIdx)}
                    className="ml-1 p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                    title="Delete this attribute"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleAddAttributeGroup('Size')}
              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-dashed border-emerald-400 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              title="Add another attribute (e.g. Size, Package)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Attribute</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Attribute Name Selection & Custom Input */}
      <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
            <span>Variation Attribute Name (e.g., Color, Size, etc.) *</span>
          </label>
          <span className="text-[11px] text-neutral-400">Type custom name or select preset</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={attributeName}
            onChange={(e) => handleAttributeNameChange(e.target.value)}
            placeholder="e.g. Color, Size, or custom attribute name..."
            className="flex-1 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-neutral-400 font-semibold py-0.5">Presets:</span>
          {attributePresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAttributeNameChange(preset.name)}
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                attributeName === preset.name
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Fast Custom Variation Adder Box */}
      <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Add Custom Variations</span>
          </label>
          <span className="text-[11px] text-neutral-400">
            (Enter comma-separated values, e.g.: Red, Blue, Green)
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomVariations(customInputText);
              }
            }}
            placeholder="e.g. Classic White, Royal Emerald, Rose Pink (comma-separated)..."
            className="flex-1 px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={() => handleAddCustomVariations(customInputText)}
            disabled={!customInputText.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Variation</span>
          </button>
        </div>

        {/* Smart Click-to-Add Suggestions based on current attribute */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-neutral-500">
            1-Click Quick Add:
          </span>
          {getSuggestions(attributeName).map((sugg) => {
            const isAlreadyAdded = options.some(
              (o) => (typeof o === 'object' ? o.name : o) === sugg
            );
            return (
              <button
                key={sugg}
                type="button"
                onClick={() => handleAddSingleCustomVariation(sugg)}
                disabled={isAlreadyAdded}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  isAlreadyAdded
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 opacity-60 cursor-not-allowed'
                    : 'bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-800 border-neutral-200 hover:border-emerald-400'
                }`}
                title={isAlreadyAdded ? 'Already added' : `+ Add ${sugg} variation`}
              >
                {isAlreadyAdded ? `✓ ${sugg}` : `+ ${sugg}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Variations List */}
      <div className="space-y-3">
        {options.length === 0 ? (
          <div className="text-center py-6 px-4 bg-white/80 rounded-2xl border border-dashed border-emerald-300 text-neutral-500 space-y-2">
            <Layers className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <p className="text-xs font-bold text-neutral-700">
              No variations created yet
            </p>
            <p className="text-[11px] text-neutral-400">
              Type names above and press Enter, or click the button below to add a blank variation.
            </p>
            <button
              type="button"
              onClick={handleAddEmptyVariation}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Blank Variation</span>
            </button>
          </div>
        ) : (
          options.map((opt, idx) => {
            const optName = typeof opt === 'object' ? (opt.name || '') : opt;
            const optImg = typeof opt === 'object' ? opt.image : (galleryImages[idx] || '');
            const optPrice = typeof opt === 'object' ? (opt.price !== undefined ? opt.price : basePrice) : basePrice;
            const optRegularPrice = typeof opt === 'object' ? (opt.regularPrice !== undefined ? opt.regularPrice : baseRegularPrice) : baseRegularPrice;
            const optStock = typeof opt === 'object' ? (opt.stock !== undefined ? opt.stock : 10) : 10;
            const optSku = typeof opt === 'object' ? (opt.sku || '') : '';

            return (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3 hover:border-emerald-300 transition-colors"
              >
                {/* Variation Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-neutral-800">
                      Variation: <span className="text-emerald-700 font-extrabold">{optName || `Custom Variation #${idx + 1}`}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveVariation(idx)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    title="Delete this variation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                {/* Option Name Input */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-neutral-700">
                        Custom Variation Name *
                      </label>
                      {optName && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {optName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={optName}
                      onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                      placeholder="e.g. Classic White, Royal Emerald..."
                      className="w-full px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-300 text-xs font-semibold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  {/* Image Picker for this Variant */}
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Variation Image *
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Image Preview Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-200 shrink-0 bg-neutral-100 relative group">
                        {optImg ? (
                          <>
                            <img src={optImg} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleFieldChange(idx, 'image', '')}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remove Image"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Upload local image for variant */}
                      <input
                        ref={(el) => (fileInputRefs.current[idx] = el)}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (file) handleVariantImageUpload(idx, file);
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        disabled={uploadingIndex === idx}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 hover:border-emerald-600 bg-neutral-50 hover:bg-white text-xs font-semibold text-neutral-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {uploadingIndex === idx ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Upload Image</span>
                          </>
                        )}
                      </button>

                      {/* Or Quick-Pick from Gallery Images */}
                      {galleryImages.length > 0 && (
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                          <span className="text-[10px] text-neutral-400 font-semibold shrink-0">or from gallery:</span>
                          {galleryImages.map((gImg, gIdx) => (
                            <button
                              key={gIdx}
                              type="button"
                              onClick={() => handleFieldChange(idx, 'image', gImg)}
                              className={`w-7 h-7 rounded-lg overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                                optImg === gImg ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-neutral-200 opacity-60 hover:opacity-100'
                              }`}
                              title={`Select gallery image #${gIdx + 1}`}
                            >
                              <img src={gImg} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing & Stock for this Variant */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-100 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Selling Price (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={optPrice}
                      onChange={(e) => handleFieldChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Regular Price (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={optRegularPrice}
                      onChange={(e) => handleFieldChange(idx, 'regularPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={optStock}
                      onChange={(e) => handleFieldChange(idx, 'stock', parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      Variation SKU
                    </label>
                    <input
                      type="text"
                      value={optSku}
                      placeholder="e.g. BD-7136-WHT"
                      onChange={(e) => handleFieldChange(idx, 'sku', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-300 font-mono text-[11px] focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Variation Button */}
      {options.length > 0 && (
        <button
          type="button"
          onClick={handleAddEmptyVariation}
          className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>+ Add Another Blank Variation</span>
        </button>
      )}
    </div>
  );
};

export default VariationManager;
