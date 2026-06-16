import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Suppliers() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/suppliers', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'تأكيد الحذف', text: 'هل أنت متأكد؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/suppliers/${id}`).then(() => load()).catch(e => Swal.fire('خطأ', e.response?.data?.error || 'لا يمكن حذف المورد', 'error'));
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">الموردين</h5>
        <Link to="/suppliers/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> مورد جديد</Link>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>#</th><th>الاسم</th><th>جهة الاتصال</th><th>الهاتف</th><th>نوع الخدمة</th><th>خدمات</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(s => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td><Link to={`/suppliers/${s.id}`} className="text-decoration-none">{s.name}</Link></td>
                  <td>{s.contact_person || '-'}</td>
                  <td>{s.phone || '-'}</td>
                  <td>{s.service_type || '-'}</td>
                  <td><span className="badge bg-info">{s.service_count}</span></td>
                  <td>
                    <Link to={`/suppliers/${s.id}`} className="btn btn-sm btn-outline-primary me-1"><i className="bi bi-eye"></i></Link>
                    <Link to={`/suppliers/${s.id}/edit`} className="btn btn-sm btn-outline-warning me-1"><i className="bi bi-pencil"></i></Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}><i className="bi bi-trash"></i></button>
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
