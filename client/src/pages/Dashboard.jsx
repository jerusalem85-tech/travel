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
        <div className="col-6 col-md-4 col-lg-3">
          <div className="card stat-card bg-primary bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon bg-primary text-white"><i className="bi bi-journal"></i></div>
                <div><h5 className="mb-0">{stats.bookingsCount}</h5><small className="text-secondary">حجوزات</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-3">
          <div className="card stat-card bg-success bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon bg-success text-white"><i className="bi bi-people"></i></div>
                <div><h5 className="mb-0">{stats.customersCount}</h5><small className="text-secondary">عملاء</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-3">
          <div className="card stat-card bg-warning bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon bg-warning text-white"><i className="bi bi-hourglass-split"></i></div>
                <div><h5 className="mb-0">{stats.pendingBookings}</h5><small className="text-secondary">معلق</small></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-lg-3">
          <div className="card stat-card bg-info bg-opacity-10">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <div className="icon bg-info text-white"><i className="bi bi-cash-stack"></i></div>
                <div><h5 className="mb-0">{stats.monthPayments?.toLocaleString()}</h5><small className="text-secondary">مدفوعات الشهر</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">ملخص الشهر</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>المدفوعات</span><span className="text-success">{stats.monthPayments?.toLocaleString()}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>المصاريف</span><span className="text-danger">{stats.monthExpenses?.toLocaleString()}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>الأرباح</strong><strong className={stats.monthProfit >= 0 ? 'text-success' : 'text-danger'}>{stats.monthProfit?.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">حجوزات اليوم</h6>
              <div className="d-flex align-items-center gap-2">
                <span className="display-6">{stats.todayBookings}</span>
                <small className="text-secondary">حجز جديد اليوم</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">آخر الحجوزات</h6>
            <Link to="/bookings" className="btn btn-sm btn-outline-primary">عرض الكل</Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead><tr><th>رقم الحجز</th><th>العميل</th><th>التاريخ</th><th>الحالة</th><th>المبلغ</th></tr></thead>
              <tbody>
                {stats.recentBookings?.map(b => (
                  <tr key={b.id}>
                    <td><Link to={`/bookings/${b.id}`} className="text-decoration-none">{b.booking_number}</Link></td>
                    <td>{b.customer_name}</td>
                    <td>{b.travel_date}</td>
                    <td><span className={`badge bg-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}`}>{b.status}</span></td>
                    <td>{b.total_amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
