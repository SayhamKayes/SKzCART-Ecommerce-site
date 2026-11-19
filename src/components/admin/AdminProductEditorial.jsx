import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  X,
  Eye,
  EyeOff,
  LayoutGrid,
  Type,
  ListChecks,
  ShieldCheck,
  Columns2,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { DEFAULT_THEME_CONFIG } from "../frontPanel/defaultThemeConfig";
import {
  TRUST_BADGE_ICON_OPTIONS,
  TRUST_BADGE_COLOR_OPTIONS,
  EDITORIAL_CARD_ICON_PRESETS,
  renderTrustBadgeIcon,
  resolveEditorialConfig,
  formatEditorialCardText,
} from "../../utils/productEditorial";

const SUB_TABS = [
  { id: "cards", label: "4 Trust Feature Cards", icon: LayoutGrid },
  { id: "orderHeader", label: "Order Section Header", icon: Type },
  { id: "checkoutForm", label: "Checkout Form Editor", icon: ListChecks },
  { id: "trustBadges", label: "Summary & Quick-View Badges", icon: ShieldCheck },
];

const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Textarea (Multi-line)" },
  { value: "number", label: "Number Input" },
  { value: "email", label: "Email Input" },
  { value: "tel", label: "Phone Input" },
  { value: "select", label: "Select Dropdown" },
  { value: "radio", label: "Radio Options" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date Picker" },
];

const FIELD_TYPE_BADGES = {
  name: "Name (1 or 2 Boxes)",
  email: "Email",
  tel: "Phone",
  district_select: "District Select",
  thana_select: "Thana / Area Select",
  textarea: "Textarea",
  text: "Text",
  number: "Number",
  select: "Dropdown",
  radio: "Radio",
  checkbox: "Checkbox",
  date: "Date",
};

const CORE_LOCKED_ON = new Set(["phone"]); // Phone is required by backend order lookup & checkout API

function cloneEditorialState(sourceConfig) {
  const resolved = resolveEditorialConfig(sourceConfig);
  return {
    ...resolved,
    editorialCards: resolved.editorialCards.map((c) => ({ ...c })),
    checkoutFields: resolved.checkoutFields.map((f) => ({
      ...f,
      options: Array.isArray(f.options) ? [...f.options] : [],
    })),
    trustBadges: resolved.trustBadges.map((b) => ({ ...b })),
  };
}

