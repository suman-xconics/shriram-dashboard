import { useState, useMemo, useEffect, useRef } from "react";
import { getInstallationRequisitions } from "../api/installationRequisitionApi";
import { getLenderBranchById } from "../api/lenderBranchApi";
import { Eye, X, Upload, Search } from "lucide-react";
import "./Dashboard.css";

export default function Dashboard() {
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [branchData, setBranchData] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Treat ASSIGNED as Opened (PENDING) globally
  const normalizeStatus = (status) => {
    if (status === "ASSIGNED") return "PENDING";
    return status;
  };

  /* =====================
     FETCH DATA ON MOUNT
     ===================== */
  useEffect(() => {
    fetchRequisitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear search when filter changes to ALL
  useEffect(() => {
    if (filter === "ALL") setSearchTerm("");
  }, [filter]);

  const fetchRequisitions = async () => {
    setLoading(true);
    setError(null);

    const result = await getInstallationRequisitions({ limit: 1000 });

    if (result.success) {
      setRequisitions(result.data);
      fetchBranchData(result.data);
    } else {
      setError(result.error);
      setRequisitions([]);
    }

    setLoading(false);
  };

  /* =====================
     FETCH BRANCH DATA FOR ALL REQUISITIONS
     ===================== */
  const fetchBranchData = async (requisitions) => {
    const uniqueBranchIds = [
      ...new Set(requisitions.map((req) => req.branchId).filter((id) => id != null)),
    ];

    const branchPromises = uniqueBranchIds.map(async (branchId) => {
      const result = await getLenderBranchById(branchId);
      return {
        branchId,
        data: result.success ? result.data : null,
      };
    });

    const branchResults = await Promise.all(branchPromises);

    const branchMap = {};
    branchResults.forEach(({ branchId, data }) => {
      branchMap[branchId] = data;
    });

    setBranchData(branchMap);
  };

  /* =====================
     FILE UPLOAD HANDLERS
     ===================== */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); // produces data URL with base64 payload [web:24]
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls") &&
      !file.name.endsWith(".csv")
    ) {
      alert("Please upload an Excel file (.xlsx, .xls) or CSV file");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const base64Content = await convertFileToBase64(file);

      const response = await fetch(
        "http://172.105.36.66:8020/installationRequisition/create/bulk",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: base64Content }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert("File uploaded successfully!");
        fetchRequisitions();
      } else {
        throw new Error(result.message || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* =====================
     HELPER FUNCTIONS
     ===================== */
  const getBranchName = (branchId) => {
    if (!branchId) return "N/A";
    const branch = branchData[branchId];
    return branch?.branchName || "Loading...";
  };

  const getState = (branchId) => {
    if (!branchId) return "N/A";
    const branch = branchData[branchId];
    return branch?.state || "N/A";
  };

  const formatTableDate = (isoDateString) => {
    if (!isoDateString) return "N/A";
    try {
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) return "N/A";

      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getDisplayStatus = (status) => {
    const s = normalizeStatus(status);
    const statusMap = {
      NEW: "Opened",
      PENDING: "Opened",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Closed",
    };
    return statusMap[s] || s;
  };

  const getStatusStyle = (status) => {
    const s = normalizeStatus(status);
    const styles = {
      NEW: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
      PENDING: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
      IN_PROGRESS: { backgroundColor: "#FEF3C7", color: "#92400E" },
      COMPLETED: { backgroundColor: "#D1FAE5", color: "#065F46" },
    };
    return styles[s] || styles.NEW;
  };

  // NOTE: added "ASSIGNED" so those rows are included, then normalized to PENDING
  const allowedStatuses = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"];

  /* =====================
     FILTERED DATA
     ===================== */
  const filteredRequisitions = useMemo(() => {
    let filtered = requisitions.filter((r) =>
      allowedStatuses.includes(normalizeStatus(r.status))
    );

    // Apply status filter
    if (filter !== "ALL") {
      const filterMap = {
        Opened: "PENDING",
        "In Progress": "IN_PROGRESS",
        Closed: "COMPLETED",
      };
      const actualStatus = filterMap[filter];

      filtered = filtered.filter((r) => normalizeStatus(r.status) === actualStatus);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.vehicleNo?.toLowerCase().includes(searchLower) ||
          r.requisitionNo?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [requisitions, filter, searchTerm]); // useMemo recomputes when deps change [web:2]

  const counts = useMemo(() => {
    const allowedRequisitions = requisitions.filter((r) =>
      allowedStatuses.includes(normalizeStatus(r.status))
    );

    return {
      total: allowedRequisitions.length,
      opened: allowedRequisitions.filter((r) => normalizeStatus(r.status) === "PENDING").length,
      inProgress: allowedRequisitions.filter((r) => normalizeStatus(r.status) === "IN_PROGRESS")
        .length,
      closed: allowedRequisitions.filter((r) => normalizeStatus(r.status) === "COMPLETED").length,
    };
  }, [requisitions]); // useMemo recomputes when deps change [web:2]

  /* =====================
     MODAL HANDLERS
     ===================== */
  const handleViewDetails = (requisition) => {
    setSelectedRequisition(requisition);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequisition(null);
  };

  const clearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>All Tickets</h2>
          <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}>
            Home • Tickets
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              backgroundColor: "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload Sheet"}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
          padding: "1rem 1.5rem",
          flexShrink: 0,
        }}
      >
        <SummaryCard title="Total" value={counts.total} color="#3B82F6" />
        <SummaryCard title="Opened" value={counts.opened} color="#10B981" />
        <SummaryCard title="In Progress" value={counts.inProgress} color="#F59E0B" />
        <SummaryCard title="Closed" value={counts.closed} color="#14B8A6" />
      </div>

      {/* FILTERS & SEARCH */}
      <div
        style={{
          padding: "0 1.5rem 1rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        {/* Search Bar */}
        <div style={{ position: "relative", maxWidth: "500px" }}>
          <Search
            size={20}
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
              pointerEvents: "none",
            }}
          />

          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by Vehicle No. or Requisition No."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 3rem",
              border: "2px solid #E5E7EB",
              borderRadius: "12px",
              fontSize: "0.875rem",
              backgroundColor: "white",
              transition: "all 0.2s ease",
              outline: "none",
            }}
            onFocus={(e) => {
              if (!searchTerm) {
                e.target.style.borderColor = "#4F46E5";
                e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.1)";
              }
            }}
            onBlur={(e) => {
              if (!searchTerm) {
                e.target.style.borderColor = "#E5E7EB";
                e.target.style.boxShadow = "none";
              }
            }}
          />

          {searchTerm && (
            <button
              onClick={clearSearch}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                padding: "0.25rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                width: "24px",
                height: "24px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F3F4F6";
                e.currentTarget.style.color = "#374151";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#9CA3AF";
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["ALL", "Opened", "In Progress", "Closed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: filter === s ? "#4F46E5" : "white",
                color: filter === s ? "white" : "#374151",
                border: `1px solid ${filter === s ? "#4F46E5" : "#e5e7eb"}`,
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (filter !== s) {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                  e.currentTarget.style.borderColor = "#D1D5DB";
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== s) {
                  e.currentTarget.style.backgroundColor = "white";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Info */}
      {searchTerm.trim() &&
        filteredRequisitions.length <
          requisitions.filter((r) => allowedStatuses.includes(normalizeStatus(r.status))).length && (
          <div
            style={{
              padding: "0 1.5rem 1rem 1.5rem",
              color: "#6B7280",
              fontSize: "0.875rem",
              flexShrink: 0,
            }}
          >
            Showing {filteredRequisitions.length} of {counts.total} tickets for "{searchTerm}"
          </div>
        )}

      {/* ERROR MESSAGE */}
      {error && (
        <div
          style={{
            margin: "0 1.5rem 1rem 1.5rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#FEE2E2",
            color: "#DC2626",
            borderRadius: "6px",
            fontSize: "0.875rem",
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* TABLE CONTAINER */}
      <div
        style={{
          flex: 1,
          margin: "0 1.5rem 1.5rem 1.5rem",
          backgroundColor: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            flex: 1,
            position: "relative",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <table
            style={{
              width: "max-content",
              minWidth: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "#F9FAFB",
                zIndex: 10,
              }}
            >
              <tr>
                <th style={{ ...headerStyle, width: "70px" }}>ID</th>
                <th style={{ ...headerStyle, width: "140px" }}>Requisition No</th>
                <th style={{ ...headerStyle, width: "110px" }}>Date</th>
                <th style={{ ...headerStyle, width: "90px" }}>Branch Code</th>
                <th style={{ ...headerStyle, width: "150px" }}>Branch Name</th>
                <th style={{ ...headerStyle, width: "120px" }}>Vehicle No</th>
                <th style={{ ...headerStyle, width: "150px" }}>Customer</th>
                <th style={{ ...headerStyle, width: "90px" }}>Pincode</th>
                <th style={{ ...headerStyle, width: "120px" }}>State</th>
                <th style={{ ...headerStyle, width: "120px" }}>Device</th>
                <th style={{ ...headerStyle, width: "110px" }}>Status</th>
                <th style={{ ...headerStyle, width: "80px" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [...Array(10)].map((_, index) => (
                  <tr key={index}>
                    {[...Array(12)].map((_, colIndex) => (
                      <td key={colIndex} style={cellStyle}>
                        <div
                          style={{
                            height: "16px",
                            backgroundColor: "#E5E7EB",
                            borderRadius: "4px",
                            animation: "pulse 1.5s ease-in-out infinite",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ ...cellStyle, textAlign: "center", padding: "3rem" }}>
                    {searchTerm.trim()
                      ? `No tickets found for "${searchTerm}"`
                      : "No tickets found"}
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((req) => (
                  <tr
                    key={req.id}
                    style={{
                      transition: "background-color 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9FAFB")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={cellStyle}>{req.id}</td>
                    <td style={cellStyle}>
                      <strong style={{ fontWeight: "600" }}>{req.requisitionNo}</strong>
                    </td>
                    <td style={cellStyle}>{formatTableDate(req.createdAt)}</td>
                    <td style={cellStyle}>{req.branch?.branchCode || "N/A"}</td>
                    <td style={cellStyle}>{getBranchName(req.branchId)}</td>
                    <td style={cellStyle}>{req.vehicleNo}</td>
                    <td style={cellStyle}>{req.customerName}</td>
                    <td style={cellStyle}>{req.pincode}</td>
                    <td style={cellStyle}>{getState(req.branchId)}</td>
                    <td style={cellStyle}>{req.deviceType}</td>
                    <td style={cellStyle}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          ...getStatusStyle(req.status),
                        }}
                      >
                        {getDisplayStatus(req.status)}
                      </span>
                    </td>
                    <td style={cellStyle}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(req);
                        }}
                        style={{
                          padding: "0.375rem",
                          backgroundColor: "#F3F4F6",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background-color 0.15s",
                          color: "#000",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E5E7EB")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F3F4F6")}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL */}
      {showModal && selectedRequisition && (
        <TicketModal
          requisition={selectedRequisition}
          branchData={branchData[selectedRequisition.branchId]}
          onClose={handleCloseModal}
          normalizeStatus={normalizeStatus}
        />
      )}
    </div>
  );
}

/* =====================
   STYLES
   ===================== */
const headerStyle = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  color: "#6B7280",
  borderBottom: "1px solid #E5E7EB",
  whiteSpace: "nowrap",
  position: "sticky",
  backgroundColor: "#F9FAFB",
};

const cellStyle = {
  padding: "0.75rem 1rem",
  borderBottom: "1px solid #F3F4F6",
  whiteSpace: "nowrap",
  color: "#374151",
};

/* =====================
   SUMMARY CARD
   ===================== */
function SummaryCard({ title, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid #E5E7EB",
        borderLeft: `4px solid ${color}`,
      }}
    >
      <h4
        style={{
          margin: 0,
          fontSize: "0.875rem",
          fontWeight: "500",
          color: "#6B7280",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>
        {value}
      </p>
    </div>
  );
}

/* =====================
   TICKET MODAL
   ===================== */
function TicketModal({ requisition, branchData, onClose, normalizeStatus }) {
  const formatDate = (isoDateString) => {
    if (!isoDateString) return "N/A";
    try {
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) return "N/A";

      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getDisplayStatus = (status) => {
    const s = normalizeStatus(status);
    const statusMap = {
      NEW: "Opened",
      PENDING: "Opened",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Closed",
    };
    return statusMap[s] || s;
  };

  const getStatusStyle = (status) => {
    const s = normalizeStatus(status);
    const styles = {
      NEW: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
      PENDING: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
      IN_PROGRESS: { backgroundColor: "#FEF3C7", color: "#92400E" },
      COMPLETED: { backgroundColor: "#D1FAE5", color: "#065F46" },
    };
    return styles[s] || styles.NEW;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            zIndex: 10,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>Ticket Details</h2>
            <p style={{ margin: "0.25rem 0 0 0", color: "#666", fontSize: "0.875rem" }}>
              {requisition.requisitionNo}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem",
              backgroundColor: "#F3F4F6",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#000",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "1.5rem" }}>
          {/* STATUS BADGE */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "16px",
                fontSize: "0.875rem",
                fontWeight: "500",
                ...getStatusStyle(requisition.status),
              }}
            >
              {getDisplayStatus(requisition.status)}
            </span>
          </div>

          {/* BASIC INFO */}
          <Section title="Basic Information">
            <InfoGrid>
              <InfoItem label="ID" value={requisition.id} />
              <InfoItem label="Requisition Number" value={requisition.requisitionNo} bold />
              <InfoItem label="Branch ID" value={requisition.branchId || "N/A"} />
              <InfoItem label="Branch Name" value={branchData?.branchName || "N/A"} />
              <InfoItem label="Priority" value={requisition.priority || "NORMAL"} />
            </InfoGrid>
          </Section>

          {/* VEHICLE & CUSTOMER INFO */}
          <Section title="Vehicle & Customer Information">
            <InfoGrid>
              <InfoItem label="Vehicle Number" value={requisition.vehicleNo} />
              <InfoItem label="Customer Name" value={requisition.customerName} />
              <InfoItem label="Customer Mobile" value={requisition.customerMobile} />
              <InfoItem label="Aadhaar Number" value={requisition.customerAadhaarNo || "N/A"} />
            </InfoGrid>
          </Section>

          {/* INSTALLATION ADDRESS */}
          <Section title="Installation Address">
            <p style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
              <strong>Address:</strong> {requisition.installationAddress}
            </p>
            <InfoGrid>
              <InfoItem label="State" value={requisition.state} />
              <InfoItem label="District" value={requisition.district} />
              <InfoItem label="Pincode" value={requisition.pincode} />
            </InfoGrid>
          </Section>

          {/* DEVICE INFO */}
          <Section title="Device Information">
            <InfoGrid>
              <InfoItem label="Device Type" value={requisition.deviceType} />
              <InfoItem label="Quantity" value={requisition.quantity || "N/A"} />
            </InfoGrid>
          </Section>

          {/* TIMELINE */}
          <Section title="Timeline">
            <InfoGrid>
              <InfoItem label="Requested At" value={formatDate(requisition.requestedAt)} />
              <InfoItem label="Preferred Date" value={formatDate(requisition.preferredInstallationDate)} />
              <InfoItem label="TAT Hours" value={`${requisition.tatHours || "N/A"} hours`} />
              <InfoItem
                label="Finish Time"
                value={formatDate(requisition.installationFinishTimeAssigned)}
              />
            </InfoGrid>
          </Section>

          {/* TIMESTAMPS */}
          <Section title="Record Information">
            <InfoGrid>
              <InfoItem label="Created At" value={formatDate(requisition.createdAt)} />
              <InfoItem label="Updated At" value={formatDate(requisition.updatedAt)} />
            </InfoGrid>
          </Section>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.625rem 1.5rem",
              backgroundColor: "#F3F4F6",
              color: "#374151",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================
   MODAL HELPER COMPONENTS
   ===================== */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", fontWeight: "600" }}>{title}</h4>
      {children}
    </div>
  );
}

function InfoGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}

function InfoItem({ label, value, bold }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "0.75rem",
          fontWeight: "500",
          color: "#6B7280",
          marginBottom: "0.25rem",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <p
        style={{
          margin: 0,
          fontSize: "0.875rem",
          color: "#111827",
          fontWeight: bold ? "600" : "400",
        }}
      >
        {value}
      </p>
    </div>
  );
}
