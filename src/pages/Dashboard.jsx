import { useState, useMemo, useEffect } from "react";
import { getInstallationRequisitions } from "../api/installationRequisitionApi";
import { Eye, X } from "lucide-react";
import "./Dashboard.css";

export default function Dashboard() {
  const [filter, setFilter] = useState("ALL");
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [showModal, setShowModal] = useState(false);

  /* =====================
     FETCH DATA ON MOUNT
     ===================== */
  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    setLoading(true);
    setError(null);

    const result = await getInstallationRequisitions({ limit: 1000 });

    if (result.success) {
      setRequisitions(result.data);
    } else {
      setError(result.error);
      setRequisitions([]);
    }

    setLoading(false);
  };

  /* =====================
     MAP STATUS TO DISPLAY
     ===================== */
  const getDisplayStatus = (status) => {
    const statusMap = {
      NEW: "Opened",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Closed",
    };
    return statusMap[status] || status;
  };

  /* =====================
     FILTER ONLY SPECIFIC STATUSES
     ===================== */
  const allowedStatuses = ["NEW", "IN_PROGRESS", "COMPLETED"];

  const filteredRequisitions = useMemo(() => {
    // First filter only allowed statuses
    let filtered = requisitions.filter((r) => allowedStatuses.includes(r.status));

    // Then apply user filter
    if (filter === "ALL") return filtered;

    // Map display filter back to actual status
    const filterMap = {
      Opened: "NEW",
      "In Progress": "IN_PROGRESS",
      Closed: "COMPLETED",
    };

    const actualStatus = filterMap[filter];
    return filtered.filter((r) => r.status === actualStatus);
  }, [requisitions, filter]);

  /* =====================
     COUNTS (ONLY ALLOWED STATUSES)
     ===================== */
  const counts = useMemo(() => {
    const allowedRequisitions = requisitions.filter((r) =>
      allowedStatuses.includes(r.status)
    );

    return {
      total: allowedRequisitions.length,
      opened: requisitions.filter((r) => r.status === "NEW").length,
      inProgress: requisitions.filter((r) => r.status === "IN_PROGRESS").length,
      closed: requisitions.filter((r) => r.status === "COMPLETED").length,
    };
  }, [requisitions]);

  /* =====================
     STATUS BADGE STYLE
     ===================== */
  const getStatusClass = (status) => {
    const classMap = {
      NEW: "opened",
      IN_PROGRESS: "in-progress",
      COMPLETED: "closed",
    };
    return classMap[status] || "";
  };

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

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h2>All Tickets</h2>
          <p className="breadcrumb">Home • Tickets</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-grid">
        <SummaryCard title="Total" value={counts.total} color="blue" />
        <SummaryCard title="Opened" value={counts.opened} color="green" />
        <SummaryCard
          title="In Progress"
          value={counts.inProgress}
          color="orange"
        />
        <SummaryCard title="Closed" value={counts.closed} color="teal" />
      </div>

      {/* FILTERS */}
      <div className="dashboard-filters">
        {["ALL", "Opened", "In Progress", "Closed"].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          style={{
            margin: "0 1.5rem 1rem 1.5rem",
            padding: "1rem",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {/* TICKET TABLE */}
      <div className="ticket-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Requisition No</th>
              <th>Branch Id</th>
              <th>Vehicle No</th>
              <th>Customer Name</th>
              <th>Customer Mobile</th>
              <th>Device Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              [...Array(5)].map((_, index) => (
                <tr key={index}>
                  {[...Array(9)].map((_, colIndex) => (
                    <td key={colIndex}>
                      <div className="skeleton-line" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredRequisitions.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "2rem" }}>
                  No tickets found
                </td>
              </tr>
            ) : (
              filteredRequisitions.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>
                    <strong>{req.requisitionNo}</strong>
                  </td>
                  <td>{req.branchId || "N/A"}</td>
                  <td>{req.vehicleNo}</td>
                  <td>{req.customerName}</td>
                  <td>{req.customerMobile}</td>
                  <td>{req.deviceType}</td>
                  <td>
                    <span className={`status-pill ${getStatusClass(req.status)}`}>
                      {getDisplayStatus(req.status)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => handleViewDetails(req)}
                      title="View Details"
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

      {/* VIEW MODAL */}
      {showModal && selectedRequisition && (
        <TicketModal requisition={selectedRequisition} onClose={handleCloseModal} />
      )}
    </div>
  );
}

/* =====================
   SUMMARY CARD
   ===================== */
function SummaryCard({ title, value, color }) {
  return (
    <div className={`summary-card ${color}`}>
      <h4>{title}</h4>
      <p>{value} Tickets</p>
    </div>
  );
}

/* =====================
   TICKET MODAL
   ===================== */
function TicketModal({ requisition, onClose }) {
  const formatDate = (isoDateString) => {
    if (!isoDateString) return "N/A";
    try {
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) return "N/A";
      
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getDisplayStatus = (status) => {
    const statusMap = {
      NEW: "Opened",
      IN_PROGRESS: "In Progress",
      COMPLETED: "Closed",
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      NEW: "opened",
      IN_PROGRESS: "in-progress",
      COMPLETED: "closed",
    };
    return classMap[status] || "";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Ticket Details</h2>
            <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
              {requisition.requisitionNo}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="modal-body">
          {/* STATUS BADGE */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span
              className={`status-pill ${getStatusClass(requisition.status)}`}
              style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            >
              {getDisplayStatus(requisition.status)}
            </span>
          </div>

          {/* BASIC INFO */}
          <div className="modal-section">
            <h4>Basic Information</h4>
            <div className="info-grid">
              <div>
                <label>ID</label>
                <p>{requisition.id}</p>
              </div>
              <div>
                <label>Requisition Number</label>
                <p><strong>{requisition.requisitionNo}</strong></p>
              </div>
              <div>
                <label>Branch ID</label>
                <p>{requisition.branchId || "N/A"}</p>
              </div>
              <div>
                <label>Priority</label>
                <p>{requisition.priority || "NORMAL"}</p>
              </div>
            </div>
          </div>

          {/* VEHICLE & CUSTOMER INFO */}
          <div className="modal-section">
            <h4>Vehicle & Customer Information</h4>
            <div className="info-grid">
              <div>
                <label>Vehicle Number</label>
                <p>{requisition.vehicleNo}</p>
              </div>
              <div>
                <label>Customer Name</label>
                <p>{requisition.customerName}</p>
              </div>
              <div>
                <label>Customer Mobile</label>
                <p>{requisition.customerMobile}</p>
              </div>
              <div>
                <label>Aadhaar Number</label>
                <p>{requisition.customerAadhaarNo || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* INSTALLATION ADDRESS */}
          <div className="modal-section">
            <h4>Installation Address</h4>
            <p style={{ marginBottom: "1rem" }}>
              <strong>Address:</strong> {requisition.installationAddress}
            </p>
            <div className="info-grid">
              <div>
                <label>State</label>
                <p>{requisition.state}</p>
              </div>
              <div>
                <label>District</label>
                <p>{requisition.district}</p>
              </div>
              <div>
                <label>Pincode</label>
                <p>{requisition.pincode}</p>
              </div>
            </div>
            {requisition.latitude && requisition.longitude && (
              <p style={{ marginTop: "0.5rem" }}>
                <strong>Coordinates:</strong> {requisition.latitude}, {requisition.longitude}
              </p>
            )}
          </div>

          {/* DEVICE INFO */}
          <div className="modal-section">
            <h4>Device Information</h4>
            <div className="info-grid">
              <div>
                <label>Device Type</label>
                <p>{requisition.deviceType}</p>
              </div>
              <div>
                <label>Quantity</label>
                <p>{requisition.quantity || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="modal-section">
            <h4>Timeline</h4>
            <div className="info-grid">
              <div>
                <label>Requested At</label>
                <p>{formatDate(requisition.requestedAt)}</p>
              </div>
              <div>
                <label>Preferred Installation Date</label>
                <p>{formatDate(requisition.preferredInstallationDate)}</p>
              </div>
              <div>
                <label>TAT Hours</label>
                <p>{requisition.tatHours || "N/A"} hours</p>
              </div>
              <div>
                <label>Installation Finish Time</label>
                <p>{formatDate(requisition.installationFinishTimeAssigned)}</p>
              </div>
            </div>
            {requisition.completedAt && (
              <div style={{ marginTop: "1rem" }}>
                <label>Completed At</label>
                <p>{formatDate(requisition.completedAt)}</p>
              </div>
            )}
          </div>

          {/* AGGREGATOR INFO */}
          {requisition.assignedAggregatorId && (
            <div className="modal-section">
              <h4>Assigned Aggregator</h4>
              <p>Aggregator ID: {requisition.assignedAggregatorId}</p>
            </div>
          )}

          {/* REMARKS */}
          {requisition.remarks && (
            <div className="modal-section">
              <h4>Remarks</h4>
              <p style={{ padding: "0.75rem", backgroundColor: "#f9f9f9", borderRadius: "4px" }}>
                {requisition.remarks}
              </p>
            </div>
          )}

          {/* TIMESTAMPS */}
          <div className="modal-section">
            <h4>Record Information</h4>
            <div className="info-grid">
              <div>
                <label>Created At</label>
                <p>{formatDate(requisition.createdAt)}</p>
              </div>
              <div>
                <label>Updated At</label>
                <p>{formatDate(requisition.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}



// import { useState, useMemo, useEffect } from "react";
// import { getInstallationRequisitions } from "../api/installationRequisitionApi";
// import { Eye, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
// import "./Dashboard.css";

// export default function Dashboard() {
//   const [filter, setFilter] = useState("ALL");
//   const [requisitions, setRequisitions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchRequisitions();
//   }, []);

//   const fetchRequisitions = async () => {
//     setLoading(true);
//     setError(null);

//     const result = await getInstallationRequisitions({ limit: 1000 });

//     if (result.success) {
//       setRequisitions(result.data);
//     } else {
//       setError(result.error);
//       setRequisitions([]);
//     }

//     setLoading(false);
//   };

//   const getDisplayStatus = (status) => {
//     const statusMap = {
//       NEW: "Opened",
//       IN_PROGRESS: "In Progress",
//       COMPLETED: "Closed",
//     };
//     return statusMap[status] || status;
//   };

//   const allowedStatuses = ["NEW", "IN_PROGRESS", "COMPLETED"];

//   const filteredRequisitions = useMemo(() => {
//     let filtered = requisitions.filter((r) => allowedStatuses.includes(r.status));

//     if (filter === "ALL") return filtered;

//     const filterMap = {
//       Opened: "NEW",
//       "In Progress": "IN_PROGRESS",
//       Closed: "COMPLETED",
//     };

//     const actualStatus = filterMap[filter];
//     return filtered.filter((r) => r.status === actualStatus);
//   }, [requisitions, filter]);

//   const counts = useMemo(() => {
//     const allowedRequisitions = requisitions.filter((r) =>
//       allowedStatuses.includes(r.status)
//     );

//     return {
//       total: allowedRequisitions.length,
//       opened: requisitions.filter((r) => r.status === "NEW").length,
//       inProgress: requisitions.filter((r) => r.status === "IN_PROGRESS").length,
//       closed: requisitions.filter((r) => r.status === "COMPLETED").length,
//     };
//   }, [requisitions]);

//   const getStatusClass = (status) => {
//     const classMap = {
//       NEW: "status-opened",
//       IN_PROGRESS: "status-progress",
//       COMPLETED: "status-closed",
//     };
//     return classMap[status] || "";
//   };

//   const formatDate = (isoDateString) => {
//     if (!isoDateString) return "N/A";
//     try {
//       const date = new Date(isoDateString);
//       if (isNaN(date.getTime())) return "N/A";
      
//       return date.toLocaleDateString('en-IN', {
//         year: 'numeric',
//         month: 'short',
//         day: 'numeric'
//       });
//     } catch (error) {
//       return "N/A";
//     }
//   };

//   return (
//     <div className="modern-dashboard">
//       {/* HEADER */}
//       <div className="dashboard-header-modern">
//         <div className="header-content">
//           <div>
//             <h1>Installation Tickets Dashboard</h1>
//             <p className="subtitle">Monitor and manage all installation requisitions</p>
//           </div>
//           <div className="header-actions">
//             <button className="refresh-btn" onClick={fetchRequisitions}>
//               <TrendingUp size={18} />
//               Refresh Data
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* SUMMARY CARDS */}
//       <div className="stats-grid">
//         <StatCard 
//           title="Total Tickets" 
//           value={counts.total} 
//           icon={<AlertCircle />}
//           color="blue"
//           isActive={filter === "ALL"}
//           onClick={() => setFilter("ALL")}
//         />
//         <StatCard 
//           title="Opened" 
//           value={counts.opened} 
//           icon={<Clock />}
//           color="green"
//           isActive={filter === "Opened"}
//           onClick={() => setFilter("Opened")}
//         />
//         <StatCard 
//           title="In Progress" 
//           value={counts.inProgress} 
//           icon={<TrendingUp />}
//           color="orange"
//           isActive={filter === "In Progress"}
//           onClick={() => setFilter("In Progress")}
//         />
//         <StatCard 
//           title="Closed" 
//           value={counts.closed} 
//           icon={<CheckCircle />}
//           color="teal"
//           isActive={filter === "Closed"}
//           onClick={() => setFilter("Closed")}
//         />
//       </div>

//       {/* FILTERS */}
//       <div className="filter-section">
//         <div className="filter-label">Filter by Status:</div>
//         <div className="filter-buttons">
//           {["ALL", "Opened", "In Progress", "Closed"].map((s) => (
//             <button
//               key={s}
//               className={`filter-btn ${filter === s ? "active" : ""}`}
//               onClick={() => setFilter(s)}
//             >
//               {s}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* ERROR MESSAGE */}
//       {error && (
//         <div className="error-banner">
//           <AlertCircle size={20} />
//           <span>{error}</span>
//         </div>
//       )}

//       {/* TICKET TABLE */}
//       <div className="table-container-modern">
//         <div className="table-header-bar">
//           <h3>Requisition List</h3>
//           <span className="table-count">{filteredRequisitions.length} Records</span>
//         </div>

//         <div className="table-wrapper">
//           <table className="modern-table">
//             <thead>
//               <tr>
//                 <th>Requisition No</th>
//                 <th>Branch ID</th>
//                 <th>Vehicle No</th>
//                 <th>Customer Name</th>
//                 <th>Mobile</th>
//                 <th>Device Type</th>
//                 <th>Requested Date</th>
//                 <th>Priority</th>
//                 <th>Status</th>
//                 <th>Action</th>
//               </tr>
//             </thead>

//             <tbody>
//               {loading ? (
//                 [...Array(5)].map((_, index) => (
//                   <tr key={index}>
//                     {[...Array(10)].map((_, colIndex) => (
//                       <td key={colIndex}>
//                         <div className="skeleton-loader" />
//                       </td>
//                     ))}
//                   </tr>
//                 ))
//               ) : filteredRequisitions.length === 0 ? (
//                 <tr>
//                   <td colSpan="10" className="empty-state">
//                     <AlertCircle size={48} />
//                     <p>No tickets found</p>
//                   </td>
//                 </tr>
//               ) : (
//                 filteredRequisitions.map((req) => (
//                   <tr key={req.id}>
//                     <td>
//                       <div className="requisition-id">
//                         <strong>{req.requisitionNo}</strong>
//                       </div>
//                     </td>
//                     <td>{req.branchId || "N/A"}</td>
//                     <td>
//                       <span className="vehicle-badge">{req.vehicleNo}</span>
//                     </td>
//                     <td>{req.customerName}</td>
//                     <td>{req.customerMobile}</td>
//                     <td>
//                       <span className="device-type">{req.deviceType}</span>
//                     </td>
//                     <td>
//                       <span className="date-text">{formatDate(req.requestedAt)}</span>
//                     </td>
//                     <td>
//                       <span className={`priority-badge priority-${req.priority?.toLowerCase()}`}>
//                         {req.priority || "NORMAL"}
//                       </span>
//                     </td>
//                     <td>
//                       <span className={`status-badge ${getStatusClass(req.status)}`}>
//                         {getDisplayStatus(req.status)}
//                       </span>
//                     </td>
//                     <td>
//                       <button className="action-btn" title="View Details">
//                         <Eye size={16} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatCard({ title, value, icon, color, isActive, onClick }) {
//   return (
//     <div 
//       className={`stat-card stat-${color} ${isActive ? 'active' : ''}`}
//       onClick={onClick}
//     >
//       <div className="stat-icon">{icon}</div>
//       <div className="stat-content">
//         <h3>{title}</h3>
//         <p className="stat-value">{value}</p>
//       </div>
//       <div className="stat-trend">
//         <TrendingUp size={16} />
//       </div>
//     </div>
//   );
// }
