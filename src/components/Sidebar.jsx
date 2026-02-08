import { NavLink } from "react-router-dom";
import {
  Home,
  LogOut,
  Building2,
  MapPin,
  List,
  Tags,
  AlertCircle,
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ isOpen, isMobile, closeSidebar }) {
  const user = {
    name: "Lisa Roy",
    role: "Designer",
  };

  const handleNavClick = () => {
    if (isMobile) closeSidebar();
  };

  return (
    <aside
      className={`sidebar ${isOpen ? "open" : "collapsed"} ${
        isMobile ? "mobile" : ""
      }`}
    >
      <div className="brand">
        <span className="brand-text">
          {isOpen ? "Shriram Dashboard" : "SD"}
        </span>
      </div>

      <nav className="nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={handleNavClick}
        >
          <span className="nav-icon"><Home size={20} /></span>
          {isOpen && <span className="nav-label">Dashboard</span>}
        </NavLink>

        <NavLink
          to="/lender-branches"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={handleNavClick}
        >
          <span className="nav-icon"><Building2 size={20} /></span>
          {isOpen && <span className="nav-label">Lender Branch</span>}
        </NavLink>


        {/* Vehicle List */}
        <NavLink
          to="/vehicles"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={handleNavClick}
        >
          <span className="nav-icon">
            <MapPin size={20} strokeWidth={1.8} />
          </span>
          {isOpen && <span className="nav-label">Vehicle List</span>}
        </NavLink>
        <NavLink
          to="/vehicles-alerts"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={handleNavClick}
        >
          <span className="nav-icon">
            <AlertCircle size={20} strokeWidth={1.8} />
          </span>
          {isOpen && <span className="nav-label">Vehicle Alerts</span>}
        </NavLink>

        <NavLink
          to="/support-tickets"
          className={({ isActive }) =>
            `nav-item ${isActive ? "active" : ""}`
          }
          onClick={handleNavClick}
        >
          <span className="nav-icon">
            <Tags size={20} strokeWidth={1.8} />
          </span>
          {isOpen && <span className="nav-label">
            Support Tickets
            </span>}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="profile-avatar">
            {user.name.charAt(0)}
          </div>

          {isOpen && (
            <div className="user-text">
              <strong>{user.name}</strong>
              <p>{user.role}</p>
            </div>
          )}
        </div>

        {isOpen && (
          <button className="signout-btn">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
