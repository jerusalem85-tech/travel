import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SimpleBarChart, { PieChart } from '../components/Charts';

const statIcons = {
  bookings: 'bi-journal',
  customers: 'bi-people',
  revenue: 'bi-cash-stack',
  profit: 'bi-graph-up-arrow',
  today: 'bi-calendar-check',
  pending: 'bi-hourglass-split',
  suppliers: 'bi-truck',
  hotels: 'bi-building',
  contracts: 'bi-file-earmark-text',
};

const statLabels = {
  bookingsCount: { label: 'Bookings', icon: 'bookings', color: 'primary' },
  customersCount: { label: 'Customers', icon: 'customers', color: 'success' },
  suppliersCount: { label: 'Suppliers', icon: 'suppliers', color: 'info' },
  hotelsCount: { label: 'Hotels', icon: 'hotels', color: 'warning' },
  contractsCount: { label: 'Contracts', icon: 'contracts', color: 'secondary' },
  todayBookings: { label: "Today's Bookings", icon: 'today', color: 'info' },
  pendingBookings: { label: 'Pending', icon: 'pending', color: 'danger' },
};

function StatCard({ value, label, icon, color, prefix }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined || value === null) return;
    const target = Number(value);
    if (target === 0) { setDisplay(0); return; }
    const duration = 800;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="col-6 col-md-4 col-lg-3 col-xl">
      <div className="card stat-card h-100" style={{ background: `var(--bg-card)`, border: 'none' }}>
        <div className="card-body d-flex flex-column gap-2">
          <div className="d-flex align-items-center justify-content-between">
            <div className={`icon bg-${color} text-white`}>
              <i className={`bi ${statIcons[icon] || 'bi-circle'}`}></i>
            </div>
            <small className="badge" style={{ background: `var(--${color})`, color: '#fff', opacity: 0.15, fontSize: '0.6rem', padding: '4px 8px' }}>{label}</small>
          </div>
          <h3 className="fw-bold mb-0" style={{ letterSpacing: '-1px' }}>
            {prefix}{typeof display === 'number' ? display.toLocaleString() : display}
          </h3>
          <div className="label">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [monthlyBookings, setMonthlyBookings] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    api.get('/stats').then(res => setStats(res.data));
    api.get('/stats/overview').then(res => setOverview(res.data));
    api.get('/stats/top-customers').then(res => setTopCustomers(res.data));
    api.get('/stats/monthly-bookings').then(res => setMonthlyBookings(res.data));
    api.get('/stats/status-breakdown').then(res => setStatusBreakdown(res.data));
  }, []);

  if (!stats) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
        <p className="text-muted">Loading data...</p>
      </div>
    );
  }

  const mainStats = [
    { key: 'bookingsCount', value: stats.bookingsCount, prefix: '' },
    { key: 'customersCount', value: stats.customersCount, prefix: '' },
    { key: 'todayBookings', value: stats.todayBookings, prefix: '' },
    { key: 'pendingBookings', value: stats.pendingBookings, prefix: '' },
  ];
  const secondaryStats = [
    { key: 'suppliersCount', value: stats.suppliersCount, prefix: '' },
    { key: 'hotelsCount', value: stats.hotelsCount, prefix: '' },
    { key: 'contractsCount', value: stats.contractsCount, prefix: '' },
  ];

  const expenseRatio = stats.monthPayments > 0 ? Math.min((stats.monthExpenses / stats.monthPayments) * 100, 100) : 0;

  return (
    <div className="page-enter">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h5 className="page-title mb-1">{greeting}, {user?.full_name || 'Admin'}</h5>
          <small className="text-muted">Travel Management System Overview</small>
        </div>
        <div className="d-flex gap-2 mt-2 mt-sm-0">
          <Link to="/bookings/create" className="btn btn-primary btn-sm">
            <i className="bi bi-plus-lg"></i> New Booking
          </Link>
          <Link to="/customers/create" className="btn btn-success btn-sm">
            <i className="bi bi-plus-lg"></i> New Customer
          </Link>
          <Link to="/invoices/create" className="btn btn-warning btn-sm text-dark">
            <i className="bi bi-plus-lg"></i> New Invoice
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {mainStats.map(s => (
          <StatCard key={s.key} value={s.value} {...statLabels[s.key]} prefix={s.prefix} />
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h6 className="fw-bold mb-0"><i className="bi bi-graph-up me-2 text-primary"></i>Monthly Summary</h6>
                <span className="badge bg-primary bg-opacity-10 text-primary">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(34,197,94,0.08)' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.15)' }}>
                        <i className="bi bi-arrow-up-circle text-success"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Total Income</small>
                        <strong className="text-success">{stats.monthPayments?.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '6px', background: 'rgba(34,197,94,0.15)' }}>
                      <div className="progress-bar bg-success rounded-pill" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 rounded-3" style={{ background: 'rgba(239,68,68,0.08)' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.15)' }}>
                        <i className="bi bi-arrow-down-circle text-danger"></i>
                      </div>
                      <div>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Total Expenses</small>
                        <strong className="text-danger">{stats.monthExpenses?.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '6px', background: 'rgba(239,68,68,0.15)' }}>
                      <div className="progress-bar bg-danger rounded-pill" style={{ width: `${expenseRatio}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <hr className="my-3" />
              <div className="d-flex align-items-center justify-content-between p-3 rounded-3" style={{ background: stats.monthProfit >= 0 ? 'rgba(99,102,241,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center justify-content-center rounded-2" style={{ width: 40, height: 40, background: stats.monthProfit >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)' }}>
                    <i className={`bi ${stats.monthProfit >= 0 ? 'bi-cash-coin text-primary' : 'bi-exclamation-triangle text-danger'}`}></i>
                  </div>
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Net Profit</small>
                    <strong className={stats.monthProfit >= 0 ? 'text-primary' : 'text-danger'} style={{ fontSize: '1.1rem' }}>
                      {stats.monthProfit?.toLocaleString()}
                    </strong>
                  </div>
                </div>
                <span className={`badge ${stats.monthProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'} rounded-pill`}>
                  <i className={`bi ${stats.monthProfit >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'} me-1`}></i>
                  {stats.monthProfit >= 0 ? 'Profit' : 'Loss'}
                </span>
              </div>

              {overview && (
                <>
                  <hr className="my-3" />
                  <div className="row g-2">
                    <div className="col-4">
                      <div className="text-center p-2 rounded-2" style={{ background: 'rgba(99,102,241,0.06)' }}>
                        <div className="fw-bold text-primary">{overview.totalBookings}</div>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Total Bookings</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-2" style={{ background: 'rgba(34,197,94,0.06)' }}>
                        <div className="fw-bold text-success">{overview.totalCustomers}</div>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Total Customers</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="text-center p-2 rounded-2" style={{ background: 'rgba(245,158,11,0.06)' }}>
                        <div className="fw-bold text-warning">{overview.pendingTasks}</div>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>Pending Tasks</small>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h6 className="fw-bold mb-3"><i className="bi bi-trophy me-2 text-warning"></i>Top Customers</h6>
              {topCustomers.length > 0 ? (
                <div className="d-flex flex-column gap-2 flex-grow-1">
                  {topCustomers.map((c, i) => (
                    <div key={c.id} className="d-flex align-items-center gap-2 p-2 rounded-2" style={{ background: i % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                      <div className={`d-flex align-items-center justify-content-center rounded-2 fw-bold text-white`} style={{ width: 32, height: 32, fontSize: '0.75rem', background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : i === 1 ? 'linear-gradient(135deg,#64748b,#94a3b8)' : i === 2 ? 'linear-gradient(135deg,#b45309,#d97706)' : 'var(--border)' }}>
                        {i + 1}
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.full_name}</div>
                        <small className="text-muted" style={{ fontSize: '0.65rem' }}>{c.booking_count} bookings · {Number(c.total_paid).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted">
                  <i className="bi bi-people" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                  <small>No customers yet</small>
                </div>
              )}
              <Link to="/customers" className="btn btn-sm btn-outline-primary w-100 mt-2">
                <i className="bi bi-eye me-1"></i> View All
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {secondaryStats.map(s => (
          <StatCard key={s.key} value={s.value} {...statLabels[s.key]} prefix={s.prefix} />
        ))}
      </div>

      {(monthlyBookings.length > 0 || statusBreakdown.length > 0) && (
        <div className="row g-3 mb-4">
          {monthlyBookings.length > 0 && (
            <div className="col-md-7">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart me-2 text-primary"></i>Monthly Bookings</h6>
                  <SimpleBarChart data={monthlyBookings.map(b => ({ label: b.month?.substring(5), value: b.count }))} />
                </div>
              </div>
            </div>
          )}
          {statusBreakdown.length > 0 && (
            <div className="col-md-5">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="fw-bold mb-3"><i className="bi bi-pie-chart me-2 text-primary"></i>Booking Status</h6>
                  <PieChart data={statusBreakdown.map(s => ({
                    label: s.status === 'confirmed' ? 'Confirmed' : s.status === 'pending' ? 'Pending' : s.status === 'cancelled' ? 'Cancelled' : s.status === 'completed' ? 'Completed' : s.status,
                    value: s.count,
                    color: s.status === 'confirmed' ? '#22c55e' : s.status === 'pending' ? '#f59e0b' : s.status === 'cancelled' ? '#ef4444' : s.status === 'completed' ? '#64748b' : '#6366f1'
                  }))} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h6 className="fw-bold mb-0"><i className="bi bi-clock-history me-2 text-primary"></i>Recent Bookings</h6>
            <Link to="/bookings" className="btn btn-sm btn-outline-primary">View All <i className="bi bi-arrow-right me-1"></i></Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentBookings?.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/bookings/${b.id}`} className="text-decoration-none fw-semibold">{b.booking_number}</Link></td>
                    <td>{b.customer_name}</td>
                    <td>{b.travel_date}</td>
                    <td>{b.from_destination} → {b.to_destination}</td>
                    <td>
                      <span className={`badge bg-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : b.status === 'completed' ? 'secondary' : 'warning'}`}>
                        {b.status === 'confirmed' ? 'Confirmed' : b.status === 'cancelled' ? 'Cancelled' : b.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="fw-semibold">{b.total_amount?.toLocaleString()}</td>
                  </tr>
                ))}
                {(!stats.recentBookings || stats.recentBookings.length === 0) && (
                  <tr><td colSpan="6" className="text-center text-muted py-4">No recent bookings</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
