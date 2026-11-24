import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Phone,
  Mail,
  User,
  Eye,
  EyeOff,
  Truck,
  Briefcase,
  Shield,
  RefreshCw,
  Info,
  Navigation,
  Sparkles,
  Save
} from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";
import { apiClient } from "../../services/api";

const ROLE_CONFIGS = {
  ADMIN: {
    labelEn: "Super Admin",
    labelBn: "Super Admin",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    icon: Shield,
    descEn: "Full unrestricted access across all panels, settings, staff, and financial gateways.",
    descBn: "Full unrestricted access across all panels, settings, staff, and financial gateways."
  },
  MANAGER: {
    labelEn: "Operations Manager",
    labelBn: "Operations Manager",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    icon: Briefcase,
    descEn: "Manages orders, inventory, campaigns, and notifications. Sensitive payments & marketing tokens are hidden.",
    descBn: "Manages orders, inventory, campaigns, and notifications. Sensitive payments & marketing tokens are hidden."
  },
  DISPATCHER: {
    labelEn: "Delivery Dispatcher",
    labelBn: "Delivery Dispatcher",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: Truck,
    descEn: "Fulfills orders, prints packing invoices, and connects with Steadfast / Pathao / RedX courier hubs.",
    descBn: "Fulfills orders, prints packing invoices, and connects with Steadfast / Pathao / RedX courier hubs."
  },
  RIDER: {
    labelEn: "Delivery Rider",
    labelBn: "Delivery Rider",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    icon: Navigation,
    descEn: "Logs into Courier Rider Portal using assigned PIN/password to pick up and mark parcel deliveries.",
    descBn: "Logs into Courier Rider Portal using assigned PIN/password to pick up and mark parcel deliveries."
  }
};