export const AdminProductEditorial = () => {
  const { themeConfig, updateThemeConfig } = useThemeConfig();
  const [activeSubTab, setActiveSubTab] = useState("cards");
  const [draft, setDraft] = useState(() => cloneEditorialState(themeConfig));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  // Field Editor modal state (WooCommerce Checkout Field Editor style)
  const [editingField, setEditingField] = useState(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [fieldOptionsInput, setFieldOptionsInput] = useState("");
  const [fieldModalError, setFieldModalError] = useState("");

  const hasUnsavedRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedRef.current) {
      setDraft(cloneEditorialState(themeConfig));
    }
  }, [themeConfig?.productPage]);

  const updateDraftField = (key, value) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const persistDraft = async (
    nextState,
    successMsg = "Product Editorial changes saved & published live across all devices!"
  ) => {
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await updateThemeConfig("productPage", nextState);
      setHasUnsavedChanges(false);
      setSaveFeedback({ type: "success", text: successMsg });
      setTimeout(() => setSaveFeedback(null), 4000);
    } catch (err) {
      console.error("Failed to save Product Editorial:", err);
      setSaveFeedback({
        type: "error",
        text: "Failed to save changes to database. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults = cloneEditorialState({ productPage: DEFAULT_THEME_CONFIG.productPage });
    setDraft(defaults);
    persistDraft(defaults, "Product Editorial settings reset to defaults and synced!");
  };

  // --- Section 1: 4 Editorial Cards Handlers ---
  const handleUpdateCard = (idx, patch) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.editorialCards];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, editorialCards: next };
    });
  };

  const handleMoveCard = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.editorialCards.length) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.editorialCards];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...prev, editorialCards: next };
    });
  };

  const handleAddCard = () => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      editorialCards: [
        ...prev.editorialCards,
        {
          id: `card-${Date.now()}`,
          icon: "✨",
          title: "New Feature Card",
          text: "Describe your service guarantee here",
          enabled: true,
        },
      ],
    }));
  };

  const handleDeleteCard = (idx) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      editorialCards: prev.editorialCards.filter((_, i) => i !== idx),
    }));
  };

  // --- Section 3: Checkout Form Field Editor Handlers ---
  const handleMoveField = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.checkoutFields.length) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.checkoutFields];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...prev, checkoutFields: next };
    });
  };

  const handleToggleFieldEnabled = (idx) => {
    const field = draft.checkoutFields[idx];
    if (!field || CORE_LOCKED_ON.has(field.key)) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.checkoutFields];
      next[idx] = { ...next[idx], enabled: next[idx].enabled === false };
      return { ...prev, checkoutFields: next };
    });
  };

  const handleToggleFieldRequired = (idx) => {
    const field = draft.checkoutFields[idx];
    if (!field || CORE_LOCKED_ON.has(field.key)) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.checkoutFields];
      next[idx] = { ...next[idx], required: !next[idx].required };
      return { ...prev, checkoutFields: next };
    });
  };

  const handleDeleteCustomField = (idx) => {
    const field = draft.checkoutFields[idx];
    if (!field || field.core) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      checkoutFields: prev.checkoutFields.filter((_, i) => i !== idx),
    }));
  };

  const openEditFieldModal = (field, idx) => {
    setFieldModalError("");
    setIsAddingField(false);
    setEditingField({ ...field, _index: idx });
    setFieldOptionsInput(Array.isArray(field.options) ? field.options.join("\n") : "");
  };

  const openAddFieldModal = () => {
    setFieldModalError("");
    setIsAddingField(true);
    setEditingField({
      id: `custom_${Date.now()}`,
      key: "",
      type: "text",
      core: false,
      enabled: true,
      required: false,
      width: "full",
      label: "",
      placeholder: "",
      helperText: "",
      defaultValue: "",
      errorMessage: "",
      options: [],
    });
    setFieldOptionsInput("");
  };

  const handleSaveFieldModal = (e) => {
    e.preventDefault();
    if (!editingField) return;
    const cleanLabel = (editingField.label || "").trim();
    if (!cleanLabel && !(editingField.type === "name" && editingField.nameSplitMode)) {
      setFieldModalError("Field label is required.");
      return;
    }

    const rawKey = (editingField.key || cleanLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const finalKey = editingField.core ? editingField.key : rawKey || `field_${Date.now()}`;

    if (
      isAddingField &&
      draft.checkoutFields.some((f) => f.key === finalKey)
    ) {
      setFieldModalError(`A field with key "${finalKey}" already exists. Use a unique field key.`);
      return;
    }

    const parsedOptions =
      editingField.type === "select" || editingField.type === "radio"
        ? fieldOptionsInput
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    if ((editingField.type === "select" || editingField.type === "radio") && parsedOptions.length === 0) {
      setFieldModalError("Please add at least one option (one per line or comma-separated).");
      return;
    }

    const { _index, ...cleanField } = editingField;
    const finalField = {
      ...cleanField,
      id: cleanField.id || finalKey,
      key: finalKey,
      label: cleanLabel || cleanField.label || "Name",
      options: parsedOptions,
    };

    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.checkoutFields];
      if (isAddingField) {
        next.push(finalField);
      } else if (typeof _index === "number" && _index >= 0) {
        next[_index] = finalField;
      }
      return { ...prev, checkoutFields: next };
    });
    setEditingField(null);
    setIsAddingField(false);
  };

  const handleResetCheckoutFields = () => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      checkoutFields: DEFAULT_THEME_CONFIG.productPage.checkoutFields.map((f) => ({
        ...f,
        options: Array.isArray(f.options) ? [...f.options] : [],
      })),
    }));
  };

  // --- Section 4: Summary & Quick-View Trust Badges Handlers ---
  const handleUpdateTrustBadge = (idx, patch) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.trustBadges];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, trustBadges: next };
    });
  };

  const handleMoveTrustBadge = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.trustBadges.length) return;
    setHasUnsavedChanges(true);
    setDraft((prev) => {
      const next = [...prev.trustBadges];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return { ...prev, trustBadges: next };
    });
  };

  const handleAddTrustBadge = () => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      trustBadges: [
        ...prev.trustBadges,
        {
          id: `tb-${Date.now()}`,
          icon: "check",
          color: "emerald",
          text: "100% Authentic Guarantee",
          enabled: true,
        },
      ],
    }));
  };

  const handleDeleteTrustBadge = (idx) => {
    setHasUnsavedChanges(true);
    setDraft((prev) => ({
      ...prev,
      trustBadges: prev.trustBadges.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-neutral-900">
                Product Editorial
              </h2>
              {hasUnsavedChanges && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize the 4 feature cards, order section headers, WooCommerce-style checkout form fields, and shared trust badges across all users and devices.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => persistDraft(draft)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-neutral-950/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "Publishing..." : "Save & Publish Live"}</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
            saveFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveFeedback.text}</span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-1.5 flex flex-wrap gap-1.5 shadow-2xs">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 4 TRUST FEATURE CARDS */}
      {activeSubTab === "cards" && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900">
                  Product Page Feature &amp; Trust Cards
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Edit the icon, header, and description for each card shown above the checkout section on the product page.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
                  <input
                    type="checkbox"
                    checked={draft.showEditorialCards !== false}
                    onChange={(e) => updateDraftField("showEditorialCards", e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <span>Show Section</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Card</span>
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Live Storefront Preview
              </div>
              {draft.showEditorialCards === false ? (
                <p className="text-xs text-neutral-400 italic py-4 text-center">
                  Feature cards section is currently hidden.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {draft.editorialCards
                    .filter((c) => c.enabled !== false)
                    .map((card, i) => (
                      <div
                        key={card.id || i}
                        className="bg-white rounded-2xl border border-neutral-200 p-4 text-center shadow-2xs"
                      >
                        <div className="text-2xl mb-1.5">{card.icon || "✨"}</div>
                        <h4 className="font-bold text-neutral-900 text-xs mb-0.5">
                          {card.title || "Card Header"}
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          {formatEditorialCardText(card.text, themeConfig)}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Cards Editor List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.editorialCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    card.enabled !== false
                      ? "bg-white border-neutral-200 shadow-2xs"
                      : "bg-neutral-50 border-neutral-200/70 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                    <span className="text-xs font-extrabold text-neutral-800 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </span>
                      <span>Card #{idx + 1}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCard(idx, -1)}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        title="Move Left / Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === draft.editorialCards.length - 1}
                        onClick={() => handleMoveCard(idx, 1)}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                        title="Move Right / Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCard(idx, { enabled: card.enabled === false })}
                        className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                          card.enabled !== false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-neutral-200 bg-neutral-100 text-neutral-500"
                        }`}
                        title={card.enabled !== false ? "Hide card" : "Show card"}
                      >
                        {card.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      {draft.editorialCards.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(idx)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-neutral-700">
                      Icon (Choose preset or type any emoji)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={card.icon || ""}
                        onChange={(e) => handleUpdateCard(idx, { icon: e.target.value })}
                        placeholder="🚚"
                        className="w-16 text-center px-2 py-2 rounded-xl border border-neutral-300 text-base focus:border-emerald-600 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {EDITORIAL_CARD_ICON_PRESETS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleUpdateCard(idx, { icon: em })}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center border cursor-pointer transition-colors ${
                              card.icon === em
                                ? "border-emerald-600 bg-emerald-50"
                                : "border-neutral-200 hover:bg-neutral-100"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Header */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Card Header / Title
                    </label>
                    <input
                      type="text"
                      value={card.title || ""}
                      onChange={(e) => handleUpdateCard(idx, { title: e.target.value })}
                      placeholder="e.g. Nationwide Cash on Delivery"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-semibold focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Card Description
                    </label>
                    <input
                      type="text"
                      value={card.text || ""}
                      onChange={(e) => handleUpdateCard(idx, { text: e.target.value })}
                      placeholder="e.g. Inside Dhaka ৳70 • Outside Dhaka ৳130"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:border-emerald-600 focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Tip: Use <code className="bg-neutral-100 px-1 rounded">{"{{hotline}}"}</code> to auto-insert your Shop Hotline/WhatsApp number.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDER SECTION HEADER */}
      {activeSubTab === "orderHeader" && (
        <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="pb-4 border-b border-neutral-100">
            <h3 className="text-sm font-extrabold text-neutral-900">
              Easy Order Process &amp; Checkout Section Headers
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Customize the badge pill, main heading, description, form card header, order summary title, and submit button text on the product landing page.
            </p>
          </div>

          {/* Live Preview */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center space-y-2">
            {draft.checkoutBadgeText && (
              <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-900 font-bold text-xs uppercase tracking-wider">
                {draft.checkoutBadgeText}
              </span>
            )}
            <h4 className="text-xl sm:text-2xl font-black text-neutral-900">
              {draft.checkoutTitle || "Fill out the form below to confirm your order"}
            </h4>
            {draft.checkoutSubtitle && (
              <p className="text-xs text-neutral-500">{draft.checkoutSubtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Top Badge Text (e.g. EASY ORDER PROCESS)
              </label>
              <input
                type="text"
                value={draft.checkoutBadgeText ?? ""}
                onChange={(e) => updateDraftField("checkoutBadgeText", e.target.value)}
                placeholder="Easy Order Process"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Main Order Heading
              </label>
              <input
                type="text"
                value={draft.checkoutTitle ?? ""}
                onChange={(e) => updateDraftField("checkoutTitle", e.target.value)}
                placeholder="Fill out the form below to confirm your order"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-neutral-700 mb-1.5">
                Order Header Description / Subheadline
              </label>
              <input
                type="text"
                value={draft.checkoutSubtitle ?? ""}
                onChange={(e) => updateDraftField("checkoutSubtitle", e.target.value)}
                placeholder="No account creation or advance payment needed"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Delivery Form Card Header
              </label>
              <input
                type="text"
                value={draft.checkoutFormHeading ?? ""}
                onChange={(e) => updateDraftField("checkoutFormHeading", e.target.value)}
                placeholder="1. Your Delivery Information"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Order Summary Card Header
              </label>
              <input
                type="text"
                value={draft.checkoutSummaryHeading ?? ""}
                onChange={(e) => updateDraftField("checkoutSummaryHeading", e.target.value)}
                placeholder="Order Summary"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Confirm Order Button Text (Prefix before Total)
              </label>
              <input
                type="text"
                value={draft.checkoutSubmitBtnText ?? ""}
                onChange={(e) => updateDraftField("checkoutSubmitBtnText", e.target.value)}
                placeholder="Confirm Order"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1.5">
                Terms Notice Below Submit Button
              </label>
              <input
                type="text"
                value={draft.checkoutTermsText ?? ""}
                onChange={(e) => updateDraftField("checkoutTermsText", e.target.value)}
                placeholder="By confirming, you agree to our terms and conditions."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WOOCOMMERCE-STYLE CHECKOUT FORM FIELD EDITOR */}
      {activeSubTab === "checkoutForm" && (
        <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                Checkout Form Field Editor (WooCommerce Style)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Add, edit, reorder, resize (Full/Half), toggle Required, or enable/remove fields like Email. Switch Full Name between 1 input box or 2 boxes (First &amp; Last Name).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetCheckoutFields}
                className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Fields</span>
              </button>
              <button
                type="button"
                onClick={openAddFieldModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Field</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 font-bold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-3 w-20">Order</th>
                  <th className="py-3 px-3">Field Label &amp; Key</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Placeholder / Mode</th>
                  <th className="py-3 px-3">Width</th>
                  <th className="py-3 px-3 text-center">Required</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {draft.checkoutFields.map((field, idx) => {
                  const isLockedOn = CORE_LOCKED_ON.has(field.key);
                  const isEnabled = field.enabled !== false;
                  return (
                    <tr
                      key={field.id || field.key || idx}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        !isEnabled ? "bg-neutral-50/70 opacity-60" : ""
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveField(idx, -1)}
                            className="p-1 rounded border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draft.checkoutFields.length - 1}
                            onClick={() => handleMoveField(idx, 1)}
                            className="p-1 rounded border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">
                          {field.type === "name" && field.nameSplitMode
                            ? `${field.firstNameLabel || "First Name"} + ${field.lastNameLabel || "Last Name"}`
                            : field.label}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <code className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                            {field.key}
                          </code>
                          {field.core && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Core
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 font-semibold text-[11px]">
                          {FIELD_TYPE_BADGES[field.type] || field.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        {field.type === "name" ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                field.nameSplitMode
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              <Columns2 className="w-3 h-3" />
                              {field.nameSplitMode ? "2 Boxes (First & Last)" : "1 Box (Full Name)"}
                            </span>
                            <p className="text-[11px] text-neutral-400 truncate">
                              {field.nameSplitMode
                                ? `${field.firstNamePlaceholder || ""} / ${field.lastNamePlaceholder || ""}`
                                : field.placeholder || "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-500 truncate block">
                            {field.placeholder || "—"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {field.width === "half" ? "Half (50%)" : "Full (100%)"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isLockedOn}
                          onClick={() => handleToggleFieldRequired(idx)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            isLockedOn ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                          } ${
                            field.required
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-neutral-100 text-neutral-600 border-neutral-200"
                          }`}
                        >
                          {field.required ? "Required" : "Optional"}
                        </button>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isLockedOn ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Always On
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleFieldEnabled(idx)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer transition-colors ${
                              isEnabled
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-neutral-200 text-neutral-600 border-neutral-300 hover:bg-neutral-300"
                            }`}
                          >
                            {isEnabled ? "Enabled" : "Removed"}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditFieldModal(field, idx)}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          {!field.core && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomField(idx)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Delete custom field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SHARED TRUST BADGES (ORDER SUMMARY & PRODUCT QUICK VIEW) */}
      {activeSubTab === "trustBadges" && (
        <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900">
                Order Summary &amp; Product Short Window Trust Badges
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                These badges appear both under <strong>Total Payable</strong> on the product landing page and in the <strong>Product Quick-View Modal</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200">
                <input
                  type="checkbox"
                  checked={draft.showTrustBadgesBox !== false}
                  onChange={(e) => {
                    updateDraftField("showTrustBadgesBox", e.target.checked);
                    updateDraftField("showGuaranteeBox", e.target.checked);
                  }}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <span>Show Trust Box</span>
              </label>
              <button
                type="button"
                onClick={handleAddTrustBadge}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Badge Line</span>
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Live Preview (Order Summary &amp; Product Short Window)
            </div>
            {draft.showTrustBadgesBox === false ? (
              <p className="text-xs text-neutral-400 italic py-3 text-center">
                Trust badges box is currently hidden.
              </p>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs text-neutral-600 border border-neutral-200 max-w-md">
                {draft.trustBadges
                  .filter((b) => b.enabled !== false)
                  .map((b, i) => (
                    <div key={b.id || i} className="flex items-center gap-2">
                      {renderTrustBadgeIcon(b.icon, b.color, "w-4 h-4")}
                      <span>{b.text}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {draft.trustBadges.map((badge, idx) => (
              <div
                key={badge.id || idx}
                className={`p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${
                  badge.enabled !== false
                    ? "bg-white border-neutral-200"
                    : "bg-neutral-50 border-neutral-200/70 opacity-60"
                }`}
              >
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    Icon
                  </label>
                  <select
                    value={badge.icon || "shield"}
                    onChange={(e) => handleUpdateTrustBadge(idx, { icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-semibold bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    {TRUST_BADGE_ICON_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    Icon Color
                  </label>
                  <select
                    value={badge.color || "emerald"}
                    onChange={(e) => handleUpdateTrustBadge(idx, { color: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-semibold bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    {TRUST_BADGE_COLOR_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-5">
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={badge.text || ""}
                    onChange={(e) => handleUpdateTrustBadge(idx, { text: e.target.value })}
                    placeholder="e.g. 100% Secure & Verified Order"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-medium focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-1 pt-4 md:pt-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveTrustBadge(idx, -1)}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === draft.trustBadges.length - 1}
                    onClick={() => handleMoveTrustBadge(idx, 1)}
                    className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTrustBadge(idx, { enabled: badge.enabled === false })}
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      badge.enabled !== false
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-neutral-200 bg-neutral-100 text-neutral-500"
                    }`}
                    title={badge.enabled !== false ? "Hide line" : "Show line"}
                  >
                    {badge.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  {draft.trustBadges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTrustBadge(idx)}
                      className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                      title="Delete line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: WOOCOMMERCE-STYLE FIELD EDITOR (ADD / EDIT) */}
      {editingField && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">
                  {isAddingField ? "Add Custom Checkout Field" : `Edit Field: ${editingField.label || editingField.key}`}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Configure field label, placeholder, helper text, layout width, and validation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFieldModal} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {fieldModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldModalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Field Type</label>
                  {editingField.core ? (
                    <input
                      type="text"
                      disabled
                      value={FIELD_TYPE_BADGES[editingField.type] || editingField.type}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 font-semibold"
                    />
                  ) : (
                    <select
                      value={editingField.type || "text"}
                      onChange={(e) => setEditingField((prev) => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-semibold focus:border-emerald-600 focus:outline-none"
                    >
                      {CUSTOM_FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Field Name / Key
                  </label>
                  <input
                    type="text"
                    disabled={editingField.core}
                    value={editingField.key || ""}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, key: e.target.value }))}
                    placeholder="e.g. delivery_note (auto if empty)"
                    className={`w-full px-3 py-2 rounded-xl border font-mono ${
                      editingField.core
                        ? "border-neutral-200 bg-neutral-100 text-neutral-500"
                        : "border-neutral-300 focus:border-emerald-600 focus:outline-none"
                    }`}
                  />
                </div>
              </div>

              {/* Special 1-box vs 2-box toggle for Name field */}
              {editingField.type === "name" && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-indigo-950">Name Input Box Mode</div>
                      <p className="text-[11px] text-indigo-700">
                        Use 1 single box for Full Name, or 2 boxes side-by-side (First Name &amp; Last Name).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingField((prev) => ({ ...prev, nameSplitMode: false }))}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                        !editingField.nameSplitMode
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      1 Input Box (Full Name)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingField((prev) => ({ ...prev, nameSplitMode: true }))}
                      className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                        editingField.nameSplitMode
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      2 Input Boxes (First + Last)
                    </button>
                  </div>

                  {editingField.nameSplitMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/70">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Box 1 Label</label>
                        <input
                          type="text"
                          value={editingField.firstNameLabel ?? ""}
                          onChange={(e) => setEditingField((prev) => ({ ...prev, firstNameLabel: e.target.value }))}
                          placeholder="First Name"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Box 1 Placeholder</label>
                        <input
                          type="text"
                          value={editingField.firstNamePlaceholder ?? ""}
                          onChange={(e) => setEditingField((prev) => ({ ...prev, firstNamePlaceholder: e.target.value }))}
                          placeholder="Enter first name"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Box 2 Label</label>
                        <input
                          type="text"
                          value={editingField.lastNameLabel ?? ""}
                          onChange={(e) => setEditingField((prev) => ({ ...prev, lastNameLabel: e.target.value }))}
                          placeholder="Last Name"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Box 2 Placeholder</label>
                        <input
                          type="text"
                          value={editingField.lastNamePlaceholder ?? ""}
                          onChange={(e) => setEditingField((prev) => ({ ...prev, lastNamePlaceholder: e.target.value }))}
                          placeholder="Enter last name"
                          className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!(editingField.type === "name" && editingField.nameSplitMode) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Label <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingField.label ?? ""}
                      onChange={(e) => setEditingField((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="Field label shown above input"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      value={editingField.placeholder ?? ""}
                      onChange={(e) => setEditingField((prev) => ({ ...prev, placeholder: e.target.value }))}
                      placeholder="Leave empty for no placeholder"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Helper / Description Text (Below Input)
                </label>
                <input
                  type="text"
                  value={editingField.helperText ?? ""}
                  onChange={(e) => setEditingField((prev) => ({ ...prev, helperText: e.target.value }))}
                  placeholder="Optional note shown under the field"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {(editingField.type === "select" || editingField.type === "radio") && (
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Options (One per line or comma-separated)
                  </label>
                  <textarea
                    rows="3"
                    value={fieldOptionsInput}
                    onChange={(e) => setFieldOptionsInput(e.target.value)}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Custom Validation Error Message
                  </label>
                  <input
                    type="text"
                    value={editingField.errorMessage ?? ""}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, errorMessage: e.target.value }))}
                    placeholder="Shown if required field is empty/invalid"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Layout Width
                  </label>
                  <select
                    value={editingField.width || "full"}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, width: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-semibold focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="full">Full Width (100%)</option>
                    <option value="half">Half Width (50% - Side by Side)</option>
                  </select>
                </div>
              </div>

              {!editingField.core && editingField.type !== "checkbox" && (
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Default Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingField.defaultValue ?? ""}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, defaultValue: e.target.value }))}
                    placeholder="Pre-filled value if desired"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-neutral-100">
                <label className="inline-flex items-center gap-2 font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={CORE_LOCKED_ON.has(editingField.key)}
                    checked={editingField.enabled !== false}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>Enabled (Visible on Checkout Form)</span>
                </label>

                <label className="inline-flex items-center gap-2 font-bold text-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={CORE_LOCKED_ON.has(editingField.key)}
                    checked={Boolean(editingField.required)}
                    onChange={(e) => setEditingField((prev) => ({ ...prev, required: e.target.checked }))}
                    className="w-4 h-4 accent-rose-600"
                  />
                  <span>Required Field</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-bold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  {isAddingField ? "Add Field" : "Apply Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminProductEditorial;

