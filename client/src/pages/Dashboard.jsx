import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(res => setStats(res.data));
  }, []);

  if (!stats) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <h5 className="page-title mb-4">لوحة التحكم</h5>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-primary bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-primary text-white"><i className="bi bi-journal"></i></div>
                <div>
                  <h5 className="mb-0">{stats.bookingsCount}</h5>
                  <small className="text-secondary">حجوزات</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-success bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-success text-white"><i className="bi bi-people"></i></div>
                <div>
                  <h5 className="mb-0">{stats.customersCount}</h5>
                  <small className="text-secondary">عملاء</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-info bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-info text-white"><i className="bi bi-cash-stack"></i></div>
                <div>
                  <h5 className="mb-0">{stats.monthPayments?.toLocaleString()}</h5>
                  <small className="text-secondary">المدفوعات</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-warning bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-warning text-white"><i className="bi bi-graph-up-arrow"></i></div>
                <div>
                  <h5 className="mb-0">{stats.monthProfit?.toLocaleString()}</h5>
                  <small className="text-secondary">الأرباح</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-secondary bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-secondary text-white"><i className="bi bi-calendar-check"></i></div>
                <div>
                  <h5 className="mb-0">{stats.todayBookings}</h5>
                  <small className="text-secondary">حجوزات اليوم</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-2">
          <div className="card stat-card bg-danger bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2">
                <div className="icon bg-danger text-white"><i className="bi bi-hourglass-split"></i></div>
                <div>
                  <h5 className="mb-0">{stats.pendingBookings}</h5>
                  <small className="text-secondary">معلق</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-title mb-4">ملخص الشهر</h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span><i className="bi bi-arrow-up-circle text-success me-1"></i> المدفوعات</span>
                  <span className="text-success fw-bold">{stats.monthPayments?.toLocaleString()}</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-success" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span><i className="bi bi-arrow-down-circle text-danger me-1"></i> المصاريف</span>
                  <span className="text-danger fw-bold">{stats.monthExpenses?.toLocaleString()}</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div className="progress-bar bg-danger" style={{ width: stats.monthPayments ? `${Math.min((stats.monthExpenses / stats.monthPayments) * 100, 100)}%` : '0%' }}></div>
                </div>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong><i className="bi bi-cash me-1"></i> صافي الأرباح</strong>
                <strong className={stats.monthProfit >= 0 ? 'text-success' : 'text-danger'}>{stats.monthProfit?.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column justify-content-center align-items-center">
              <h6 className="card-title mb-3">حجوزات اليوم</h6>
              <div className="display-4 fw-bold text-primary mb-2">{stats.todayBookings}</div>
              <small className="text-secondary">حجز جديد اليوم</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0"><i className="bi bi-journal-text me-2"></i>آخر الحجوزات</h6>
            <Link to="/bookings" className="btn btn-sm btn-outline-primary">عرض الكل</Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>رقم الحجز</th>
                  <th>العميل</th>
                  <th>التاريخ</th>
                  <th>الوجهة</th>
                  <th>الحالة</th>
                  <th>المبلغ</th>
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
                        {b.status === 'confirmed' ? 'مؤكد' : b.status === 'cancelled' ? 'ملغي' : b.status === 'completed' ? 'منتهي' : 'معلق'}
                      </span>
                    </td>
                    <td>{b.total_amount?.toLocaleString()}</td>
                  </tr>
                ))}
                {(!stats.recentBookings || stats.recentBookings.length === 0) && (
                  <tr><td colSpan="6" className="text-center text-muted py-3">لا توجد حجوزات حديثة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
