import React, { useEffect, useMemo, useState } from "react";
import "./AssetManagement.css";

import { API_BASE } from "../../lib/api_base";

const emptyForm = {
  name: "",
  assetId: "",
  category: "Laptop",
  status: "Available",
  department: "",
};

function AssetManagement() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [assigningAsset, setAssigningAsset] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [selectedAsset, setSelectedAsset] = useState(null);

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    loadAssets();
    loadEmployees();
  }, []);

  async function loadAssets() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/api/assets`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load assets"
        );
      }

      setAssets(data.assets || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const response = await fetch(
        `${API_BASE}/api/assets/employees`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load employees"
        );
      }

      setEmployees(data.employees || []);
    } catch (err) {
      console.error("Employee loading error:", err);
    }
  }

  // ============================================================
  // FILTERING
  // ============================================================

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        asset.name?.toLowerCase().includes(searchText) ||
        asset.assetId?.toLowerCase().includes(searchText) ||
        asset.assignedTo?.toLowerCase().includes(searchText) ||
        asset.assignedToEmail
          ?.toLowerCase()
          .includes(searchText) ||
        asset.department?.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        asset.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        asset.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    assets,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const categories = useMemo(() => {
    return [
      ...new Set(
        assets
          .map((asset) => asset.category)
          .filter(Boolean)
      ),
    ];
  }, [assets]);

  // ============================================================
  // STATISTICS
  // ============================================================

  const totalAssets = assets.length;

  const availableAssets = assets.filter(
    (asset) => asset.status === "Available"
  ).length;

  const assignedAssets = assets.filter(
    (asset) => asset.status === "Assigned"
  ).length;

  const maintenanceAssets = assets.filter(
    (asset) => asset.status === "Maintenance"
  ).length;

  // ============================================================
  // FORM
  // ============================================================

  function handleInputChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function openAddForm() {
    setEditingAsset(null);

    setForm({
      ...emptyForm,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(asset) {
    setEditingAsset(asset);

    setForm({
      name: asset.name || "",
      assetId: asset.assetId || "",
      category: asset.category || "Other",
      status: asset.status || "Available",
      department: asset.department || "",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingAsset(null);

    setForm({
      ...emptyForm,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const assetId = form.assetId.trim();

    if (!name) {
      setError("Asset name is required.");
      return;
    }

    if (!assetId) {
      setError("Asset ID is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const isEditing = Boolean(editingAsset);

      const url = isEditing
        ? `${API_BASE}/api/assets/${editingAsset._id}`
        : `${API_BASE}/api/assets`;

      const payload = {
        name,
        assetId,
        category: form.category || "Other",
        status: form.status || "Available",
        department: form.department.trim() || "—",
      };

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Failed to ${
              isEditing ? "update" : "create"
            } asset`
        );
      }

      closeForm();

      setSuccess(
        isEditing
          ? "Asset updated successfully."
          : "Asset created successfully."
      );

      await loadAssets();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Something went wrong while saving the asset."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // DELETE
  // ============================================================

  async function handleDelete(asset) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${asset.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/api/assets/${asset._id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete asset"
        );
      }

      if (selectedAsset?._id === asset._id) {
        setSelectedAsset(null);
      }

      setSuccess("Asset deleted successfully.");

      await loadAssets();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to delete asset."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // ASSIGN
  // ============================================================

  function openAssignModal(asset) {
    setAssigningAsset(asset);
    setSelectedEmployee("");
    setError("");
    setSuccess("");
  }

  function closeAssignModal() {
    setAssigningAsset(null);
    setSelectedEmployee("");
  }

  async function handleAssign() {
    if (!assigningAsset) {
      return;
    }

    if (!selectedEmployee) {
      setError("Please select an employee.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const employee = employees.find(
        (item) =>
          String(item._id) ===
          String(selectedEmployee)
      );

      if (!employee) {
        throw new Error("Employee not found.");
      }

      const employeeName =
        `${employee.firstName || ""} ${
          employee.lastName || ""
        }`.trim() || employee.email;

      const response = await fetch(
        `${API_BASE}/api/assets/${assigningAsset._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: assigningAsset.name,
            assetId: assigningAsset.assetId,
            category:
              assigningAsset.category || "Other",
            status: "Assigned",
            assignedToUserId:
              String(employee._id),
            assignedTo: employeeName,
            department:
              employee.department || "—",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign asset"
        );
      }

      closeAssignModal();

      setSuccess(
        `Asset assigned to ${employeeName} successfully.`
      );

      await loadAssets();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to assign asset."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // RETURN
  // ============================================================

  async function handleReturn(asset) {
    const confirmed = window.confirm(
      `Return "${asset.name}" from ${
        asset.assignedTo || "the employee"
      }?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE}/api/assets/${asset._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: asset.name,
            assetId: asset.assetId,
            category: asset.category || "Other",
            status: "Available",
            assignedToUserId: null,
            assignedTo: "Unassigned",
            department: "—",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to return asset"
        );
      }

      setSuccess("Asset returned successfully.");

      await loadAssets();
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to return asset."
      );
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function getStatusClass(status) {
    switch (status) {
      case "Available":
        return "status-available";

      case "Assigned":
        return "status-assigned";

      case "Maintenance":
        return "status-maintenance";

      default:
        return "status-default";
    }
  }

  function getCategoryIcon(category) {
    switch (category) {
      case "Laptop":
        return "▣";

      case "Monitor":
        return "▤";

      case "Phone":
        return "▥";

      case "Tablet":
        return "▦";

      case "Keyboard":
        return "⌨";

      case "Mouse":
        return "◉";

      default:
        return "◫";
    }
  }

  function formatDate(date) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getInitials(name) {
    if (!name) {
      return "U";
    }

    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    <div className="asset-management-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="asset-management-header">

        <div>
          <p className="asset-management-eyebrow">
            ADMIN PORTAL
          </p>

          <h1>Asset Management</h1>

          <p>
            Manage company assets and employee
            assignments from one place.
          </p>
        </div>

        <button
          className="add-asset-button"
          onClick={openAddForm}
        >
          <span>+</span>
          Add Asset
        </button>

      </div>

      {/* ======================================================
          ALERTS
      ====================================================== */}

      {error && (
        <div className="asset-alert asset-alert-error">
          <span>!</span>

          <p>{error}</p>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="asset-alert asset-alert-success">
          <span>✓</span>

          <p>{success}</p>

          <button
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="asset-summary-grid">

        <div className="asset-summary-card">
          <div className="asset-summary-icon">
            ◫
          </div>

          <div>
            <span>Total Assets</span>
            <strong>{totalAssets}</strong>
          </div>
        </div>

        <div className="asset-summary-card">
          <div className="asset-summary-icon">
            ✓
          </div>

          <div>
            <span>Available</span>
            <strong>{availableAssets}</strong>
          </div>
        </div>

        <div className="asset-summary-card">
          <div className="asset-summary-icon">
            →
          </div>

          <div>
            <span>Assigned</span>
            <strong>{assignedAssets}</strong>
          </div>
        </div>

        <div className="asset-summary-card">
          <div className="asset-summary-icon">
            !
          </div>

          <div>
            <span>Maintenance</span>
            <strong>{maintenanceAssets}</strong>
          </div>
        </div>

      </div>

      {/* ======================================================
          ASSET TABLE
      ====================================================== */}

      <div className="asset-management-section">

        <div className="asset-section-heading">

          <div>
            <h2>Company Assets</h2>

            <p>
              View, assign and manage registered
              company assets.
            </p>
          </div>

          <span className="asset-result-count">
            {filteredAssets.length}{" "}
            {filteredAssets.length === 1
              ? "Asset"
              : "Assets"}
          </span>

        </div>

        {/* FILTERS */}

        <div className="asset-filters">

          <div className="asset-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="All">
              All Status
            </option>

            <option value="Available">
              Available
            </option>

            <option value="Assigned">
              Assigned
            </option>

            <option value="Maintenance">
              Maintenance
            </option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <option value="All">
              All Categories
            </option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

        </div>

        {/* TABLE */}

        {loading ? (

          <div className="asset-loading">
            <div className="asset-loading-spinner"></div>

            <p>
              Loading assets...
            </p>
          </div>

        ) : filteredAssets.length === 0 ? (

          <div className="asset-empty">

            <div className="asset-empty-icon">
              ◫
            </div>

            <h3>No assets found</h3>

            <p>
              {assets.length === 0
                ? "Start by adding your first company asset."
                : "Try changing your search or filters."}
            </p>

            {assets.length === 0 && (
              <button onClick={openAddForm}>
                Add First Asset
              </button>
            )}

          </div>

        ) : (

          <div className="asset-table-wrapper">

            <table className="asset-table">

              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Asset ID</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredAssets.map((asset) => (

                  <tr key={asset._id}>

                    <td>
                      <div className="asset-name-cell">

                        <div className="asset-table-icon">
                          {getCategoryIcon(
                            asset.category
                          )}
                        </div>

                        <div>
                          <strong>
                            {asset.name}
                          </strong>

                          {asset.department &&
                            asset.department !==
                              "—" && (
                              <small>
                                {
                                  asset.department
                                }
                              </small>
                            )}
                        </div>

                      </div>
                    </td>

                    <td>
                      <span className="asset-tag">
                        {asset.assetId}
                      </span>
                    </td>

                    <td>
                      {asset.category || "—"}
                    </td>

                    <td>
                      <span
                        className={`asset-status ${getStatusClass(
                          asset.status
                        )}`}
                      >
                        <span>●</span>

                        {asset.status ||
                          "Available"}
                      </span>
                    </td>

                    <td>

                      {asset.status ===
                      "Assigned" ? (

                        <div className="assigned-person">

                          <div className="assigned-avatar">
                            {getInitials(
                              asset.assignedTo
                            )}
                          </div>

                          <div>
                            <strong>
                              {asset.assignedTo ||
                                "Employee"}
                            </strong>

                            <small>
                              {asset.assignedToEmail ||
                                "—"}
                            </small>
                          </div>

                        </div>

                      ) : (

                        <span className="not-assigned">
                          Not assigned
                        </span>

                      )}

                    </td>

                    <td>
                      {formatDate(
                        asset.createdAt
                      )}
                    </td>

                    <td>

                      <div className="asset-actions">

                        <button
                          className="action-view"
                          title="View details"
                          onClick={() =>
                            setSelectedAsset(
                              asset
                            )
                          }
                        >
                          View
                        </button>

                        {asset.status ===
                        "Assigned" ? (

                          <button
                            className="action-return"
                            onClick={() =>
                              handleReturn(
                                asset
                              )
                            }
                            disabled={saving}
                          >
                            Return
                          </button>

                        ) : (

                          <button
                            className="action-assign"
                            onClick={() =>
                              openAssignModal(
                                asset
                              )
                            }
                            disabled={
                              asset.status ===
                              "Maintenance"
                            }
                          >
                            Assign
                          </button>

                        )}

                        <button
                          className="action-edit"
                          onClick={() =>
                            openEditForm(
                              asset
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="action-delete"
                          onClick={() =>
                            handleDelete(
                              asset
                            )
                          }
                          disabled={saving}
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showForm && (

        <div
          className="asset-modal-overlay"
          onClick={closeForm}
        >

          <div
            className="asset-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="asset-modal-header">

              <div>
                <h2>
                  {editingAsset
                    ? "Edit Asset"
                    : "Add New Asset"}
                </h2>

                <p>
                  {editingAsset
                    ? "Update the asset information."
                    : "Register a new company asset."}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>

            </div>

            <form
              className="asset-form"
              onSubmit={handleSubmit}
            >

              <div className="asset-form-grid">

                <div className="asset-form-field full">

                  <label>
                    Asset Name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={
                      handleInputChange
                    }
                    placeholder="e.g. Dell Latitude 5420"
                    autoFocus
                  />

                </div>

                <div className="asset-form-field">

                  <label>
                    Asset ID *
                  </label>

                  <input
                    name="assetId"
                    value={form.assetId}
                    onChange={
                      handleInputChange
                    }
                    placeholder="e.g. AST-001"
                  />

                </div>

                <div className="asset-form-field">

                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={
                      handleInputChange
                    }
                  >
                    <option value="Laptop">
                      Laptop
                    </option>

                    <option value="Monitor">
                      Monitor
                    </option>

                    <option value="Printer">
                      Printer
                    </option>

                    <option value="Phone">
                      Phone
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                </div>

                <div className="asset-form-field">

                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={
                      handleInputChange
                    }
                  >
                    <option value="Available">
                      Available
                    </option>

                    <option value="Assigned">
                      Assigned
                    </option>

                    <option value="Maintenance">
                      Maintenance
                    </option>
                  </select>

                </div>

                <div className="asset-form-field">

                  <label>
                    Department
                  </label>

                  <input
                    name="department"
                    value={
                      form.department
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="e.g. Human Resources"
                  />

                </div>

              </div>

              <div className="asset-form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-asset-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingAsset
                    ? "Update Asset"
                    : "Add Asset"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ======================================================
          ASSIGN MODAL
      ====================================================== */}

      {assigningAsset && (

        <div
          className="asset-modal-overlay"
          onClick={closeAssignModal}
        >

          <div
            className="asset-modal assign-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="asset-modal-header">

              <div>
                <h2>
                  Assign Asset
                </h2>

                <p>
                  Select an employee to receive
                  this asset.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={
                  closeAssignModal
                }
              >
                ×
              </button>

            </div>

            <div className="assign-asset-preview">

              <div className="asset-preview-icon">
                {getCategoryIcon(
                  assigningAsset.category
                )}
              </div>

              <div>
                <strong>
                  {assigningAsset.name}
                </strong>

                <span>
                  {assigningAsset.assetId}
                </span>
              </div>

            </div>

            <div className="asset-form-field">

              <label>
                Select Employee
              </label>

              <select
                value={selectedEmployee}
                onChange={(event) =>
                  setSelectedEmployee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Choose an employee...
                </option>

                {employees.map((employee) => (

                  <option
                    key={employee._id}
                    value={employee._id}
                  >
                    {employee.firstName}{" "}
                    {employee.lastName} —{" "}
                    {employee.email}
                  </option>

                ))}

              </select>

            </div>

            <div className="asset-form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={
                  closeAssignModal
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-asset-button"
                onClick={handleAssign}
                disabled={saving}
              >
                {saving
                  ? "Assigning..."
                  : "Assign Asset"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedAsset && (

        <div
          className="asset-modal-overlay"
          onClick={() =>
            setSelectedAsset(null)
          }
        >

          <div
            className="asset-modal asset-details-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="asset-modal-header">

              <div>
                <h2>
                  Asset Details
                </h2>

                <p>
                  Complete information about
                  this company asset.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedAsset(null)
                }
              >
                ×
              </button>

            </div>

            <div className="asset-detail-hero">

              <div className="asset-detail-big-icon">
                {getCategoryIcon(
                  selectedAsset.category
                )}
              </div>

              <div>
                <h3>
                  {selectedAsset.name}
                </h3>

                <span>
                  {selectedAsset.category ||
                    "Other"}
                </span>
              </div>

            </div>

            <div className="asset-detail-grid">

              <div>
                <small>
                  Asset ID
                </small>

                <strong>
                  {selectedAsset.assetId}
                </strong>
              </div>

              <div>
                <small>
                  Category
                </small>

                <strong>
                  {selectedAsset.category ||
                    "—"}
                </strong>
              </div>

              <div>
                <small>
                  Status
                </small>

                <strong>
                  {selectedAsset.status ||
                    "Available"}
                </strong>
              </div>

              <div>
                <small>
                  Department
                </small>

                <strong>
                  {selectedAsset.department ||
                    "—"}
                </strong>
              </div>

              <div>
                <small>
                  Created
                </small>

                <strong>
                  {formatDate(
                    selectedAsset.createdAt
                  )}
                </strong>
              </div>

              <div>
                <small>
                  Last Updated
                </small>

                <strong>
                  {formatDate(
                    selectedAsset.updatedAt
                  )}
                </strong>
              </div>

              <div className="full-detail">

                <small>
                  Assigned To
                </small>

                <strong>
                  {selectedAsset.assignedTo ||
                    "Unassigned"}
                </strong>

                {selectedAsset.assignedToEmail && (
                  <span>
                    {
                      selectedAsset.assignedToEmail
                    }
                  </span>
                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default AssetManagement;