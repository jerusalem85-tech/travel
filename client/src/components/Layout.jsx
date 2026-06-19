import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count)).catch(() => {});
    }, 30000);
    api.get('/notifications/unread-count').then(r => setUnreadCount(r.data.count)).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleSidebar = () => { document.getElementById('sidebar').classList.toggle('show'); document.getElementById('overlay').classList.toggle('show'); };

  return (
    <>
      <nav className="navbar navbar-dark d-lg-none fixed-top no-print" style={{ background: 'var(--bg-sidebar)', zIndex: 1060, padding: '8px 16px' }}>
        <button className="btn text-white p-0" onClick={toggleSidebar}><i className="bi bi-list fs-4"></i></button>
        <span className="navbar-brand mb-0 h6">Travel System</span>
        <button className="btn text-white p-0 position-relative" onClick={() => navigate('/notifications')}>
          <i className="bi bi-bell fs-5"></i>
          {unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize:'0.6rem'}}>{unreadCount}</span>}
        </button>
      </nav>

      <div id="overlay" className="sidebar-overlay" onClick={toggleSidebar}></div>

      <div className="sidebar" id="sidebar">
        <div className="logo">
          <h5><i className="bi bi-airplane-engines me-2"></i>Travel System</h5>
          <small>Booking & Travel Management</small>
        </div>
        <nav>
          <div className="nav-section">Main</div>
          <NavLink to="/" end className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-grid-1x2"></i> Dashboard
          </NavLink>

          <div className="nav-section">Operations</div>
          <NavLink to="/bookings" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-journal-text"></i> Bookings
          </NavLink>
          <NavLink to="/customers" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-people"></i> Customers
          </NavLink>
          <NavLink to="/suppliers" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-truck"></i> Suppliers
          </NavLink>
          <NavLink to="/services" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-gear"></i> Services
          </NavLink>
          <NavLink to="/airlines" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-airplane"></i> Airlines
          </NavLink>
          <NavLink to="/airports" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-geo-alt"></i> Airports
          </NavLink>
          <NavLink to="/flights" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-airplane-engines"></i> Flights
          </NavLink>
          <NavLink to="/quotations" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-file-earmark-text"></i> Quotations
          </NavLink>
          <NavLink to="/hotels" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-building"></i> Hotels
          </NavLink>
          <NavLink to="/packages" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-box-seam"></i> Tour Packages
          </NavLink>
          <NavLink to="/insurance" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-shield-check"></i> Insurance
          </NavLink>

          <div className="nav-section">Finance</div>
          <NavLink to="/invoices" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-receipt-cutoff"></i> Invoices
          </NavLink>
          <NavLink to="/payments" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-cash-stack"></i> Payments
          </NavLink>
          <NavLink to="/expenses" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-wallet2"></i> Expenses
          </NavLink>
          <NavLink to="/reports" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-graph-up"></i> Reports
          </NavLink>

          <div className="nav-section">Contracts & Commissions</div>
          <NavLink to="/contracts" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-file-earmark-text"></i> Contracts
          </NavLink>
          <NavLink to="/commissions" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-percent"></i> Commissions
          </NavLink>
          <NavLink to="/activity-log" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-clock-history"></i> Activity Log
          </NavLink>

          <div className="nav-section">Administration</div>
          <NavLink to="/users" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-person-gear"></i> Users
          </NavLink>
          <NavLink to="/notifications" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-bell"></i> Notifications
            {unreadCount > 0 && <span className="badge bg-danger me-auto" style={{fontSize:'0.65rem'}}>{unreadCount}</span>}
          </NavLink>
          <NavLink to="/currencies" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-currency-exchange"></i> Currencies
          </NavLink>
          <NavLink to="/communications" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-chat-dots"></i> Communications
          </NavLink>
          <NavLink to="/settings" className="nav-link" onClick={() => document.getElementById('sidebar').classList.remove('show')}>
            <i className="bi bi-gear"></i> Settings
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user?.full_name?.charAt(0) || 'U'}</div>
          <div className="user-info">
            <div className="name">{user?.full_name}</div>
            <div className="role">{user?.role === 'admin' ? 'Administrator' : 'User'}</div>
          </div>
          <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <i className={`bi bi-${theme === 'light' ? 'moon-stars' : 'sun'}`}></i>
          </button>
        </div>
      </div>

      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
}
