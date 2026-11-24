import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  AlertTriangle,
  UploadCloud,
  Trash2,
  Pencil,
  X,
  Check,
  Layers,
  Image as ImageIcon,
  Images,
  Loader2,
  Boxes,
  Zap,
  Tag,
  Flame,
  Package,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { AdminBulkCsvModal } from "./AdminBulkCsvModal";
import { MediaPickerModal } from "./MediaPickerModal";
import { VariationManager } from "../Product/productTypes";
import { formatBDT } from "../../utils/bangladesh";
import { apiClient } from "../../services/api";
import { realtimeService } from "../../services/realtime";
import { getUniqueCategories, matchesCategory } from "../../utils/categories";
import { PRODUCT_TAGS, getProductTagInfo } from "../../utils/productTags";
import { useLanguage } from "../../Context/LanguageContext";
import { DEFAULT_PRODUCT_PLACEHOLDER, handleProductImageError } from "../../utils/productImage";

/**
 * Word-like formatting helper for textareas:
 * Bold (**text**), Italic (*text*), Bullet list (• ), Numbered list (1. 2. 3.), Checkmark (✓ )
 */
const applyFormatting = (textarea, value, setValue, type) => {
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selectedText = value.substring(start, end);

  let replacement = "";
  let newCursorPos = start;

  if (type === "bold") {
    if (selectedText) {
      replacement = `**${selectedText}**`;
      newCursorPos = start + replacement.length;
    } else {
      replacement = "**Bold Text**";
      newCursorPos = start + 2;
    }
    const newVal = value.substring(0, start) + replacement + value.substring(end);
    setValue(newVal);
  } else if (type === "italic") {
    if (selectedText) {
      replacement = `*${selectedText}*`;
      newCursorPos = start + replacement.length;
    } else {
      replacement = "*Italic Text*";
      newCursorPos = start + 1;
    }
    const newVal = value.substring(0, start) + replacement + value.substring(end);
    setValue(newVal);
  } else if (type === "bullet") {
    if (selectedText) {
      replacement = selectedText
        .split("\n")
        .map((l) => (l.startsWith("• ") ? l : `• ${l}`))
        .join("\n");
    } else {
      replacement = "• ";
    }
    const newVal = value.substring(0, start) + replacement + value.substring(end);
    setValue(newVal);
    newCursorPos = start + replacement.length;
  } else if (type === "number") {
    if (selectedText) {
      let idx = 1;
      replacement = selectedText
        .split("\n")
        .map((l) => {
          if (/^\d+\.\s/.test(l)) return l;
          return `${idx++}. ${l}`;
        })
        .join("\n");
    } else {
      replacement = "1. ";
    }
    const newVal = value.substring(0, start) + replacement + value.substring(end);
    setValue(newVal);
    newCursorPos = start + replacement.length;
  } else if (type === "check") {
    if (selectedText) {
      replacement = selectedText
        .split("\n")
        .map((l) => (l.startsWith("✓ ") ? l : `✓ ${l}`))
        .join("\n");
    } else {
      replacement = "✓ ";
    }
    const newVal = value.substring(0, start) + replacement + value.substring(end);
    setValue(newVal);
    newCursorPos = start + replacement.length;
  }

  setTimeout(() => {
    try {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    } catch {}
  }, 0);
};

const FormattingToolbar = ({ textareaRef, value, setValue, label }) => (
  <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100/90 border border-neutral-300 border-b-0 rounded-t-xl text-neutral-600">
    <span className="text-[11px] font-bold text-neutral-700 flex items-center gap-1.5">
      <span>{label}</span>
    </span>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => applyFormatting(textareaRef.current, value, setValue, "bold")}
        className="px-2 py-0.5 rounded hover:bg-neutral-200 active:bg-neutral-300 text-neutral-900 font-black text-xs transition-colors cursor-pointer"
        title="Bold (**Text**)"
      >
        <span className="font-serif">B</span>
      </button>
      <button
        type="button"
        onClick={() => applyFormatting(textareaRef.current, value, setValue, "italic")}
        className="px-2 py-0.5 rounded hover:bg-neutral-200 active:bg-neutral-300 text-neutral-900 italic font-serif text-xs transition-colors cursor-pointer"
        title="Italic (*Text*)"
      >
        <span>I</span>
      </button>
      <span className="text-neutral-300">|</span>
      <button
        type="button"
        onClick={() => applyFormatting(textareaRef.current, value, setValue, "bullet")}
        className="px-2 py-0.5 rounded hover:bg-neutral-200 active:bg-neutral-300 text-neutral-800 text-[11px] font-semibold flex items-center gap-0.5 transition-colors cursor-pointer"
        title="Bullet Point List (• Dot)"
      >
        <span className="text-sm leading-none">•</span>
        <span>Bullet</span>
      </button>
      <button
        type="button"
        onClick={() => applyFormatting(textareaRef.current, value, setValue, "number")}
        className="px-2 py-0.5 rounded hover:bg-neutral-200 active:bg-neutral-300 text-neutral-800 text-[11px] font-bold transition-colors cursor-pointer"
        title="Numbered List (1. 2. 3.)"
      >
        <span>1.2.3</span>
      </button>
      <button
        type="button"
        onClick={() => applyFormatting(textareaRef.current, value, setValue, "check")}
        className="px-2 py-0.5 rounded hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer"
        title="Checkmark List (✓ Check)"
      >
        <span>✓ Check</span>
      </button>
    </div>
  </div>
);

const autoTranslateProductPayload = async (data) => data;


