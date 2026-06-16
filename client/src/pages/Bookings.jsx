import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Bookings() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/bookings', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page, status]);
  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); load(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'تأكيد الحذف', text: 'هل أنت متأكد؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم، احذف', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => load());
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">الحجوزات</h5>
        <Link to="/bookings/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> حجز جديد</Link>
      </div>

      <div className="card mb-3">
        <div className="card-body d-flex gap-2 flex-wrap">
          <div className="search-box flex-grow-1">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="بحث برقم الحجز أو اسم العميل..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="pending">معلق</option>
            <option value="confirmed">مؤكد</option>
            <option value="cancelled">ملغي</option>
            <option value="completed">منتهي</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>#</th><th>رقم الحجز</th><th>العميل</th><th>الوجهة</th><th>تاريخ السفر</th><th>المبلغ</th><th>المدفوع</th><th>الحالة</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(b => (
                <tr key={b.id}>
                  <td>{b.id}</td>
                  <td><Link to={`/bookings/${b.id}`} className="text-decoration-none">{b.booking_number}</Link></td>
                  <td>{b.customer_name}</td>
                  <td>{b.from_destination} → {b.to_destination}</td>
                  <td>{b.travel_date}</td>
                  <td>{b.total_amount?.toLocaleString()}</td>
                  <td>{b.paid_amount?.toLocaleString()}</td>
                  <td><span className={`badge bg-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : b.status === 'completed' ? 'secondary' : 'warning'}`}>{b.status}</span></td>
                  <td>
                    <Link to={`/bookings/${b.id}`} className="btn btn-sm btn-outline-primary me-1"><i className="bi bi-eye"></i></Link>
                    <Link to={`/bookings/${b.id}/edit`} className="btn btn-sm btn-outline-warning me-1"><i className="bi bi-pencil"></i></Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(b.id)}><i className="bi bi-trash"></i></button>
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
