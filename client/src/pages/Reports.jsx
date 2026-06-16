import { useState, useEffect } from 'react';
import api from '../services/api';

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => getDefaultDateRange().from);
  const [dateTo, setDateTo] = useState(() => getDefaultDateRange().to);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/reports', { params: { from: dateFrom, to: dateTo } })
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePrint = () => { window.print(); };

  const monthName = (m) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const d = new Date(m + '-01');
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3 no-print">
        <h5 className="page-title mb-0">التقارير</h5>
        <button className="btn btn-outline-secondary" onClick={handlePrint}>
          <i className="bi bi-printer me-1"></i> طباعة التقرير
        </button>
      </div>

      <div className="card mb-4 no-print">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">من تاريخ</label>
              <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">إلى تاريخ</label>
              <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="col-md-4">
              <button className="btn btn-primary w-100" onClick={load} disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-funnel me-1"></i>}
                تصفية
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
        </div>
      )}

      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card stat-card bg-primary bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div className="icon bg-primary text-white"><i className="bi bi-journal"></i></div>
                    <div>
                      <h5 className="mb-0">{data.summary?.bookings || 0}</h5>
                      <small className="text-secondary">إجمالي الحجوزات</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card stat-card bg-success bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div className="icon bg-success text-white"><i className="bi bi-arrow-up-circle"></i></div>
                    <div>
                      <h5 className="mb-0">{data.summary?.revenue?.toLocaleString() || 0}</h5>
                      <small className="text-secondary">الإيرادات</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card stat-card bg-danger bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div className="icon bg-danger text-white"><i className="bi bi-arrow-down-circle"></i></div>
                    <div>
                      <h5 className="mb-0">{data.summary?.expenses?.toLocaleString() || 0}</h5>
                      <small className="text-secondary">المصاريف</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card stat-card bg-warning bg-opacity-10">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div className="icon bg-warning text-white"><i className="bi bi-cash"></i></div>
                    <div>
                      <h5 className="mb-0">{data.summary?.profit?.toLocaleString() || 0}</h5>
                      <small className="text-secondary">الأرباح</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-lg-8">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title mb-3"><i className="bi bi-calendar-month me-2"></i> الملخص الشهري</h6>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>الشهر</th>
                          <th>الحجوزات</th>
                          <th>الإيرادات</th>
                          <th>المصاريف</th>
                          <th>الأرباح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.monthly?.map((m, i) => (
                          <tr key={i}>
                            <td className="fw-semibold">{monthName(m.month)}</td>
                            <td>{m.bookings}</td>
                            <td className="text-success">{m.revenue?.toLocaleString()}</td>
                            <td className="text-danger">{m.expenses?.toLocaleString()}</td>
                            <td className={m.profit >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>{m.profit?.toLocaleString()}</td>
                          </tr>
                        ))}
                        {(!data.monthly || data.monthly.length === 0) && (
                          <tr><td colSpan="5" className="text-center text-muted py-3">لا توجد بيانات</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card h-100">
                <div className="card-body">
                  <h6 className="card-title mb-3"><i className="bi bi-people me-2"></i> أفضل العملاء</h6>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>العميل</th>
                          <th>الحجوزات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topCustomers?.map((c, i) => (
                          <tr key={i}>
                            <td>{c.full_name}</td>
                            <td><span className="badge bg-primary">{c.count}</span></td>
                          </tr>
                        ))}
                        {(!data.topCustomers || data.topCustomers.length === 0) && (
                          <tr><td colSpan="2" className="text-center text-muted py-3">لا توجد بيانات</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title mb-3"><i className="bi bi-geo-alt me-2"></i> أفضل الوجهات</h6>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>الوجهة</th>
                      <th>عدد الحجوزات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topDestinations?.map((d, i) => (
                      <tr key={i}>
                        <td className="fw-semibold">{d.destination}</td>
                        <td><span className="badge bg-info">{d.count}</span></td>
                      </tr>
                    ))}
                    {(!data.topDestinations || data.topDestinations.length === 0) && (
                      <tr><td colSpan="2" className="text-center text-muted py-3">لا توجد بيانات</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
