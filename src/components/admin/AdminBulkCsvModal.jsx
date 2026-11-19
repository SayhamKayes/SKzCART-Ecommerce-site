import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  Trash2
} from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { apiClient } from "../../services/api";
import { formatBDT } from "../../utils/bangladesh";
import { DEFAULT_PRODUCT_PLACEHOLDER, handleProductImageError } from "../../utils/productImage";

const SAMPLE_CSV_CONTENT = `name,nameBn,category,price,regularPrice,sku,stock,badge,warranty,deliveryDays,isHotDeal,images,shortDescription,shortDescriptionBn,features,featuresBn,description
"360 Rotating Makeup Brush Organizer","360 Rotating Makeup Brush Organizer","organizers",790,1250,"ORG-BRUSH-01",50,"HOT","7 Days Replacement","2-3 Days",true,"https://images.unsplash.com/photo-1522337360788-8b13dee7a37e|https://images.unsplash.com/photo-1512496015851-a90fb38ba796","Premium rotating cosmetic organizer with dust cover.","Premium rotating cosmetic organizer with dust cover.","360 Smooth Rotation|Dust & Waterproof Lid|7 Compartments","360 Smooth Rotation|Dust & Waterproof Lid|7 Compartments","Luxury crystal-clear makeup organizer with silent rotation and airtight dustproof cover."
"Ultra Slim Magnetic Wireless Power Bank","Ultra Slim Magnetic Wireless Power Bank","gadgets",1650,2200,"GAD-PBANK-02",30,"NEW","6 Months Warranty","1-2 Days",true,"https://images.unsplash.com/photo-1609592807758-a47738f6d8eb","10000mAh Magnetic Wireless Fast Charging Power Bank.","10000mAh Magnetic Wireless Fast Charging Power Bank.","20W PD Fast Charging|Strong Magnetic Snap|LED Display","20W PD Fast Charging|Strong Magnetic Snap|LED Display","Ultra-slim 10000mAh MagSafe-compatible fast charging power bank with LED battery indicator."
"7-in-1 Nail Manicure & Pedicure Grooming Kit","7-in-1 Nail Manicure & Pedicure Grooming Kit","personal-care",450,650,"PER-NAIL-03",25,"POPULAR","1 Month Warranty","2-3 Days",false,"https://images.unsplash.com/photo-1598452963314-b09f397a5c48","Professional stainless steel manicure grooming kit with portable case.","Professional stainless steel manicure grooming kit with portable case.","Medical-grade Steel|Laser Sharpened|Compact Travel Leather Case","Medical-grade Steel|Laser Sharpened|Compact Travel Leather Case","Surgical-grade stainless steel 7-in-1 nail grooming kit with premium travel leather case."`;

/**
 * Robust CSV Line Parser supporting quoted commas
 */
const parseCsvLines = (text) => {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' || char === "'") {
      if (inQuotes && nextChar === char) {
        currentField += char;
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      row.push(currentField.trim());
      if (row.some((cell) => cell.length > 0)) {
        lines.push(row);
      }
      row = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }
  return lines;
};

