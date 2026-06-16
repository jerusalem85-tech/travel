import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');
  const limit = 10;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      if (entityType) params.append('entity_type', entityType);
      const res = await api.get(`/activity-log?${params.toString()}`);
      setLogs(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load activity log', err);
    } finally {
      setLoading(false);
    }
  }, [page, entityType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action) => {
    const map = {
      created: 'bg-success',
      updated: 'bg-warning text-dark',
      deleted: 'bg-danger'
    };
    const labels = {
      created: 'إنشاء',
      updated: 'تحديث',
      deleted: 'حذف'
    };
    return <span className={`badge ${map[action] || 'bg-secondary'}`}>{labels[action] || action}</span>;
  };

  const filteredLogs = search
    ? logs.filter((l) => (l.details || '').toLowerCase().includes(search.toLowerCase()))
    : logs;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-clock-history me-2"></i>
          سجل النشاطات
        </h4>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">نوع الكيان</label>
              <select className="form-select" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
                <option value="">الكل</option>
                <option value="booking">حجز</option>
                <option value="customer">عميل</option>
                <option value="supplier">مورد</option>
                <option value="invoice">فاتورة</option>
                <option value="payment">دفعة</option>
                <option value="expense">مصروف</option>
                <option value="contract">عقد</option>
                <option value="commission">عمولة</option>
                <option value="currency">عملة</option>
                <option value="communication">اتصال</option>
                <option value="user">مستخدم</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">بحث في التفاصيل</label>
              <input
                type="text"
                className="form-control"
                placeholder="بحث..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setEntityType(''); setSearch(''); setPage(1); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد نشاطات
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>المستخدم</th>
                      <th>الإجراء</th>
                      <th>نوع الكيان</th>
                      <th>رقم الكيان</th>
                      <th>التفاصيل</th>
                      <th>التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td className="fw-bold">{log.user_name}</td>
                        <td>{getActionBadge(log.action)}</td>
                        <td><span className="badge bg-light text-dark">{log.entity_type}</span></td>
                        <td><code>{log.entity_id}</code></td>
                        <td className="text-muted small" style={{ maxWidth: 300 }}>
                          <div className="text-truncate">{log.details || '-'}</div>
                        </td>
                        <td>{new Date(log.created_at).toLocaleString('ar-SA')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <li className="page-item disabled"><span className="page-link">...</span></li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        </React.Fragment>
                      ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
