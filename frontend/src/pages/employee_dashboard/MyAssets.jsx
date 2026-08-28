import React, { useEffect, useState } from "react";
import "./MyAssets.css";

import { API_BASE } from "../../lib/api_base";





const CURRENT_EMPLOYEE_ID =
  localStorage.getItem("userId") ||
  localStorage.getItem("employeeId") ||
  "";

const CURRENT_EMPLOYEE_EMAIL =
  "rakibhasan@gmail.com";

function MyAssets() {
  const [assets, setAssets] = useState([]);
  const [employee, setEmployee] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAsset, setSelectedAsset] =
    useState(null);

  useEffect(() => {
    loadMyAssets();
  }, []);

  async function loadMyAssets() {
    try {
      setLoading(true);
      setError("");

      if (!CURRENT_EMPLOYEE_ID) {
        throw new Error(
          "Employee ID is not available. Please set the current employee MongoDB ID."
        );
      }

      const response = await fetch(
        `${API_BASE}/api/assets/my/${encodeURIComponent(
          CURRENT_EMPLOYEE_ID
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load your assets"
        );
      }

      setAssets(data.assets || []);
      setEmployee(data.employee || null);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Failed to load your assigned assets."
      );
    } finally {
      setLoading(false);
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

      case "Printer":
        return "▤";

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

  function getEmployeeName() {
    if (!employee) {
      return "Employee";
    }

    const name =
      `${employee.firstName || ""} ${
        employee.lastName || ""
      }`.trim();

    return name || "Employee";
  }

  function getInitials() {
    const name = getEmployeeName();

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

  const goodConditionCount = assets.length;

  return (
    <div className="my-assets-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="my-assets-header">

        <div>
          <p className="my-assets-eyebrow">
            EMPLOYEE PORTAL
          </p>

          <h1>My Assets</h1>

          <p>
            View the company assets currently
            assigned to you.
          </p>
        </div>

        <div className="employee-profile-mini">

          <div className="employee-avatar">
            {getInitials()}
          </div>

          <div>
            <strong>
              {getEmployeeName()}
            </strong>

            <span>
              {employee?.department ||
                "Employee"}
            </span>

            <small>
              {employee?.email ||
                CURRENT_EMPLOYEE_EMAIL}
            </small>
          </div>

        </div>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="my-assets-error">

          <span>!</span>

          <p>{error}</p>

          <button
            onClick={loadMyAssets}
          >
            Retry
          </button>

        </div>

      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="my-assets-summary">

        <div className="my-assets-summary-card">

          <div className="my-assets-summary-icon">
            ◫
          </div>

          <div>
            <span>
              Assigned Assets
            </span>

            <strong>
              {loading
                ? "—"
                : assets.length}
            </strong>
          </div>

        </div>

        <div className="my-assets-summary-card">

          <div className="my-assets-summary-icon">
            ✓
          </div>

          <div>
            <span>
              Assigned
            </span>

            <strong>
              {loading
                ? "—"
                : goodConditionCount}
            </strong>
          </div>

        </div>

      </div>

      {/* ======================================================
          ASSETS
      ====================================================== */}

      <div className="my-assets-section">

        <div className="my-assets-section-header">

          <div>
            <h2>
              Assigned Assets
            </h2>

            <p>
              Assets currently registered under
              your employee profile.
            </p>
          </div>

          <span className="asset-count">
            {loading
              ? "Loading..."
              : `${assets.length} ${
                  assets.length === 1
                    ? "Asset"
                    : "Assets"
                }`}
          </span>

        </div>

        {/* LOADING */}

        {loading ? (

          <div className="my-assets-loading">

            <div className="my-assets-spinner"></div>

            <p>
              Loading your assets...
            </p>

          </div>

        ) : assets.length === 0 ? (

          <div className="no-assets">

            <div className="no-assets-icon">
              ◫
            </div>

            <h3>
              No assets assigned
            </h3>

            <p>
              You currently don't have any
              company assets assigned to you.
            </p>

          </div>

        ) : (

          <div className="employee-assets-list">

            {assets.map((asset) => (

              <div
                className="employee-asset-card"
                key={asset._id}
              >

                <div className="employee-asset-icon">
                  {getCategoryIcon(
                    asset.category
                  )}
                </div>

                <div className="employee-asset-info">

                  <div className="employee-asset-title">

                    <h3>
                      {asset.name}
                    </h3>

                    <span>
                      {asset.category ||
                        "Asset"}
                    </span>

                  </div>

                  <div className="employee-asset-details">

                    <div>

                      <small>
                        Asset ID
                      </small>

                      <strong>
                        {asset.assetId ||
                          "—"}
                      </strong>

                    </div>

                    <div>

                      <small>
                        Added Date
                      </small>

                      <strong>
                        {formatDate(
                          asset.createdAt
                        )}
                      </strong>

                    </div>

                    <div>

                      <small>
                        Status
                      </small>

                      <strong>

                        <span className="condition-good">
                          ●{" "}
                          {asset.status ||
                            "Assigned"}
                        </span>

                      </strong>

                    </div>

                  </div>

                </div>

                <button
                  className="view-asset-button"
                  onClick={() =>
                    setSelectedAsset(asset)
                  }
                >
                  View Details
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ======================================================
          RESPONSIBILITY NOTICE
      ====================================================== */}

      <div className="asset-notice">

        <div className="asset-notice-icon">
          i
        </div>

        <div>

          <strong>
            Asset responsibility
          </strong>

          <p>
            Please take care of all company assets
            assigned to you. If an asset is damaged,
            lost, or requires maintenance, contact
            your administrator.
          </p>

        </div>

      </div>

      {/* ======================================================
          DETAILS MODAL
      ====================================================== */}

      {selectedAsset && (

        <div
          className="my-assets-modal-overlay"
          onClick={() =>
            setSelectedAsset(null)
          }
        >

          <div
            className="my-assets-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="my-assets-modal-header">

              <div>
                <h2>
                  Asset Details
                </h2>

                <p>
                  Information about your assigned
                  asset.
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedAsset(null)
                }
              >
                ×
              </button>

            </div>

            <div className="asset-detail-content">

              <div className="asset-detail-main">

                <div className="asset-detail-icon">
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
                      "Asset"}
                  </span>
                </div>

              </div>

              <div className="asset-detail-grid">

                <div>
                  <small>
                    Asset ID
                  </small>

                  <strong>
                    {selectedAsset.assetId ||
                      "—"}
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
                      "Assigned"}
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
                    Assigned To
                  </small>

                  <strong>
                    {selectedAsset.assignedTo ||
                      getEmployeeName()}
                  </strong>
                </div>

                <div>
                  <small>
                    Assigned Email
                  </small>

                  <strong>
                    {selectedAsset.assignedToEmail ||
                      employee?.email ||
                      "—"}
                  </strong>
                </div>

                <div>
                  <small>
                    Added Date
                  </small>

                  <strong>
                    {formatDate(
                      selectedAsset.createdAt
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    Updated Date
                  </small>

                  <strong>
                    {formatDate(
                      selectedAsset.updatedAt
                    )}
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default MyAssets;