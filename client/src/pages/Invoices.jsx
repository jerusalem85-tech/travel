import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Invoices() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/invoices', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'تأكيد الحذف', text: 'سيتم حذف الفاتورة والمدفوعات المرتبطة', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/invoices/${id}`).then(() => load());
    });
  };

  const statusBadge = (status) => {
    const colors = { paid: 'success', unpaid: 'danger', partial: 'warning' };
    const labels = { paid: 'مدفوع', unpaid: 'غير مدفوع', partial: 'جزئي' };
    return <span className={`badge bg-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">الفواتير</h5>
        <Link to="/invoices/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> فاتورة جديدة</Link>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="بحث برقم الفاتورة أو اسم العميل..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>المبلغ</th><th>المدفوع</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(i => (
                <tr key={i.id}>
                  <td><Link to={`/invoices/${i.id}`} className="text-decoration-none">{i.invoice_number}</Link></td>
                  <td>{i.customer_name}</td>
                  <td>{i.total_amount?.toLocaleString()}</td>
                  <td>{i.paid_amount?.toLocaleString()}</td>
                  <td>{statusBadge(i.status)}</td>
                  <td>{i.created_at?.substring(0, 10)}</td>
                  <td>
                    <Link to={`/invoices/${i.id}`} className="btn btn-sm btn-outline-primary me-1"><i className="bi bi-eye"></i></Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(i.id)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {data.total > 20 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            {Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (
              <li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>{p}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
