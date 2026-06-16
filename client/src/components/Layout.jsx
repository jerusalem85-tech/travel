import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    document.getElementById('sidebar').classList.toggle('show');
  };

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark d-lg-none px-3 fixed-top" style={{ zIndex: 1020 }}>
        <button className="navbar-toggler border-0" onClick={toggleSidebar}>
          <i className="bi bi-list"></i>
        </button>
        <span className="navbar-brand mb-0 h6">نظام السفر</span>
      </nav>

      <div className="sidebar" id="sidebar">
        <div className="p-3 border-bottom border-secondary">
          <h6 className="mb-0">{user?.full_name}</h6>
          <small className="text-secondary">{user?.email}</small>
        </div>
        <nav className="mt-2">
          <NavLink to="/" end className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-speedometer2"></i> لوحة التحكم
          </NavLink>
          <NavLink to="/bookings" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-journal"></i> الحجوزات
          </NavLink>
          <NavLink to="/customers" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-people"></i> العملاء
          </NavLink>
          <NavLink to="/suppliers" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-truck"></i> الموردين
          </NavLink>
          <NavLink to="/invoices" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-receipt"></i> الفواتير
          </NavLink>
          <NavLink to="/payments" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-cash"></i> المدفوعات
          </NavLink>
          <NavLink to="/expenses" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-cart"></i> المصاريف
          </NavLink>
          <NavLink to="/settings" className="nav-link" onClick={() => toggleSidebar()}>
            <i className="bi bi-gear"></i> الإعدادات
          </NavLink>
          <hr className="text-secondary mx-3" />
          <button className="nav-link w-100 text-end border-0 bg-transparent" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i> تسجيل خروج
          </button>
        </nav>
      </div>

      <div className="main-content p-3 p-lg-4" style={{ paddingTop: '4rem' }}>
        <Outlet />
      </div>
    </div>
  );
}