export const AdminStaffManagement = () => {
  const { isEnglish } = useLanguage();

  const [staffList, setStaffList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    role: "MANAGER",
    password: "",
    confirmPassword: "",
    notes: "",
    status: "ACTIVE"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [modalError, setModalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Portal Access & Demo Customer Controls (Central DB)
  const [portalAccess, setPortalAccess] = useState({
    frontPanelAllowedRoles: ["ADMIN"],
    riderPortalAllowedRoles: ["RIDER", "DISPATCHER", "ADMIN"],
    demoCustomerEnabled: false,
    demoCustomerPhone: "",
    hasDemoCustomerPassword: false,
    updatedAt: "",
  });
  const [demoCustomerPasswordInput, setDemoCustomerPasswordInput] = useState("");
  const [showDemoPass, setShowDemoPass] = useState(false);
  const [savingPortalAccess, setSavingPortalAccess] = useState(false);
  const [loadingPortalAccess, setLoadingPortalAccess] = useState(true);

  const fetchPortalAccess = async () => {
    setLoadingPortalAccess(true);
    try {
      const res = await apiClient.getPortalAccessConfig();
      if (res?.success && res.portalAccess) {
        setPortalAccess(res.portalAccess);
      }
    } catch {
    } finally {
      setLoadingPortalAccess(false);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getStaffMembers();
      if (Array.isArray(data)) {
        setStaffList(data);
      }
    } catch (err) {
      console.warn("Failed to fetch staff list from backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchPortalAccess();
  }, []);

  const showNotification = (type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleOpenAddModal = (defaultRole = "MANAGER") => {
    setEditingStaff(null);
    setFormData({
      name: "",
      username: "",
      phone: "",
      email: "",
      role: typeof defaultRole === "string" ? defaultRole : "MANAGER",
      password: "",
      confirmPassword: "",
      notes: "",
      status: "ACTIVE"
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleSavePortalAccess = async (e) => {
    if (e) e.preventDefault();
    setSavingPortalAccess(true);
    try {
      const payload = {
        frontPanelAllowedRoles: portalAccess.frontPanelAllowedRoles,
        riderPortalAllowedRoles: portalAccess.riderPortalAllowedRoles,
        demoCustomerEnabled: portalAccess.demoCustomerEnabled,
        demoCustomerPhone: portalAccess.demoCustomerPhone,
      };
      if (demoCustomerPasswordInput.trim()) {
        payload.demoCustomerPassword = demoCustomerPasswordInput.trim();
      }
      const res = await apiClient.updatePortalAccessConfig(payload);
      if (res?.success && res.portalAccess) {
        setPortalAccess(res.portalAccess);
        setDemoCustomerPasswordInput("");
        showNotification("success", res.message || "Portal access settings saved to central database!");
      } else {
        showNotification("error", res?.message || "Failed to save portal access settings.");
      }
    } catch (err) {
      showNotification("error", err?.message || "Failed to save portal access settings.");
    } finally {
      setSavingPortalAccess(false);
    }
  };

  const handleOpenEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || "",
      username: staff.username || "",
      phone: staff.phone || "",
      email: staff.email || "",
      role: staff.role || "MANAGER",
      password: "",
      confirmPassword: "",
      notes: staff.notes || "",
      status: staff.status || "ACTIVE"
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.name.trim()) {
      setModalError("Please enter full name");
      return;
    }
    if (!formData.username.trim()) {
      setModalError("Please enter username");
      return;
    }

    if (!editingStaff) {
      if (!formData.password || formData.password.length < 4) {
        setModalError(
          "Password must be at least 4 characters long"
        );
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setModalError("Passwords do not match");
        return;
      }
    } else if (formData.password) {
      if (formData.password.length < 4) {
        setModalError(
          "Password must be at least 4 characters long"
        );
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setModalError("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // Update staff
        const updatePayload = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          role: formData.role,
          status: formData.status,
          notes: formData.notes.trim()
        };
        if (formData.password) {
          updatePayload.password = formData.password;
        }

        const res = await apiClient.updateStaffMember(editingStaff.id, updatePayload);
        if (res && res.success) {
          const updatedList = staffList.map((s) =>
            s.id === editingStaff.id ? { ...s, ...res.staff } : s
          );
          setStaffList(updatedList);
          setIsModalOpen(false);
          showNotification(
            "success",
            `Staff ${formData.name} updated successfully!`
          );
        } else {
          setModalError(res?.message || ("Update failed"));
        }
      } else {
        // Create staff
        const createPayload = {
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          role: formData.role,
          password: formData.password,
          notes: formData.notes.trim()
        };

        const res = await apiClient.createStaffMember(createPayload);
        if (res && res.success) {
          const updatedList = [...staffList, res.staff];
          setStaffList(updatedList);
          setIsModalOpen(false);
          showNotification(
            "success",
            `New staff member ${formData.name} created successfully!`
          );
        } else {
          setModalError(res?.message || ("Creation failed"));
        }
      }
    } catch (err) {
      setModalError(err.message || ("An error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    if (staff.username.toLowerCase() === "admin" || staff.id === "staff-admin-root") {
      showNotification(
        "error",
        "Primary Super Admin account cannot be suspended!"
      );
      return;
    }

    const newStatus = staff.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await apiClient.updateStaffMember(staff.id, { status: newStatus });
      if (res && res.success) {
        const updatedList = staffList.map((s) =>
          s.id === staff.id ? { ...s, status: newStatus } : s
        );
        setStaffList(updatedList);
        showNotification(
          "success",
          `${staff.name} is now ${newStatus.toLowerCase()}!`
        );
      }
    } catch (err) {
      showNotification("error", err.message || "Failed to update status");
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (staff.username.toLowerCase() === "admin" || staff.id === "staff-admin-root") {
      showNotification(
        "error",
        "Primary Super Admin account cannot be deleted!"
      );
      return;
    }

    const confirmMsg = `Are you sure you want to remove staff member "${staff.name}" (@${staff.username})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiClient.deleteStaffMember(staff.id);
      if (res && res.success) {
        const updatedList = staffList.filter((s) => s.id !== staff.id);
        setStaffList(updatedList);
        showNotification(
          "success",
          `Staff ${staff.name} removed successfully!`
        );
      } else {
        showNotification("error", res?.message || "Delete failed");
      }
    } catch (err) {
      showNotification("error", err.message || "Delete failed");
    }
  };

  const filteredStaff = staffList.filter((staff) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      staff.name?.toLowerCase().includes(q) ||
      staff.username?.toLowerCase().includes(q) ||
      staff.phone?.includes(q) ||
      staff.email?.toLowerCase().includes(q);

    const matchesRole = roleFilter === "ALL" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = staffList.filter((s) => s.role === "ADMIN").length;
  const totalManagers = staffList.filter((s) => s.role === "MANAGER").length;
  const totalDispatchers = staffList.filter((s) => s.role === "DISPATCHER").length;
  const totalRiders = staffList.filter((s) => s.role === "RIDER").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explainer */}
      <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-900 border border-emerald-800/40 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{"Enterprise Role-Based Access Control (RBAC)"}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {"Staff & Access Control Hub"}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {"Assign dedicated roles to your team. Manage Admins, Managers, Dispatchers, Delivery Riders, Front Panel permissions, and Customer Demo account from one central panel."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleOpenAddModal("RIDER")}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{"+ Add Rider"}</span>
            </button>
            <button
              onClick={() => handleOpenAddModal("MANAGER")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{"+ Add New Staff"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all shadow-md ${
            feedbackMsg.type === "success"
              ? "bg-emerald-950/80 border border-emerald-700 text-emerald-200"
              : "bg-rose-950/80 border border-rose-700 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-neutral-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Super Admins */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {"Super Admins"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">{totalAdmins}</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {"Full system & gateway authority"}
          </p>
        </div>

        {/* Managers */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {"Operations Managers"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">{totalManagers}</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {"Orders, inventory, campaigns, AI"}
          </p>
        </div>

        {/* Dispatchers */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {"Delivery Dispatchers"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">{totalDispatchers}</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {"Fulfillment & courier consignment"}
          </p>
        </div>

        {/* Delivery Riders */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
              {"Delivery Riders"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900">{totalRiders}</div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {"Dynamic Rider Portal access & PIN"}
          </p>
        </div>
      </div>

      {/* Staff Table & Filters */}
      <div className="bg-white border border-neutral-200 rounded-3xl shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50/50">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                "Search by name, username, or phone..."
              }
              className="w-full bg-white border border-neutral-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500 transition-colors shadow-2xs"
            />
          </div>

          {/* Filter by Role & Refresh */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex flex-wrap rounded-xl bg-white border border-neutral-300 p-0.5 text-xs font-semibold shadow-2xs">
              {["ALL", "ADMIN", "MANAGER", "DISPATCHER", "RIDER"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    roleFilter === role
                      ? "bg-neutral-900 text-white shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {role === "ALL"
                    ? "All Roles"
                    : ROLE_CONFIGS[role]?.["labelEn"]}
                </button>
              ))}
            </div>

            <button
              onClick={fetchStaff}
              title={"Refresh list"}
              disabled={loading}
              className="p-2 rounded-xl border border-neutral-300 bg-white text-neutral-600 hover:text-emerald-700 hover:border-emerald-500 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100/70 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">{"Staff Member"}</th>
                <th className="py-3.5 px-5">{"Role & Scope"}</th>
                <th className="py-3.5 px-5">{"Contact Info"}</th>
                <th className="py-3.5 px-5">{"Status"}</th>
                <th className="py-3.5 px-5 text-right">{"Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs sm:text-sm text-neutral-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                    <p className="font-semibold text-neutral-600">
                      {"No staff members found matching query"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const roleConfig = ROLE_CONFIGS[staff.role] || ROLE_CONFIGS.MANAGER;
                  const RoleIcon = roleConfig.icon;
                  const isRootAdmin =
                    staff.username.toLowerCase() === "admin" || staff.id === "staff-admin-root";

                  return (
                    <tr key={staff.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                              staff.role === "ADMIN"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : staff.role === "MANAGER"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {staff.name ? staff.name.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 truncate flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {isRootAdmin && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-300">
                                  OWNER
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-neutral-500 font-mono">
                              @{staff.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Scope */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleConfig.badgeClass}`}
                          >
                            <RoleIcon className="w-3.5 h-3.5" />
                            <span>{isEnglish ? roleConfig.labelEn : roleConfig.labelBn}</span>
                          </div>
                          <p className="text-[11px] text-neutral-500 max-w-xs truncate">
                            {isEnglish ? roleConfig.descEn : roleConfig.descBn}
                          </p>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-5">
                        <div className="space-y-1 text-xs text-neutral-600">
                          {staff.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="font-mono">{staff.phone}</span>
                            </div>
                          )}
                          {staff.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{staff.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          disabled={isRootAdmin}
                          title={
                            isRootAdmin
                              ? "Primary admin cannot be suspended"
                              : "Click to toggle active/suspended"
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                            isRootAdmin
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-not-allowed"
                              : staff.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 cursor-pointer"
                              : "bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staff.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          <span>
                            {staff.status === "ACTIVE"
                              ? "Active"
                              : "Suspended"}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(staff)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title={"Edit staff details"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!isRootAdmin && (
                            <button
                              onClick={() => handleDeleteStaff(staff)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={"Delete staff account"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Central Portal Access & Customer Demo Auth Controls */}
      <form
        onSubmit={handleSavePortalAccess}
        className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">
                {"Portal Access & Demo Account Controls"}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                {"Centrally manage Front Panel Customizer access, Courier Rider Portal access, and Demo Customer login from the database."}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPortalAccess || loadingPortalAccess}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingPortalAccess ? "Saving..." : "Save Portal Access Rules"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs">
          {/* 1. Front Panel Customizer Auth */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{"Front Panel Customizer Access"}</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {"Uses central database staff accounts & 2FA instead of static credentials. Choose which roles can open the Front Panel Customizer:"}
            </p>
            <div className="space-y-2 pt-1">
              {[
                { label: "Super Admin Only (Recommended)", roles: ["ADMIN"] },
                { label: "Super Admin & Operations Manager", roles: ["ADMIN", "MANAGER"] },
              ].map((opt) => {
                const isSelected =
                  opt.roles.length === (portalAccess.frontPanelAllowedRoles || []).length &&
                  opt.roles.every((r) => (portalAccess.frontPanelAllowedRoles || []).includes(r));
                return (
                  <label
                    key={opt.label}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold"
                        : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fpRoles"
                      checked={isSelected}
                      onChange={() =>
                        setPortalAccess((prev) => ({ ...prev, frontPanelAllowedRoles: opt.roles }))
                      }
                      className="accent-emerald-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2. Courier Rider Portal Access */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Navigation className="w-4 h-4 text-amber-600" />
              <span>{"Courier Rider Portal Access"}</span>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {"Active riders & permitted logistics staff appear live in Courier Rider Portal using their Staff Password / PIN."}
            </p>
            <div className="space-y-1.5 pt-1">
              {[
                { role: "RIDER", label: "Delivery Riders" },
                { role: "DISPATCHER", label: "Delivery Dispatchers" },
                { role: "MANAGER", label: "Operations Managers" },
                { role: "ADMIN", label: "Super Admins" },
              ].map((item) => {
                const checked = (portalAccess.riderPortalAllowedRoles || []).includes(item.role);
                return (
                  <label
                    key={item.role}
                    className="flex items-center justify-between p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300"
                  >
                    <span className="font-medium text-neutral-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const curr = new Set(portalAccess.riderPortalAllowedRoles || []);
                        if (e.target.checked) curr.add(item.role);
                        else if (curr.size > 1) curr.delete(item.role);
                        setPortalAccess((prev) => ({
                          ...prev,
                          riderPortalAllowedRoles: Array.from(curr),
                        }));
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Customer Demo Account Toggle & Credentials */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-neutral-900">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{"Demo Customer Login"}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPortalAccess((prev) => ({
                    ...prev,
                    demoCustomerEnabled: !prev.demoCustomerEnabled,
                  }))
                }
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                  portalAccess.demoCustomerEnabled
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-neutral-200 text-neutral-700 border-neutral-300"
                }`}
              >
                {portalAccess.demoCustomerEnabled ? "ENABLED" : "DISABLED (SAFE)"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              {"Keep disabled in production unless you want a Demo Customer test login available."}
            </p>
            <div className="space-y-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  {"Demo Customer Phone (11 Digits)"}
                </label>
                <input
                  type="tel"
                  value={portalAccess.demoCustomerPhone || ""}
                  onChange={(e) =>
                    setPortalAccess((prev) => ({ ...prev, demoCustomerPhone: e.target.value }))
                  }
                  placeholder="017XXXXXXXX"
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-neutral-700">
                    {portalAccess.hasDemoCustomerPassword
                      ? "Update Demo Password (optional)"
                      : "Demo Customer Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDemoPass((v) => !v)}
                    className="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                  >
                    {showDemoPass ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showDemoPass ? "text" : "password"}
                  value={demoCustomerPasswordInput}
                  onChange={(e) => setDemoCustomerPasswordInput(e.target.value)}
                  placeholder={
                    portalAccess.hasDemoCustomerPassword
                      ? "•••••••• (Configured)"
                      : "Min 4 characters"
                  }
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-neutral-200 max-w-lg w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                  {editingStaff ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    {editingStaff
                      ? "Edit Staff Member"
                      : "Add New Staff Member"}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {"Define permissions and secure login credentials"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Full Name *"}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={"e.g. Hasan Mahmud"}
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Username (Disabled on Edit to avoid broken sessions) */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Username *"}
                </label>
                <div className="relative">
                  <span className="text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingStaff)}
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                      })
                    }
                    placeholder="hasan_manager"
                    className="w-full bg-white border border-neutral-300 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm text-neutral-900 font-mono focus:outline-hidden focus:border-emerald-600 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Contact: Phone & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Mobile Number"}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="017XXXXXXXX"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="staff@example.com"
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Assign Role *"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(ROLE_CONFIGS).map(([key, config]) => {
                    const isSelected = formData.role === key;
                    const Icon = config.icon;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setFormData({ ...formData, role: key })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`w-4 h-4 ${
                              isSelected ? "text-emerald-700" : "text-neutral-500"
                            }`}
                          />
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? "text-emerald-900" : "text-neutral-700"
                            }`}
                          >
                            {isEnglish ? config.labelEn : config.labelBn}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-tight">
                          {isEnglish ? config.descEn : config.descBn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700">
                    {editingStaff
                      ? "Reset Password (Leave blank to keep current)"
                      : "Password *"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-neutral-500 hover:text-neutral-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? ("Hide") : ("Show")}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingStaff ? "••••••••" : ("Min 4 characters")}
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder={"Confirm Password"}
                      className="w-full bg-white border border-neutral-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Status Selector (If editing) */}
              {editingStaff && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    {"Account Status"}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ACTIVE">{"Active (Can log in)"}</option>
                    <option value="SUSPENDED">
                      {"Suspended (Login blocked)"}
                    </option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  {"Internal Notes / Remarks"}
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={
                    "e.g. Afternoon shift dispatcher, Mirpur hub coordinator"
                  }
                  className="w-full bg-white border border-neutral-300 rounded-xl p-3 text-xs sm:text-sm text-neutral-900 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  {"Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingStaff
                    ? "Update Staff"
                    : "Save & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