export const AdminBulkCsvModal = ({
  isOpen,
  onClose,
  existingProducts = [],
  onSuccess
}) => {
  const { isEnglish } = useLanguage();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  // Handle Sample CSV Download
  const handleDownloadSample = () => {
    // Add UTF-8 BOM so Excel opens Bangla properly
    const blob = new Blob(["\uFEFF" + SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "amardokan_products_bulk_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse and preview chosen file
  const processFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setErrorMessage(
        "Please select a valid CSV (.csv) file."
      );
      return;
    }

    setErrorMessage("");
    setSuccessInfo(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const allLines = parseCsvLines(text);
        if (allLines.length < 2) {
          setErrorMessage(
            "The CSV file appears to be empty or missing data rows."
          );
          setParsedRows([]);
          return;
        }

        const headers = allLines[0].map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
        const rowsData = [];

        for (let i = 1; i < allLines.length; i++) {
          const rawRow = allLines[i];
          const obj = {};
          headers.forEach((h, colIdx) => {
            obj[h] = rawRow[colIdx] ? rawRow[colIdx].replace(/^["']|["']$/g, "").trim() : "";
          });

          // Identify key fields
          const name = obj.name || obj.product_name || obj.title || "";
          const nameBn = obj.namebn || obj.name_bn || "";
          const price = parseFloat(obj.price || obj.sale_price || 0) || 0;
          const regularPrice = parseFloat(obj.regularprice || obj.regular_price || price) || price;
          const sku = obj.sku || obj.code || "";
          const stock = parseInt(obj.stock || obj.quantity || 20, 10) || 20;
          const category = obj.category || "gadgets";
          const rawImages = obj.images || obj.image || "";
          const firstImage = rawImages.split("|")[0]?.split(",")[0]?.trim() || "";

          // Check if SKU already exists
          const isExisting = sku
            ? existingProducts.some(
                (p) => String(p.sku).toLowerCase() === sku.toLowerCase()
              )
            : false;

          if (name || nameBn) {
            rowsData.push({
              index: i,
              name: name || nameBn,
              nameBn,
              price,
              regularPrice,
              sku: sku || `BD-AUTO-${i}`,
              stock,
              category,
              image: firstImage,
              isExisting,
              rawObj: obj
            });
          }
        }

        setParsedRows(rowsData);
      } catch (err) {
        console.error("CSV parse error:", err);
        setErrorMessage(
          "Failed to parse CSV file. Ensure it is UTF-8 formatted."
        );
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Submit Bulk Upload to Backend API
  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage(
        "Please select a CSV file first."
      );
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setSuccessInfo(null);

    try {
      const res = await apiClient.bulkUploadProductsCsv(selectedFile);

      if (res && res.success) {
        setSuccessInfo({
          createdCount: res.createdCount || 0,
          updatedCount: res.updatedCount || 0,
          total: res.totalProcessed || (res.createdCount + res.updatedCount),
          errors: res.errors || []
        });

        // Broadcast/callback to update inventory state immediately
        if (onSuccess && Array.isArray(res.products)) {
          onSuccess(res.products, res.createdCount, res.updatedCount);
        }

        // Auto close after 2.5 seconds if no row errors
        if (!res.errors || res.errors.length === 0) {
          setTimeout(() => {
            handleReset();
            onClose();
          }, 2200);
        }
      } else {
        setErrorMessage(res.message || "Failed to complete bulk upload.");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      setErrorMessage(
        err.message ||
          ("Server error during bulk upload. Please check connection.")
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage("");
    setSuccessInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-neutral-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                {"Bulk CSV Product Import"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {"Upload, create, or update multiple products in real-time via CSV spreadsheet."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download Sample CSV Template"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">
                {"Download Template"}
              </span>
            </button>

            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Format Reference Guide Accordion */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 text-xs font-bold text-neutral-700 flex items-center justify-between hover:bg-neutral-100/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  {"Column Headers & Formatting Guide"}
                </span>
              </span>
              <span className="text-[11px] text-emerald-700 underline">
                {showGuide
                  ? "Hide Details"
                  : "View Column Details"}
              </span>
            </button>

            {showGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-neutral-200 text-xs space-y-3 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-600">
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                    <span className="font-bold text-emerald-800 block text-[11px] uppercase tracking-wider">
                      ✅ Mandatory Columns
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      <li>• <strong className="text-neutral-800">name</strong>: Product name (e.g., Makeup Organizer)</li>
                      <li>• <strong className="text-neutral-800">category</strong>: Category slug (e.g., organizers, gadgets)</li>
                      <li>• <strong className="text-neutral-800">price</strong>: Selling price (e.g., 790)</li>
                      <li>• <strong className="text-neutral-800">sku</strong>: Unique SKU code (e.g., ORG-01; auto-generated if blank)</li>
                      <li>• <strong className="text-neutral-800">stock</strong>: Inventory stock quantity (e.g., 50)</li>
                      <li>• <strong className="text-neutral-800">images</strong>: Image URLs separated by pipe (<code className="bg-neutral-200 px-1 rounded">|</code>)</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1.5">
                    <span className="font-bold text-blue-800 block text-[11px] uppercase tracking-wider">
                      💡 Optional Columns
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      <li>• <strong className="text-neutral-800">nameBn</strong>: Secondary name / localized title</li>
                      <li>• <strong className="text-neutral-800">regularPrice</strong>: Strikethrough regular price (e.g., 1250)</li>
                      <li>• <strong className="text-neutral-800">badge</strong>: Badge (HOT, NEW, EXCLUSIVE)</li>
                      <li>• <strong className="text-neutral-800">features</strong>: Bullet points separated by pipe (<code className="bg-neutral-200 px-1 rounded">|</code>)</li>
                      <li>• <strong className="text-neutral-800">shortDescription</strong>: Short product summary</li>
                      <li>• <strong className="text-neutral-800">description</strong>: Full detailed product description</li>
                    </ul>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 italic bg-amber-50 p-2 rounded-lg border border-amber-200">
                  📌 <strong>Tip:</strong> If you specify an existing SKU, the product price, stock, and details will be updated automatically instead of creating a new product.
                </p>
              </div>
            )}
          </div>

          {/* Drag & Drop Upload Zone */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50/50 scale-[0.99]"
                  : "border-neutral-300 hover:border-emerald-500 hover:bg-neutral-50/80 bg-neutral-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-800">
                {"Choose or drop your CSV file here"}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {"Supports UTF-8 encoded .csv files up to 20MB"}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold shadow-xs">
                <span>{"Browse File"}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  CSV
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-800">
                    {selectedFile.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length}{" "}
                    {"products found"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="p-2 rounded-xl text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove File"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Feedback & Error Banners */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>
                  {"Bulk Upload Completed Successfully!"}
                </span>
              </div>
              <p className="text-emerald-700">
                Total {successInfo.total} products processed (✨ {successInfo.createdCount} newly added, 🔄 {successInfo.updatedCount} updated).
              </p>
              {successInfo.errors && successInfo.errors.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200 text-amber-700 space-y-1">
                  <span className="font-bold">Warnings in some rows:</span>
                  {successInfo.errors.map((err, i) => (
                    <div key={i} className="text-[11px]">• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-700 px-1">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-neutral-500" />
                  <span>
                    {"Parsed Data Preview"} ({parsedRows.length})
                  </span>
                </span>
                <span className="text-[11px] text-neutral-500 font-normal">
                  {parsedRows.filter((r) => r.isExisting).length} updates •{" "}
                  {parsedRows.filter((r) => !r.isExisting).length} new
                </span>
              </div>

              <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100/80 text-neutral-600 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/80">
                        <td className="py-2 px-3 text-neutral-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={row.image || DEFAULT_PRODUCT_PLACEHOLDER}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover border border-neutral-200 bg-neutral-100"
                              onError={handleProductImageError}
                            />
                            <div>
                              <span className="font-bold text-neutral-800 line-clamp-1">
                                {row.name}
                              </span>
                              {row.nameBn && (
                                <span className="text-[10px] text-neutral-500 line-clamp-1">
                                  {row.nameBn}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-neutral-600">
                          <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-[10px] font-semibold">
                            {row.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-neutral-600">
                          {row.sku}
                        </td>
                        <td className="py-2 px-3 font-bold text-neutral-900">
                          {formatBDT(row.price)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-bold ${
                              row.stock > 0 ? "text-emerald-700" : "text-rose-600"
                            }`}
                          >
                            {row.stock} pcs
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.isExisting ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                              Update
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold transition-all cursor-pointer"
          >
            {"Cancel"}
          </button>

          <button
            type="button"
            disabled={isUploading || !selectedFile || parsedRows.length === 0}
            onClick={handleUploadSubmit}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{"Importing to Database..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {`Upload & Sync ${parsedRows.length} Products`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
