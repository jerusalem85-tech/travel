import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      params.append('page', page);
      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل الفواتير', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleDelete = (id, invoiceNumber) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف الفاتورة ${invoiceNumber}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/invoices/${id}`);
          Swal.fire('تم الحذف', 'تم حذف الفاتورة بنجاح', 'success');
          fetchInvoices();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف الفاتورة', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="badge bg-success">مدفوعة</span>;
      case 'partial':
        return <span className="badge bg-warning text-dark">جزئية</span>;
      case 'unpaid':
        return <span className="badge bg-danger">غير مدفوعة</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          الفواتير
        </h4>
        <Link to="/invoices/create" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>
          إضافة فاتورة
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="بحث برقم الفاتورة أو اسم العميل..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                >
                  <option value="">جميع الحالات</option>
                  <option value="paid">مدفوعة</option>
                  <option value="partial">جزئية</option>
                  <option value="unpaid">غير مدفوعة</option>
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-outline-primary w-100">
                  <i className="bi bi-search me-1"></i>
                  بحث
                </button>
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary w-100"
                  onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  إعادة تعيين
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد فواتير
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>رقم الفاتورة</th>
                      <th>العميل</th>
                      <th>الرحلة</th>
                      <th>المبلغ الإجمالي</th>
                      <th>المبلغ المدفوع</th>
                      <th>الحالة</th>
                      <th>التاريخ</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.id}</td>
                        <td>
                          <code>{inv.invoice_number}</code>
                        </td>
                        <td>{inv.customer_name}</td>
                        <td>{inv.booking_number || '-'}</td>
                        <td>{Number(inv.total_amount).toLocaleString()} ر.س</td>
                        <td>{Number(inv.paid_amount).toLocaleString()} ر.س</td>
                        <td>{getStatusBadge(inv.status)}</td>
                        <td>{new Date(inv.created_at).toLocaleDateString('ar-SA')}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="btn btn-outline-info"
                              title="عرض"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <button
                              className="btn btn-outline-danger"
                              title="حذف"
                              onClick={() => handleDelete(inv.id, inv.invoice_number)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPage(page - 1)}
                      >
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>
                              {p}
                            </button>
                          </li>
                        </React.Fragment>
                      ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPage(page + 1)}
                      >
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

export default Invoices;