const AdminProducts = ({
  products = [],
  categories: propCategories,
  onUpdateProductStock,
  onBulkUpdateStock,
  onAddNewProduct,
  onUpdateProduct,
  onDeleteProduct,
  onReorderProducts,
  onRefreshData,
}) => {
  const { isEnglish, getProductName, getCategoryName } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkCsvModalOpen, setIsBulkCsvModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag and Drop Product Reordering States
  const [draggedProductId, setDraggedProductId] = useState(null);
  const [dragOverProductId, setDragOverProductId] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  // Form States for Add Product
  const [newName, setNewName] = useState("");
  const [newNameBn, setNewNameBn] = useState("");
  const [categorySelect, setCategorySelect] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [newPrice, setNewPrice] = useState(1500);
  const [newRegularPrice, setNewRegularPrice] = useState(2000);
  const [newStock, setNewStock] = useState(25);
  const [newIsOutOfStock, setNewIsOutOfStock] = useState(false);
  const [newSku, setNewSku] = useState(`BD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newTag, setNewTag] = useState("");

  // New Requested Fields for Add Product
  const [newShortDescription, setNewShortDescription] = useState("");
  const [newKeyFeatures, setNewKeyFeatures] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const newShortDescRef = useRef(null);
  const newKeyFeatRef = useRef(null);
  const newDescRef = useRef(null);

  // Cloudinary Image Upload States for Add
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadedPublicId, setUploadedPublicId] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isDragOverImage, setIsDragOverImage] = useState(false);
  const [imageMessage, setImageMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef(null);

  // Edit Product Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editNameBn, setEditNameBn] = useState("");
  const [editCategorySelect, setEditCategorySelect] = useState("");
  const [isEditCustomCategory, setIsEditCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editRegularPrice, setEditRegularPrice] = useState(0);
  const [editStock, setEditStock] = useState(0);
  const [editIsOutOfStock, setEditIsOutOfStock] = useState(false);
  const [editSku, setEditSku] = useState("");
  const [editTag, setEditTag] = useState("");

  // New Requested Fields for Edit Product
  const [editShortDescription, setEditShortDescription] = useState("");
  const [editKeyFeatures, setEditKeyFeatures] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const editShortDescRef = useRef(null);
  const editKeyFeatRef = useRef(null);
  const editDescRef = useRef(null);

  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImagePublicId, setEditImagePublicId] = useState("");
  const [isEditUploadingImage, setIsEditUploadingImage] = useState(false);
  const [isEditDeletingImage, setIsEditDeletingImage] = useState(false);
  const [isEditDragOverImage, setIsEditDragOverImage] = useState(false);
  const [editImageMessage, setEditImageMessage] = useState({ text: "", type: "" });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  // Gallery images states for Add Product
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const galleryFileInputRef = useRef(null);

  // Gallery images states for Edit Product
  const [editGalleryImages, setEditGalleryImages] = useState([]);
  const [isEditUploadingGallery, setIsEditUploadingGallery] = useState(false);
  const editGalleryFileInputRef = useRef(null);

  // Media Library Picker Modal Target ('addMain' | 'addGallery' | 'editMain' | 'editGallery' | null)
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  // Product Type & Variations States for Add Product
  const [newProductType, setNewProductType] = useState("standard");
  const [newVariants, setNewVariants] = useState([]);

  // Product Type & Variations States for Edit Product
  const [editProductType, setEditProductType] = useState("standard");
  const [editVariants, setEditVariants] = useState([]);

  // Auto-sync variant images to newGalleryImages
  const handleNewVariantsChange = (updatedVariants) => {
    setNewVariants(updatedVariants);
    if (Array.isArray(updatedVariants)) {
      const variantImgs = [];
      for (const grp of updatedVariants) {
        if (Array.isArray(grp?.options)) {
          for (const opt of grp.options) {
            const img = typeof opt === 'object' ? opt.image : null;
            if (img && typeof img === 'string' && img.trim() && !variantImgs.includes(img.trim())) {
              variantImgs.push(img.trim());
            }
          }
        }
      }
      if (variantImgs.length > 0) {
        setNewGalleryImages(prev => {
          const next = [...prev];
          let changed = false;
          for (const img of variantImgs) {
            if (!next.includes(img) && img !== uploadedImageUrl) {
              next.push(img);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
  };

  // Auto-sync variant images to editGalleryImages
  const handleEditVariantsChange = (updatedVariants) => {
    setEditVariants(updatedVariants);
    if (Array.isArray(updatedVariants)) {
      const variantImgs = [];
      for (const grp of updatedVariants) {
        if (Array.isArray(grp?.options)) {
          for (const opt of grp.options) {
            const img = typeof opt === 'object' ? opt.image : null;
            if (img && typeof img === 'string' && img.trim() && !variantImgs.includes(img.trim())) {
              variantImgs.push(img.trim());
            }
          }
        }
      }
      if (variantImgs.length > 0) {
        setEditGalleryImages(prev => {
          const next = [...prev];
          let changed = false;
          for (const img of variantImgs) {
            if (!next.includes(img) && img !== editImageUrl) {
              next.push(img);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    }
  };

  // Gallery Upload Handlers
  const handleGalleryFilesChange = async (e, isEdit = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (isEdit) setIsEditUploadingGallery(true);
    else setIsUploadingGallery(true);

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        const res = await apiClient.uploadProductImage(file);
        if (res && res.url) {
          if (isEdit) {
            setEditGalleryImages((prev) => [...prev, res.url]);
          } else {
            setNewGalleryImages((prev) => [...prev, res.url]);
          }
        }
      }
    } catch (err) {
      console.error("Gallery upload error:", err);
    } finally {
      if (isEdit) {
        setIsEditUploadingGallery(false);
        if (editGalleryFileInputRef.current) editGalleryFileInputRef.current.value = "";
      } else {
        setIsUploadingGallery(false);
        if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
      }
    }
  };

  const [draggedGalleryIdx, setDraggedGalleryIdx] = useState(null);

  const handleRemoveGalleryImage = async (index, isEdit = false) => {
    const list = isEdit ? editGalleryImages : newGalleryImages;
    const targetUrl = list[index];

    // Optimistically remove from state
    if (isEdit) {
      setEditGalleryImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNewGalleryImages((prev) => prev.filter((_, i) => i !== index));
    }

    // Delete image from Cloudinary or local media storage to free up quota
    if (targetUrl && (targetUrl.includes('cloudinary') || targetUrl.includes('/media/products/'))) {
      try {
        await apiClient.deleteProductImage(targetUrl);
      } catch (err) {
        console.warn('Failed to delete image from Cloudinary:', err);
      }
    }
  };

  const handleMoveGalleryImage = (index, direction, isEdit = false) => {
    const list = isEdit ? [...editGalleryImages] : [...newGalleryImages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    if (isEdit) {
      setEditGalleryImages(list);
    } else {
      setNewGalleryImages(list);
    }
  };

  const handleReorderGallery = (dragIdx, dropIdx, isEdit = false) => {
    if (dragIdx === null || dragIdx === undefined || dragIdx === dropIdx) return;
    const list = isEdit ? [...editGalleryImages] : [...newGalleryImages];
    const [moved] = list.splice(dragIdx, 1);
    list.splice(dropIdx, 0, moved);
    if (isEdit) {
      setEditGalleryImages(list);
    } else {
      setNewGalleryImages(list);
    }
    setDraggedGalleryIdx(null);
  };

  const editFileInputRef = useRef(null);

  // Dedicated Form Reset Helper for Add Product Modal (Ensures clean slate for gallery images & all fields)
  const resetAddProductForm = () => {
    setNewName("");
    setNewNameBn("");
    setNewPrice(1500);
    setNewRegularPrice(2000);
    setNewStock(25);
    setNewIsOutOfStock(false);
    setNewSku(`BD-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewTag("");
    setNewShortDescription("");
    setNewKeyFeatures("");
    setNewDescription("");
    setUploadedImageUrl("");
    setUploadedPublicId("");
    setNewGalleryImages([]);
    setNewProductType("standard");
    setNewVariants([]);
    setIsCustomCategory(false);
    setCustomCategoryInput("");
    setImageMessage({ text: "", type: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  };

  const handleOpenAddModal = () => {
    resetAddProductForm();
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    resetAddProductForm();
    setIsAddModalOpen(false);
  };

  // Stock Control State per row
  const [stockInputs, setStockInputs] = useState({});
  const [savedRowId, setSavedRowId] = useState(null);

  // Bulk Stock Adder State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkAdjustment, setBulkAdjustment] = useState(10);
  const [bulkMode, setBulkMode] = useState("add"); // 'add' or 'set'
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Delete product state
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Multi-select & Batch Deletion States
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Toggle single product selection
  const handleToggleSelectProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  // Confirm and execute bulk deletion
  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const res = await apiClient.bulkDeleteProducts(selectedProductIds);
      if (res && res.success) {
        setSelectedProductIds([]);
        setIsBulkDeleteModalOpen(false);
        try {
          realtimeService.broadcast("PRODUCT_DELETED", { bulk: true });
          realtimeService.broadcast("RECYCLE_BIN_UPDATED", { itemType: "PRODUCT" });
        } catch {}
        if (typeof onRefreshData === "function") {
          await onRefreshData();
        }
      } else {
        alert(res?.message || "Failed to delete products");
      }
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert(`Failed to delete: ${err.message || "Server not responding"}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Clean deduplicated category list from products without double language duplicates
  const categories = propCategories || getUniqueCategories(products);

  // Available selectable categories in modal (excluding "ALL")
  const selectableCategories = categories.filter((c) => c !== "ALL");

  // Keep categorySelect updated to first category if empty
  useEffect(() => {
    if (!categorySelect && selectableCategories.length > 0) {
      setCategorySelect(selectableCategories[0]);
    }
  }, [selectableCategories, categorySelect]);

  // Sync row stock inputs when products change
  useEffect(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p.stock;
    });
    setStockInputs(map);
  }, [products]);

  // Filtered products list using canonical matching
  const filteredProducts = products.filter((p) => {
    const matchCat = matchesCategory(p.category, selectedCategory);
    const q = searchQuery.toLowerCase().trim();
    const matchQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameBn && p.nameBn.includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  // Pagination State for Products Table
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const totalFilteredProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalFilteredProducts / productsPerPage) || 1;
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = Math.min(startIndex + productsPerPage, totalFilteredProducts);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Multi-select helpers
  const allFilteredSelected = Boolean(
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.includes(p.id))
  );

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredProducts.map((p) => p.id));
      setSelectedProductIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredProducts.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Calculate quick stats
  const totalStockCount = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const outOfStockCount = products.filter((p) => p.isOutOfStock || (p.stock !== undefined && Number(p.stock) <= 0)).length;
  const lowStockCount = products.filter((p) => !p.isOutOfStock && p.stock > 0 && p.stock <= 10).length;

  // Handle Local PC file selection and upload (Add Modal - Silent without intrusive confirmation)
  const handleImageFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageMessage({ text: "Please select an image file (JPG, PNG, WEBP)", type: "error" });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setImageMessage({ text: "Image size must be under 25MB", type: "error" });
      return;
    }

    setIsUploadingImage(true);
    setImageMessage({ text: "", type: "" });

    try {
      const res = await apiClient.uploadProductImage(file);
      if (res && res.url) {
        setUploadedImageUrl(res.url);
        setUploadedPublicId(res.public_id || "");
        setImageMessage({ text: "", type: "" });
      } else {
        throw new Error(res.error || res.message || "Upload failed");
      }
    } catch (err) {
      setImageMessage({
        text: `Upload error: ${err.message || "Failed to upload image"}`,
        type: "error",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Delete Image from Cloudinary (Add Modal)
  const handleDeleteUploadedImage = async () => {
    if (!uploadedImageUrl && !uploadedPublicId) return;

    setIsDeletingImage(true);
    setImageMessage({ text: "", type: "" });

    try {
      await apiClient.deleteProductImage({
        public_id: uploadedPublicId,
        url: uploadedImageUrl,
      });

      setUploadedImageUrl("");
      setUploadedPublicId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setImageMessage({ text: "", type: "" });
    } catch (err) {
      setImageMessage({
        text: `Delete error: ${err.message || "Failed to delete image"}`,
        type: "error",
      });
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Handle Local PC file selection and upload (Edit Modal - Silent without intrusive confirmation)
  const handleEditImageFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditImageMessage({ text: "Please select an image file (JPG, PNG, WEBP)", type: "error" });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setEditImageMessage({ text: "Image size must be under 25MB", type: "error" });
      return;
    }

    setIsEditUploadingImage(true);
    setEditImageMessage({ text: "", type: "" });

    try {
      const res = await apiClient.uploadProductImage(file);
      if (res && res.url) {
        setEditImageUrl(res.url);
        setEditImagePublicId(res.public_id || "");
        setEditImageMessage({ text: "", type: "" });
      } else {
        throw new Error(res.error || res.message || "Upload failed");
      }
    } catch (err) {
      setEditImageMessage({
        text: `Upload error: ${err.message || "Failed to upload image"}`,
        type: "error",
      });
    } finally {
      setIsEditUploadingImage(false);
    }
  };

  // Handle Delete Image from Cloudinary (Edit Modal)
  const handleDeleteEditImage = async () => {
    if (!editImageUrl) return;

    setIsEditDeletingImage(true);
    setEditImageMessage({ text: "", type: "" });

    try {
      await apiClient.deleteProductImage({
        public_id: editImagePublicId,
        url: editImageUrl,
      });

      setEditImageUrl("");
      setEditImagePublicId("");
      if (editFileInputRef.current) {
        editFileInputRef.current.value = "";
      }
      setEditImageMessage({ text: "", type: "" });
    } catch (err) {
      setEditImageMessage({
        text: `Delete error: ${err.message || "Failed to delete image"}`,
        type: "error",
      });
    } finally {
      setIsEditDeletingImage(false);
    }
  };

  // Handle Stock Input Change per row
  const handleStockInputChange = (productId, val) => {
    const num = parseInt(val);
    setStockInputs((prev) => ({
      ...prev,
      [productId]: isNaN(num) ? "" : Math.max(0, num),
    }));
  };

  // Commit stock change to backend and DB
  const handleCommitStockUpdate = async (productId) => {
    const val = stockInputs[productId];
    const newStockVal = Math.max(0, parseInt(val) || 0);
    setStockInputs((prev) => ({ ...prev, [productId]: newStockVal }));

    if (onUpdateProductStock) {
      await onUpdateProductStock(productId, newStockVal);
      setSavedRowId(productId);
      setTimeout(() => setSavedRowId(null), 1800);
    }
  };

  // Quick increment/decrement steppers
  const handleQuickStepStock = async (productId, delta) => {
    const current = stockInputs[productId] ?? (products.find((p) => p.id === productId)?.stock || 0);
    const nextVal = Math.max(0, current + delta);
    setStockInputs((prev) => ({ ...prev, [productId]: nextVal }));
    if (onUpdateProductStock) {
      await onUpdateProductStock(productId, nextVal);
      setSavedRowId(productId);
      setTimeout(() => setSavedRowId(null), 1800);
    }
  };

  // Handle Bulk Stock Adjustment
  const handleApplyBulkStock = async () => {
    if (!filteredProducts.length || isBulkSubmitting) return;

    setIsBulkSubmitting(true);
    try {
      const productIds = filteredProducts.map((p) => p.id);
      if (bulkMode === "add") {
        if (onBulkUpdateStock) {
          await onBulkUpdateStock({
            adjustment: parseInt(bulkAdjustment) || 0,
            product_ids: productIds,
          });
        }
      } else {
        if (onBulkUpdateStock) {
          await onBulkUpdateStock({
            set_stock: Math.max(0, parseInt(bulkAdjustment) || 0),
            product_ids: productIds,
          });
        }
      }
      setIsBulkOpen(false);
    } catch (err) {
      console.error("Bulk stock update failed:", err);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Open Edit Modal for a Product
  const handleOpenEditModal = (product) => {
    setEditingProductId(product.id);
    setEditName(product.name || "");
    setEditNameBn(product.nameBn || "");

    const cat = product.category || "";
    if (selectableCategories.includes(cat)) {
      setEditCategorySelect(cat);
      setIsEditCustomCategory(false);
      setEditCustomCategoryInput("");
    } else {
      setEditCategorySelect(selectableCategories[0] || "");
      setIsEditCustomCategory(true);
      setEditCustomCategoryInput(cat);
    }

    setEditPrice(product.price ?? 0);
    setEditRegularPrice(product.regularPrice || product.price || 0);
    setEditStock(product.stock ?? 0);
    setEditIsOutOfStock(Boolean(product.isOutOfStock) || (product.stock !== undefined && Number(product.stock) <= 0));
    setEditSku(product.sku || "");

    // Pre-fill Tag / Badge
    const matchedTagInfo = getProductTagInfo(product);
    const currentTag = matchedTagInfo?.id || product.badge || product.tag || "";
    setEditTag(currentTag);

    // Pre-fill new requested fields
    setEditShortDescription(product.shortDescription || "");
    const rawFeat = product.keyFeatures || product.features;
    if (Array.isArray(rawFeat)) {
      setEditKeyFeatures(
        rawFeat
          .map((f) => {
            const str = typeof f === 'string' ? f : String(f?.text || f || '');
            return (str.startsWith('•') || str.startsWith('✓')) ? str : `• ${str}`;
          })
          .join("\n")
      );
    } else {
      setEditKeyFeatures(typeof rawFeat === 'string' ? rawFeat : "");
    }
    setEditDescription(product.description || "");

    const currentImg =
      product.images && product.images[0] ? product.images[0] : product.image || "";
    setEditImageUrl(currentImg);
    setEditImagePublicId(currentImg);
    // Pre-fill gallery images (all images except the first one)
    const gallery = Array.isArray(product.images) && product.images.length > 1
      ? [...product.images.slice(1)]
      : [];

    // Also include any variant images that might not be in gallery yet
    if (product.productType === "variable" && Array.isArray(product.variants)) {
      for (const vGrp of product.variants) {
        if (Array.isArray(vGrp?.options)) {
          for (const opt of vGrp.options) {
            const vImg = typeof opt === 'object' ? opt.image : null;
            if (vImg && typeof vImg === 'string' && vImg.trim() && vImg !== currentImg && !gallery.includes(vImg.trim())) {
              gallery.push(vImg.trim());
            }
          }
        }
      }
    }
    setEditGalleryImages(gallery);
    const pType = product.productType === "variable" ? "variable" : "standard";
    setEditProductType(pType);
    setEditVariants(pType === "variable" && Array.isArray(product.variants) ? product.variants : []);
    setEditImageMessage({ text: "", type: "" });
    if (editFileInputRef.current) editFileInputRef.current.value = "";

    setIsEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || isEditSubmitting || !editingProductId) return;

    setIsEditSubmitting(true);

    const finalCategory = isEditCustomCategory
      ? editCustomCategoryInput.trim() || editCategorySelect
      : editCategorySelect;

    const parsedFeatures = editKeyFeatures.trim()
      ? editKeyFeatures.trim().split("\n").map(l => l.replace(/^[^a-zA-Z0-9]+/, '').trim()).filter(Boolean)
      : [];

    // Automatically aggregate all variant images into the product gallery
    const editVariantImages = [];
    if (editProductType === "variable" && Array.isArray(editVariants)) {
      for (const vGrp of editVariants) {
        if (Array.isArray(vGrp?.options)) {
          for (const opt of vGrp.options) {
            const optImg = typeof opt === 'object' ? opt.image : null;
            if (optImg && typeof optImg === 'string' && optImg.trim() && !editVariantImages.includes(optImg.trim())) {
              editVariantImages.push(optImg.trim());
            }
          }
        }
      }
    }

    const updatedImages = Array.from(new Set([
      editImageUrl,
      ...editGalleryImages,
      ...editVariantImages
    ].filter(Boolean)));

    let finalEditName = editName.trim();
    let finalEditNameBn = editNameBn.trim() || finalEditName;

    const updatedData = {
      name: finalEditName || finalEditNameBn,
      nameBn: finalEditNameBn || finalEditName,
      category: finalCategory,
      price: Number(editPrice) || 0,
      regularPrice: Number(editRegularPrice) || Number(editPrice) || 0,
      stock: Number(editStock) || 0,
      isOutOfStock: editIsOutOfStock,
      sku: editSku.trim(),
      images: updatedImages,
      badge: editTag,
      tag: editTag,
      isHotDeal: editTag === "BESTSELLER" || editTag === "HOT_DEAL",
      shortDescription: editShortDescription.trim(),
      keyFeatures: editKeyFeatures.trim(),
      features: parsedFeatures,
      description: editDescription.trim(),
      productType: editProductType,
      variants: editProductType === "variable" ? editVariants : [],
    };

    try {
      await autoTranslateProductPayload(updatedData);
      if (onUpdateProduct) {
        await onUpdateProduct(editingProductId, updatedData);
      }
      setIsEditModalOpen(false);
      setEditingProductId(null);
    } catch (err) {
      console.error("Failed to update product:", err);
      alert(`Failed to update product: ${err.message || "Server not responding"}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Add Product Submit
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!newName.trim() || isSubmitting) return;

    const finalCategory = isCustomCategory
      ? customCategoryInput.trim() || categorySelect || "Smart Gadget"
      : categorySelect || selectableCategories[0] || "Smart Gadget";

    setIsSubmitting(true);

    const fallbackImage = DEFAULT_PRODUCT_PLACEHOLDER;

    const parsedNewFeatures = newKeyFeatures.trim()
      ? newKeyFeatures.trim().split("\n").map(l => l.replace(/^[^a-zA-Z0-9]+/, '').trim()).filter(Boolean)
      : [
          "Original Official Warranty",
          "7-Day Replacement Guarantee",
          "Cash on Delivery Nationwide",
        ];

    // Automatically aggregate all variant images into the product gallery
    const newVariantImages = [];
    if (newProductType === "variable" && Array.isArray(newVariants)) {
      for (const vGrp of newVariants) {
        if (Array.isArray(vGrp?.options)) {
          for (const opt of vGrp.options) {
            const optImg = typeof opt === 'object' ? opt.image : null;
            if (optImg && typeof optImg === 'string' && optImg.trim() && !newVariantImages.includes(optImg.trim())) {
              newVariantImages.push(optImg.trim());
            }
          }
        }
      }
    }

    const combinedNewImages = Array.from(new Set([
      uploadedImageUrl,
      ...newGalleryImages,
      ...newVariantImages
    ].filter(Boolean)));

    let finalNewName = newName.trim();
    let finalNewNameBn = newNameBn.trim() || finalNewName;

    const prod = {
      id: `prod-${Date.now()}`,
      name: finalNewName || finalNewNameBn,
      nameBn: finalNewNameBn || finalNewName,
      slug: (finalNewName || finalNewNameBn)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-"),
      category: finalCategory,
      price: Number(newPrice) || 0,
      regularPrice: Number(newRegularPrice) || Number(newPrice) || 0,
      sku: newSku.trim(),
      stock: Number(newStock) || 0,
      isOutOfStock: newIsOutOfStock,
      images: combinedNewImages.length > 0 ? combinedNewImages : [fallbackImage],
      badge: newTag,
      tag: newTag,
      isHotDeal: newTag === "BESTSELLER" || newTag === "HOT_DEAL",
      shortDescription: newShortDescription.trim(),
      keyFeatures: newKeyFeatures.trim(),
      features: parsedNewFeatures,
      description: newDescription.trim() || "Original premium quality product. Fast delivery service.",
      rating: 4.8,
      reviewsCount: 1,
      deliveryDays: "",
      productType: newProductType,
      variants: newProductType === "variable" ? newVariants : [],
    };

    try {
      await autoTranslateProductPayload(prod);
      await onAddNewProduct(prod);
      resetAddProductForm();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Failed to create product:", err);
      alert(`Failed to create product: ${err.message || "Server not responding"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drag and Drop Handlers for Product List Reordering
  const handleDragStart = (e, productId) => {
    e.dataTransfer.setData("text/plain", productId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedProductId(productId);
  };

  const handleDragOver = (e, productId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverProductId !== productId) {
      setDragOverProductId(productId);
    }
  };

  const handleDrop = async (e, targetProductId) => {
    e.preventDefault();
    const sourceId = draggedProductId || e.dataTransfer.getData("text/plain");
    setDraggedProductId(null);
    setDragOverProductId(null);

    if (!sourceId || sourceId === targetProductId) return;

    const sourceIdx = products.findIndex((p) => p.id === sourceId);
    const targetIdx = products.findIndex((p) => p.id === targetProductId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const updated = [...products];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);

    if (onReorderProducts) {
      setIsReordering(true);
      try {
        await onReorderProducts(updated);
      } catch (err) {
        console.error("Failed to reorder products:", err);
      } finally {
        setIsReordering(false);
      }
    }
  };

  // Handle Delete Product confirmation
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      if (onDeleteProduct) {
        await onDeleteProduct(productToDelete.id);
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {"Inventory & Catalog"}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-neutral-900 mt-2">
            {"Products & Stock Management"}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {"Cloudinary image host, real-time stock update, product badges and category management."}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
            <div>
              <span className="text-neutral-400 block text-[10px]">
                {"Total Products"}
              </span>
              <span className="font-extrabold text-neutral-900">
                {products.length} {"items"}
              </span>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
            <div>
              <span className="text-neutral-400 block text-[10px]">
                {"Total Stock"}
              </span>
              <span className="font-extrabold text-emerald-700">
                {totalStockCount} {"units"}
              </span>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
            <div>
              <span className="text-neutral-400 block text-[10px]">
                {"Low Stock"}
              </span>
              <span className={`font-extrabold ${lowStockCount > 0 ? "text-amber-600" : "text-neutral-600"}`}>
                {lowStockCount} {"items"}
              </span>
            </div>
            <div className="h-6 w-px bg-neutral-200" />
            <div>
              <span className="text-neutral-400 block text-[10px]">
                {"Out of Stock"}
              </span>
              <span className={`font-extrabold ${outOfStockCount > 0 ? "text-rose-600" : "text-neutral-600"}`}>
                {outOfStockCount} {"items"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkCsvModalOpen(true)}
            className="w-full sm:w-auto justify-center px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Upload multiple products via CSV file"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{"Bulk CSV Upload"}</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{"Add New Product"}</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Bulk Stock Bar */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Dynamic Category Filter Pills - Clean and Deduplicated */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat === "ALL"
                  ? "🔥 All Categories"
                  : getCategoryName ? getCategoryName(cat) : cat}
              </button>
            ))}
          </div>

          {/* Search Input & Bulk Toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  "Search by name, category or SKU..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden transition-all"
              />
            </div>

            <button
              onClick={() => setIsBulkOpen(!isBulkOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isBulkOpen
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
              }`}
              title={"Bulk Stock Control"}
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>{"Bulk Stock Tool"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Bulk Stock Adjustment Panel */}
        {isBulkOpen && (
          <div className="pt-3 border-t border-neutral-100 bg-neutral-50/70 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-800">
                {`Bulk Stock Adjustment (${filteredProducts.length} products):`}
              </span>
              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold focus:outline-hidden"
              >
                <option value="add">{"Add to stock (+N)"}</option>
                <option value="set">{"Set exact stock (=N)"}</option>
              </select>
              <input
                type="number"
                min="0"
                value={bulkAdjustment}
                onChange={(e) => setBulkAdjustment(e.target.value)}
                className="w-20 px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-center focus:outline-hidden focus:border-emerald-600"
                placeholder={"Qty"}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyBulkStock}
                disabled={isBulkSubmitting || filteredProducts.length === 0}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                {isBulkSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{"Updating..."}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{"Apply to All"}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsBulkOpen(false)}
                className="px-2.5 py-1.5 text-neutral-500 hover:text-neutral-700 cursor-pointer"
              >
                {"Close"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reordering helper tip & Top Compact Pagination */}
      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-500 px-2 py-1 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium text-[11px] text-neutral-600">
            <GripVertical className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {"Tip: Drag and drop any product row to change display order on the front page."}
            </span>
          </span>
          {isReordering && (
            <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{"Saving order..."}</span>
            </span>
          )}
        </div>

        {/* Compact Top Pagination (Marked in Screenshot 2) */}
        {totalFilteredProducts > 0 && (
          <div className="flex items-center gap-1.5 bg-neutral-50 px-2.5 py-1 rounded-xl border border-neutral-200 shrink-0">
            <span className="text-[11px] text-neutral-500 font-medium mr-1">
              {"Page"}
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-neutral-600 transition-colors cursor-pointer"
              title={"Previous Page"}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-neutral-800 px-2 py-0.5 bg-white border border-neutral-200 rounded-md">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white text-neutral-600 transition-colors cursor-pointer"
              title={"Next Page"}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating / Sticky Multi-Selection Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-emerald-950 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 border border-emerald-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-black text-emerald-400 text-xs">
              {selectedProductIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                {`${selectedProductIds.length} product(s) selected`}
              </p>
              <p className="text-[11px] text-emerald-300/80">
                {selectedProductIds.length > 1
                  ? ("Multiple products selected — single row Edit is disabled for safety")
                  : ("Select more products or delete the selected item")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold transition cursor-pointer border border-emerald-700/50"
            >
              {allFilteredSelected
                ? ("Deselect All")
                : (`Select All (${filteredProducts.length})`)}
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/60 text-neutral-300 text-xs font-semibold transition cursor-pointer"
            >
              {"Clear"}
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {`Delete Selected (${selectedProductIds.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer accent-emerald-600"
                    title={allFilteredSelected ? "Deselect all" : "Select all products"}
                  />
                </th>
                <th className="py-3.5 px-3 w-12 text-center" title="Drag to reorder products">
                  {"Order"}
                </th>
                <th className="py-3.5 px-4">{"Product & Image"}</th>
                <th className="py-3.5 px-4">{"Category"}</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">{"Sale Price"}</th>
                <th className="py-3.5 px-4">{"Regular Price"}</th>
                <th className="py-3.5 px-4">{"Stock Status"}</th>
                <th className="py-3.5 px-4 text-center">{"Quick Stock Adjustment"}</th>
                <th className="py-3.5 px-4 text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-neutral-400">
                    {"No products found matching your search."}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isOutOfStock = Boolean(product.isOutOfStock) || (product.stock !== undefined && Number(product.stock) <= 0);
                  const isLowStock = !isOutOfStock && product.stock <= 10;
                  const currentStockVal = stockInputs[product.id] ?? product.stock;
                  const isSaved = savedRowId === product.id;
                  const tagInfo = getProductTagInfo(product, isEnglish);
                  const isSelected = selectedProductIds.includes(product.id);
                  const isMultipleSelected = selectedProductIds.length > 1;

                  const displayImg =
                    product.images && product.images[0]
                      ? product.images[0]
                      : product.image || DEFAULT_PRODUCT_PLACEHOLDER;

                  return (
                    <tr
                      key={product.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, product.id)}
                      onDragOver={(e) => handleDragOver(e, product.id)}
                      onDragEnd={() => {
                        setDraggedProductId(null);
                        setDragOverProductId(null);
                      }}
                      onDrop={(e) => handleDrop(e, product.id)}
                      className={`hover:bg-neutral-50/80 transition-all group ${
                        isSelected ? "bg-emerald-50/50" : ""
                      } ${
                        draggedProductId === product.id ? "opacity-30 bg-neutral-100" : ""
                      } ${
                        dragOverProductId === product.id ? "border-t-2 border-emerald-600 bg-emerald-50/50" : ""
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectProduct(product.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer accent-emerald-600"
                          title="Select this product"
                        />
                      </td>

                      {/* Drag Handle & Position */}
                      <td className="py-3.5 px-3 text-center">
                        <div
                          className="flex items-center justify-center p-1.5 rounded-lg text-neutral-400 group-hover:text-emerald-700 hover:bg-neutral-100 cursor-grab active:cursor-grabbing transition-colors"
                          title="Drag to reorder (Move top to display first on homepage)"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </td>
                      {/* Image, Title & Tag */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                            <img
                              src={displayImg}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={handleProductImageError}
                            />
                            {displayImg.includes("cloudinary") && (
                              <span
                                className="absolute bottom-0 inset-x-0 bg-blue-600/90 text-[8px] text-white text-center font-bold uppercase tracking-tight py-0.2"
                                title="Cloudinary Hosted Image"
                              >
                                Cloud
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-neutral-900 block max-w-[200px] truncate">
                                {product.name}
                              </span>
                              {tagInfo && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${tagInfo.badgeColor}`}>
                                  {tagInfo.label}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-emerald-800 block max-w-[220px] truncate">
                              {product.nameBn}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 font-medium">
                          {product.category}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 font-mono text-neutral-500 font-medium">
                        {product.sku}
                      </td>

                      {/* Offer Price */}
                      <td className="py-3.5 px-4 font-extrabold text-neutral-900">
                        {formatBDT(product.price)}
                      </td>

                      {/* Regular Price */}
                      <td className="py-3.5 px-4 text-neutral-400 line-through">
                        {formatBDT(product.regularPrice)}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <span className="font-bold px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                isLowStock
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {product.stock} in stock
                            </span>
                            {isLowStock && (
                              <span title="Low stock warning">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Stock Control: Custom Editable Input Field & Stepper Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickStepStock(product.id, -1)}
                            className="w-7 h-7 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="Decrease 1"
                          >
                            -1
                          </button>

                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={currentStockVal}
                              onChange={(e) =>
                                handleStockInputChange(product.id, e.target.value)
                              }
                              onBlur={() => handleCommitStockUpdate(product.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.target.blur();
                                }
                              }}
                              className={`w-16 px-2 py-1 bg-white rounded-lg border text-center font-bold text-xs focus:outline-hidden transition-all ${
                                isSaved
                                  ? "border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/50"
                                  : "border-neutral-300 focus:border-emerald-600 focus:bg-emerald-50/20"
                              }`}
                              title="Type new stock directly and press Enter"
                            />
                            {isSaved && (
                              <span className="absolute -top-2 -right-1 bg-emerald-600 text-white rounded-full p-0.5 text-[8px] animate-in zoom-in-50">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleQuickStepStock(product.id, +1)}
                            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center transition-colors cursor-pointer"
                            title="Increase 1"
                          >
                            +1
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickStepStock(product.id, +5)}
                            className="px-2 h-7 rounded-lg bg-emerald-100/70 hover:bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-[11px] transition-colors cursor-pointer"
                            title="Increase 5"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      {/* Action: Edit & Delete */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            disabled={isMultipleSelected}
                            onClick={() => !isMultipleSelected && handleOpenEditModal(product)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isMultipleSelected
                                ? "opacity-25 cursor-not-allowed text-neutral-300"
                                : "text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            }`}
                            title={
                              isMultipleSelected
                                ? ("Edit is disabled when multiple products are selected")
                                : ("Edit product")
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={"Delete product"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Full Bottom Pagination Bar (WooCommerce / Shopify style) */}
        {totalFilteredProducts > 0 && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-neutral-500 font-medium">
              {`Showing ${totalFilteredProducts > 0 ? startIndex + 1 : 0}-${endIndex} of ${totalFilteredProducts} products`}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{"Previous"}</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (num) =>
                    num === 1 ||
                    num === totalPages ||
                    (num >= currentPage - 1 && num <= currentPage + 1)
                )
                .reduce((acc, num, idx, arr) => {
                  if (idx > 0 && num - arr[idx - 1] > 1) {
                    acc.push("...");
                  }
                  acc.push(num);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`dots-${idx}`} className="px-2 text-neutral-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      onClick={() => setCurrentPage(item)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        currentPage === item
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "hover:bg-neutral-100 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-neutral-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="hidden sm:inline">{"Next"}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-neutral-900">
                Confirm Delete Product
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Are you sure you want to delete 
                <span className="font-bold text-neutral-800">
                  &ldquo;{productToDelete.name}&rdquo;
                </span>{" "}
                ? Its images and database records will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeletingProduct
                  ? ("Deleting...")
                  : ("Yes, Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Products Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-neutral-900">
                {"Confirm Bulk Deletion"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {isEnglish ? (
                  <>
                    Are you sure you want to permanently delete{" "}
                    <span className="font-bold text-rose-600 text-sm">
                      {selectedProductIds.length}
                    </span>{" "}
                    selected products? Their images and database records will be removed.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete 
                    <span className="font-bold text-rose-600 text-sm">
                      {selectedProductIds.length}
                    </span>{" "}
                     selected products? They will be permanently removed from database and Cloudinary storage.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 font-bold text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {"Cancel"}
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{"Deleting..."}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{"Yes, Delete All"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  <span>Edit Product</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Modify product details - instantly synced across frontend, backend, and database
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="space-y-4 text-xs">
              {/* Row 1: Product Type Selector (Standard vs Variable) */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Product Type *</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    {editProductType === 'variable' ? '🎨 Multiple Variations Active' : '📦 Standard Single Product'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditProductType('standard'); setEditVariants([]); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editProductType === 'standard'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span>📦 Standard Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditProductType('variable');
                      if (!editVariants || editVariants.length === 0) {
                        setEditVariants([{ name: 'Color', options: [] }]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editProductType === 'variable'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span>🎨 Variable Product</span>
                  </button>
                </div>
              </div>

              {/* Variable Product Variation Manager for Edit */}
              {editProductType === 'variable' && (
                <VariationManager
                  variants={editVariants}
                  onChangeVariants={handleEditVariantsChange}
                  basePrice={editPrice}
                  baseRegularPrice={editRegularPrice}
                  baseStock={editStock}
                  baseSku={editSku}
                  galleryImages={[editImageUrl, ...editGalleryImages].filter(Boolean)}
                  isEnglish={isEnglish}
                  onVariantImageAdded={(url) => {
                    if (url) {
                      setEditGalleryImages(prev => prev.includes(url) ? prev : [...prev, url]);
                    }
                  }}
                />
              )}

              {/* 2-Column Section:
                  Column 1 (Left): Product Name, Short Description, Key Features, Full Description
                  Column 2 (Right): Category, Product Tag/Badge, Display Image, Gallery Images, Price, Regular Price, Stock, SKU, Mark Out of Stock
              */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Column 1: Product Names & Descriptions */}
                <div className="space-y-3">
                  {/* Product Name */}
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditNameBn(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  {/* Short Description */}
                  <div>
                    <FormattingToolbar
                      textareaRef={editShortDescRef}
                      value={editShortDescription}
                      setValue={setEditShortDescription}
                      label="Short Description"
                    />
                    <textarea
                      ref={editShortDescRef}
                      rows={2}
                      value={editShortDescription}
                      onChange={(e) => setEditShortDescription(e.target.value)}
                      placeholder="Short key product highlights (1-2 lines)..."
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y"
                    />
                  </div>

                  {/* Key Features */}
                  <div>
                    <FormattingToolbar
                      textareaRef={editKeyFeatRef}
                      value={editKeyFeatures}
                      setValue={setEditKeyFeatures}
                      label="Key Features"
                    />
                    <textarea
                      ref={editKeyFeatRef}
                      rows={3}
                      value={editKeyFeatures}
                      onChange={(e) => setEditKeyFeatures(e.target.value)}
                      placeholder="• Premium high quality finish&#10;• Long-lasting durable performance&#10;• Easy and convenient operation"
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y font-mono"
                    />
                  </div>

                  {/* Full Description */}
                  <div>
                    <FormattingToolbar
                      textareaRef={editDescRef}
                      value={editDescription}
                      setValue={setEditDescription}
                      label="Full Description"
                    />
                    <textarea
                      ref={editDescRef}
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Detailed product description, benefits, specifications and package contents..."
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y"
                    />
                  </div>
                </div>

                {/* Column 2 (Middle): Category, Tag, Display Image, Gallery Images, Price & Stock */}
                <div className="space-y-3">
                  {/* Category Selection with Custom Option */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Category *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditCustomCategory(!isEditCustomCategory);
                          if (!isEditCustomCategory && !editCustomCategoryInput) {
                            setEditCustomCategoryInput("");
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        {isEditCustomCategory
                          ? "Select from list"
                          : "+ Add custom category"}
                      </button>
                    </div>

                    {!isEditCustomCategory ? (
                      <select
                        value={editCategorySelect}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setIsEditCustomCategory(true);
                          } else {
                            setEditCategorySelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-600"
                      >
                        {selectableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__NEW__">+ Add new category...</option>
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Enter new category name..."
                          value={editCustomCategoryInput}
                          onChange={(e) => setEditCustomCategoryInput(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-500 ring-2 ring-emerald-100 font-bold text-xs focus:outline-hidden"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Product Badge / Tag Selection */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <label className="block font-bold text-neutral-800 text-xs">
                      {"Product Tag / Badge"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      {PRODUCT_TAGS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEditTag(t.id)}
                          className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            editTag === t.id
                              ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="text-[11px] leading-tight">{isEnglish ? t.shortLabelEn : t.shortLabelBn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Display Image Section */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Primary Product Display Image</span>
                      </label>
                      {editImageUrl && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          {editImageUrl.includes("cloudinary") ? "☁️ Cloudinary Hosted" : "Current Image"}
                        </span>
                      )}
                    </div>

                    {/* Status Message - Only error shown */}
                    {editImageMessage.text && editImageMessage.type === "error" && (
                      <div className="text-[11px] p-2 rounded-xl flex items-center justify-between bg-rose-50 text-rose-700 border border-rose-200">
                        <span>{editImageMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setEditImageMessage({ text: "", type: "" })}
                          className="text-neutral-400 hover:text-neutral-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Current Image Preview & Delete Cross Button */}
                    {editImageUrl ? (
                      <div className="relative rounded-xl border border-neutral-200 overflow-hidden bg-white p-2 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={editImageUrl}
                            alt="Product preview"
                            className="w-14 h-14 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                          />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-neutral-800 block truncate max-w-[200px]">
                              Main Display Image
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-mono truncate max-w-[200px]">
                              {editImageUrl}
                            </span>
                          </div>
                        </div>

                        {/* Delete Cross Icon */}
                        <button
                          type="button"
                          onClick={handleDeleteEditImage}
                          disabled={isEditDeletingImage}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          title="Delete Image"
                        >
                          {isEditDeletingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      /* Drag/Click Area to Upload New Image */
                      <div>
                        <input
                          ref={editFileInputRef}
                          type="file"
                          id="edit-product-image-upload"
                          accept="image/*"
                          onChange={handleEditImageFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="edit-product-image-upload"
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsEditDragOverImage(true);
                          }}
                          onDragLeave={() => setIsEditDragOverImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsEditDragOverImage(false);
                            const file = e.dataTransfer.files && e.dataTransfer.files[0];
                            if (file) handleEditImageFileChange({ target: { files: [file] } });
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center ${
                            isEditDragOverImage
                              ? "border-emerald-600 bg-emerald-50/60 scale-[1.01]"
                              : "border-neutral-300 hover:border-emerald-500 bg-white"
                          } ${
                            isEditUploadingImage ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {isEditUploadingImage ? (
                            <div className="flex flex-col items-center gap-1 text-emerald-700">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="font-bold text-xs">
                                Uploading to Cloudinary...
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-neutral-800 text-xs">
                                Select new image from computer
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                PNG, JPG, WEBP (Max 10MB)
                              </span>
                            </>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget("editMain")}
                          className="mt-2 w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Images className="w-3.5 h-3.5" />
                          <span>Choose from Media Library</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gallery Images Section for Edit */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Images className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Gallery Images</span>
                      </label>
                      {editGalleryImages.length > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                          {editGalleryImages.length} images attached
                        </span>
                      )}
                    </div>

                    {/* Gallery Thumbnails List with Drag & Drop Reordering & Delete (X) */}
                    {editGalleryImages.length > 0 && (
                      <div className="space-y-1.5 p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-semibold px-1">
                          <span>Rearrange image sequence:</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full font-bold">
                            {editGalleryImages.length} images
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {editGalleryImages.map((gImg, idx) => (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => setDraggedGalleryIdx(idx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleReorderGallery(draggedGalleryIdx, idx, true)}
                              className={`relative group rounded-xl overflow-hidden border-2 bg-white p-1 transition-all cursor-grab active:cursor-grabbing shadow-2xs hover:border-indigo-400 hover:shadow-xs ${
                                draggedGalleryIdx === idx ? 'opacity-40 scale-95 border-dashed border-indigo-500' : 'border-neutral-200'
                              }`}
                            >
                              <div className="aspect-square w-full rounded-lg overflow-hidden relative">
                                <img src={gImg} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                                
                                {/* Sequence Order Badge */}
                                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                  #{idx + 1}
                                </span>

                                {/* Delete X Button (Deletes from Cloudinary immediately) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGalleryImage(idx, true);
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-xs transition-transform hover:scale-110 cursor-pointer"
                                  title="Delete image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Reorder Arrow Controls */}
                              <div className="flex items-center justify-between mt-1 px-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveGalleryImage(idx, -1, true);
                                  }}
                                  className="p-1 rounded-md bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 cursor-pointer"
                                  title="Move Left"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>

                                <span className="text-[10px] font-bold text-neutral-400">
                                  {idx === 0 ? '1st' : (idx === editGalleryImages.length - 1 ? 'End' : `#${idx + 1}`)}
                                </span>

                                <button
                                  type="button"
                                  disabled={idx === editGalleryImages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveGalleryImage(idx, 1, true);
                                  }}
                                  className="p-1 rounded-md bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 cursor-pointer"
                                  title="Move Right"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Local PC File Picker for Gallery */}
                    <div>
                      <input
                        ref={editGalleryFileInputRef}
                        type="file"
                        id="edit-product-gallery-upload"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleGalleryFilesChange(e, true)}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-product-gallery-upload"
                        className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-center border-neutral-300 hover:border-emerald-500 bg-white ${
                          isEditUploadingGallery ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {isEditUploadingGallery ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold py-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading gallery images...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-600 hover:text-emerald-700">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-xs">
                              + Add images to gallery (Multiple selection supported)
                            </span>
                          </div>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setMediaPickerTarget("editGallery")}
                        className="mt-2 w-full py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Images className="w-3.5 h-3.5" />
                        <span>Add Gallery Images from Media Library</span>
                      </button>
                    </div>
                  </div>

                  {/* Price & Regular Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Sale Price (৳) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Regular Price (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editRegularPrice}
                        onChange={(e) =>
                          setEditRegularPrice(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Initial Stock & SKU */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Stock Quantity *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editStock}
                        onChange={(e) => setEditStock(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={editSku}
                        onChange={(e) => setEditSku(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Out of Stock Checkbox */}
                  <div className="mt-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-50 transition-colors">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editIsOutOfStock}
                        onChange={(e) => setEditIsOutOfStock(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-neutral-300 cursor-pointer accent-rose-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-neutral-800">
                          Mark as Out of Stock
                        </span>
                        <p className="text-[11px] text-neutral-500">
                          When checked, customers cannot purchase this product directly from the website.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting || isEditUploadingImage || isEditUploadingGallery}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Product Updates</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Add New Product
                </h3>
                <p className="text-[11px] text-neutral-500">
                  High performance image hosting & real-time database synchronization
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              {/* Row 1: Product Type Selector (Standard vs Variable) */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Product Type *</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    {newProductType === 'variable' ? '🎨 Multiple Variations Active' : '📦 Standard Single Product'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewProductType('standard'); setNewVariants([]); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newProductType === 'standard'
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span>📦 Standard Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProductType('variable');
                      if (!newVariants || newVariants.length === 0) {
                        setNewVariants([{ name: 'Color', options: [] }]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      newProductType === 'variable'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    <span>🎨 Variable Product</span>
                  </button>
                </div>
              </div>

              {/* Variable Product Variation Manager for Add */}
              {newProductType === 'variable' && (
                <VariationManager
                  variants={newVariants}
                  onChangeVariants={handleNewVariantsChange}
                  basePrice={newPrice}
                  baseRegularPrice={newRegularPrice}
                  baseStock={newStock}
                  baseSku={newSku}
                  galleryImages={[uploadedImageUrl, ...newGalleryImages].filter(Boolean)}
                  isEnglish={isEnglish}
                  onVariantImageAdded={(url) => {
                    if (url) {
                      setNewGalleryImages(prev => prev.includes(url) ? prev : [...prev, url]);
                    }
                  }}
                />
              )}

              {/* 2-Column Section:
                  Column 1 (Left): Product Name, Short Description, Key Features, Full Description
                  Column 2 (Right): Category, Product Tag/Badge, Display Image, Gallery Images, Price, Regular Price, Stock, SKU, Mark Out of Stock
              */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* Column 1: Product Names & Descriptions */}
                <div className="space-y-3">
                  {/* Product Name */}
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wireless Earbuds Pro"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setNewNameBn(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  {/* Short Description */}
                  <div>
                    <FormattingToolbar
                      textareaRef={newShortDescRef}
                      value={newShortDescription}
                      setValue={setNewShortDescription}
                      label="Short Description"
                    />
                    <textarea
                      ref={newShortDescRef}
                      rows={2}
                      value={newShortDescription}
                      onChange={(e) => setNewShortDescription(e.target.value)}
                      placeholder="Short attractive product highlights (1-2 lines)..."
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y"
                    />
                  </div>

                  {/* Key Features */}
                  <div>
                    <FormattingToolbar
                      textareaRef={newKeyFeatRef}
                      value={newKeyFeatures}
                      setValue={setNewKeyFeatures}
                      label="Key Features"
                    />
                    <textarea
                      ref={newKeyFeatRef}
                      rows={3}
                      value={newKeyFeatures}
                      onChange={(e) => setNewKeyFeatures(e.target.value)}
                      placeholder="• 100% Authentic Official Product&#10;• 7-Day Free Replacement Guarantee&#10;• Nationwide Cash on Delivery"
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y font-mono"
                    />
                  </div>

                  {/* Full Description */}
                  <div>
                    <FormattingToolbar
                      textareaRef={newDescRef}
                      value={newDescription}
                      setValue={setNewDescription}
                      label="Full Description"
                    />
                    <textarea
                      ref={newDescRef}
                      rows={4}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Detailed description, benefits, specifications and guidelines..."
                      className="w-full px-3 py-2 bg-neutral-50 rounded-b-xl border border-neutral-300 border-t-0 focus:bg-white focus:border-emerald-600 focus:outline-hidden text-xs resize-y"
                    />
                  </div>
                </div>

                {/* Column 2 (Middle): Category, Tag, Display Image, Gallery Images, Price & Stock */}
                <div className="space-y-3">
                  {/* Category Selection with Custom Category Field */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Select Category *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(!isCustomCategory);
                          if (!isCustomCategory && !customCategoryInput) {
                            setCustomCategoryInput("");
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                      >
                        {isCustomCategory
                          ? "Select from list"
                          : "+ Create new category"}
                      </button>
                    </div>

                    {!isCustomCategory ? (
                      <select
                        value={categorySelect}
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setIsCustomCategory(true);
                          } else {
                            setCategorySelect(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-neutral-300 text-xs font-semibold focus:outline-hidden focus:border-emerald-600"
                      >
                        {selectableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__NEW__">+ Add new category...</option>
                      </select>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Enter new category name (e.g. Home Appliances, Watches)..."
                          value={customCategoryInput}
                          onChange={(e) => setCustomCategoryInput(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-500 ring-2 ring-emerald-100 font-bold text-xs focus:outline-hidden"
                          autoFocus
                        />
                        <p className="text-[10px] text-neutral-400">
                          This category will automatically be available in store and admin filters.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Product Badge / Tag Selection */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <label className="block font-bold text-neutral-800 text-xs">
                      {"Product Tag / Badge"}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                      {PRODUCT_TAGS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewTag(t.id)}
                          className={`p-2 rounded-xl border text-center font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            newTag === t.id
                              ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="text-[11px] leading-tight">{isEnglish ? t.shortLabelEn : t.shortLabelBn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Display Image Upload */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Primary Product Display Image</span>
                      </label>
                      {uploadedImageUrl && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                          ✓ Image Attached
                        </span>
                      )}
                    </div>

                    {/* Upload Status Alert - Only error shown */}
                    {imageMessage.text && imageMessage.type === "error" && (
                      <div className="text-[11px] p-2 rounded-xl flex items-center justify-between bg-rose-50 text-rose-700 border border-rose-200">
                        <span>{imageMessage.text}</span>
                        <button
                          type="button"
                          onClick={() => setImageMessage({ text: "", type: "" })}
                          className="text-neutral-400 hover:text-neutral-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Image Preview Box with Cross Delete Button */}
                    {uploadedImageUrl ? (
                      <div className="relative rounded-xl border border-neutral-200 overflow-hidden bg-white p-2 flex items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={uploadedImageUrl}
                            alt="Product preview"
                            className="w-14 h-14 rounded-lg object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                          />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-neutral-800 block truncate max-w-[200px]">
                              Main Display Image Attached
                            </span>
                            <span className="text-[10px] text-neutral-400 block font-mono truncate max-w-[200px]">
                              {uploadedImageUrl}
                            </span>
                          </div>
                        </div>

                        {/* Delete Cross Icon */}
                        <button
                          type="button"
                          onClick={handleDeleteUploadedImage}
                          disabled={isDeletingImage}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                          title="Delete Image"
                        >
                          {isDeletingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          <span>Delete</span>
                        </button>
                      </div>
                    ) : (
                      /* Local PC File Picker Drag/Click Area */
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          id="product-image-upload"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="product-image-upload"
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOverImage(true);
                          }}
                          onDragLeave={() => setIsDragOverImage(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOverImage(false);
                            const file = e.dataTransfer.files && e.dataTransfer.files[0];
                            if (file) handleImageFileChange({ target: { files: [file] } });
                          }}
                          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center ${
                            isDragOverImage
                              ? "border-emerald-600 bg-emerald-50/60 scale-[1.01]"
                              : "border-neutral-300 hover:border-emerald-500 bg-white"
                          } ${
                            isUploadingImage ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {isUploadingImage ? (
                            <div className="flex flex-col items-center gap-1 text-emerald-700">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="font-bold text-xs">
                                Uploading to Cloudinary...
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                <UploadCloud className="w-5 h-5" />
                              </div>
                              <span className="font-bold text-neutral-800 text-xs">
                                Select image from computer or drag and drop
                              </span>
                              <span className="text-[10px] text-neutral-400">
                                PNG, JPG, WEBP (Max 10MB)
                              </span>
                            </>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setMediaPickerTarget("addMain")}
                          className="mt-2 w-full py-2 px-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Images className="w-3.5 h-3.5" />
                          <span>Choose from Media Library</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gallery Images Section */}
                  <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Images className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Gallery Images</span>
                      </label>
                      {newGalleryImages.length > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                          {newGalleryImages.length} images attached
                        </span>
                      )}
                    </div>

                    {/* Gallery Thumbnails List with Drag & Drop Reordering & Delete (X) */}
                    {newGalleryImages.length > 0 && (
                      <div className="space-y-1.5 p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-semibold px-1">
                          <span>Rearrange image sequence:</span>
                          <span className="text-[10px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full font-bold">
                            {newGalleryImages.length} images
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {newGalleryImages.map((gImg, idx) => (
                            <div
                              key={idx}
                              draggable
                              onDragStart={() => setDraggedGalleryIdx(idx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleReorderGallery(draggedGalleryIdx, idx, false)}
                              className={`relative group rounded-xl overflow-hidden border-2 bg-white p-1 transition-all cursor-grab active:cursor-grabbing shadow-2xs hover:border-indigo-400 hover:shadow-xs ${
                                draggedGalleryIdx === idx ? 'opacity-40 scale-95 border-dashed border-indigo-500' : 'border-neutral-200'
                              }`}
                            >
                              <div className="aspect-square w-full rounded-lg overflow-hidden relative">
                                <img src={gImg} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover select-none pointer-events-none" />
                                
                                {/* Sequence Order Badge */}
                                <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                  #{idx + 1}
                                </span>

                                {/* Delete X Button (Deletes from Cloudinary immediately) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveGalleryImage(idx, false);
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-xs transition-transform hover:scale-110 cursor-pointer"
                                  title="Delete image"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Reorder Arrow Controls */}
                              <div className="flex items-center justify-between mt-1 px-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveGalleryImage(idx, -1, false);
                                  }}
                                  className="p-1 rounded-md bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 cursor-pointer"
                                  title="Move Left"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>

                                <span className="text-[10px] font-bold text-neutral-400">
                                  {idx === 0 ? '1st' : (idx === newGalleryImages.length - 1 ? 'End' : `#${idx + 1}`)}
                                </span>

                                <button
                                  type="button"
                                  disabled={idx === newGalleryImages.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveGalleryImage(idx, 1, false);
                                  }}
                                  className="p-1 rounded-md bg-neutral-100 hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none text-neutral-700 cursor-pointer"
                                  title="Move Right"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Local PC File Picker for Gallery */}
                    <div>
                      <input
                        ref={galleryFileInputRef}
                        type="file"
                        id="product-gallery-upload"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleGalleryFilesChange(e, false)}
                        className="hidden"
                      />
                      <label
                        htmlFor="product-gallery-upload"
                        className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all text-center border-neutral-300 hover:border-emerald-500 bg-white ${
                          isUploadingGallery ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        {isUploadingGallery ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold py-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Uploading gallery images...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-neutral-600 hover:text-emerald-700">
                            <Plus className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-xs">
                              + Add images to gallery (Multiple selection supported)
                            </span>
                          </div>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => setMediaPickerTarget("addGallery")}
                        className="mt-2 w-full py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Images className="w-3.5 h-3.5" />
                        <span>Add Gallery Images from Media Library</span>
                      </button>
                    </div>
                  </div>

                  {/* Price & Regular Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Sale Price (৳) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Regular Price (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newRegularPrice}
                        onChange={(e) =>
                          setNewRegularPrice(parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Initial Stock & SKU */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Initial Stock *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newStock}
                        onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-bold focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        SKU Code
                      </label>
                      <input
                        type="text"
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-50 rounded-xl border border-neutral-300 font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Out of Stock Checkbox */}
                  <div className="mt-3 p-3 rounded-xl border border-neutral-200 bg-neutral-50/80 hover:bg-neutral-50 transition-colors">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newIsOutOfStock}
                        onChange={(e) => setNewIsOutOfStock(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-neutral-300 cursor-pointer accent-rose-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-neutral-800">
                          Mark as Out of Stock
                        </span>
                        <p className="text-[11px] text-neutral-500">
                          When checked, customers cannot purchase this product directly from the website.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-neutral-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage || isUploadingGallery}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Modal */}
      <AdminBulkCsvModal
        isOpen={isBulkCsvModalOpen}
        onClose={() => setIsBulkCsvModalOpen(false)}
        existingProducts={products}
        onSuccess={async () => {
          if (typeof onRefreshData === "function") {
            await onRefreshData();
          }
        }}
      />

      {/* Centralized WordPress-style Media Library Picker */}
      <MediaPickerModal
        isOpen={Boolean(mediaPickerTarget)}
        onClose={() => setMediaPickerTarget(null)}
        multiple={mediaPickerTarget === "addGallery" || mediaPickerTarget === "editGallery"}
        defaultFolder="all"
        uploadFolder="products"
        title={
          mediaPickerTarget === "addGallery" || mediaPickerTarget === "editGallery"
            ? "Select Gallery Images from Media Library"
            : "Select Product Display Image from Media Library"
        }
        onSelect={(selection) => {
          if (!selection) return;
          if (mediaPickerTarget === "addMain" && typeof selection === "string") {
            setUploadedImageUrl(selection);
            setUploadedImagePublicId("");
          } else if (mediaPickerTarget === "editMain" && typeof selection === "string") {
            setEditImageUrl(selection);
            setEditImagePublicId("");
          } else if (mediaPickerTarget === "addGallery") {
            const urls = Array.isArray(selection) ? selection : [selection];
            setNewGalleryImages((prev) => Array.from(new Set([...prev, ...urls])));
          } else if (mediaPickerTarget === "editGallery") {
            const urls = Array.isArray(selection) ? selection : [selection];
            setEditGalleryImages((prev) => Array.from(new Set([...prev, ...urls])));
          }
        }}
      />
    </div>
  );
};

export { AdminProducts };
