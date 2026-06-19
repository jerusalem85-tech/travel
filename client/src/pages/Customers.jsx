import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { exportCSV } from '../hooks/useExport';

export default function Customers() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/customers', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'Confirm Deletion', text: 'The customer and all their bookings will be deleted', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel' }).then(r => {
      if (r.isConfirmed) api.delete(`/customers/${id}`).then(() => load());
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Customers</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => exportCSV(data.rows, 'customers.csv', ['full_name','phone','email','nationality','bookings_count'])}>
            <i className="bi bi-download"></i> Export CSV
          </button>
          <Link to="/customers/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> New Customer</Link>
        </div>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Nationality</th><th>Bookings</th><th></th></tr></thead>
            <tbody>
              {data.rows.map(c => (
                <tr key={c.id}>
                  <td><Link to={`/customers/${c.id}`} className="text-decoration-none">{c.full_name}</Link></td>
                  <td>{c.phone || '-'}</td>
                  <td>{c.email || '-'}</td>
                  <td>{c.nationality || '-'}</td>
                  <td><span className="badge bg-secondary">{c.bookings_count || 0}</span></td>
                  <td>
                    <Link to={`/customers/${c.id}`} className="btn btn-sm btn-outline-primary me-1"><i className="bi bi-eye"></i></Link>
                    <Link to={`/customers/${c.id}/edit`} className="btn btn-sm btn-outline-warning me-1"><i className="bi bi-pencil"></i></Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)}><i className="bi bi-trash"></i></button>
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
