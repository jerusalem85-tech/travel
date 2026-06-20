import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Customers() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editRow, setEditRow] = useState(null);
  const [editValues, setEditValues] = useState({});

  const load = () => { const params = { page, limit: 20 }; if (search) params.search = search; api.get('/customers', { params }).then(res => setData(res.data)); };
  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/customers/${id}`).then(() => load()); }); };
  const startEdit = (c) => { setEditRow(c.id); setEditValues({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', notes: c.notes || '' }); };
  const cancelEdit = () => { setEditRow(null); setEditValues({}); };
  const saveEdit = async (id) => { try { await api.put(`/customers/${id}`, editValues); setEditRow(null); load(); } catch (e) { Swal.fire('Error', 'Failed', 'error'); } };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3"><h5 className="page-title mb-0">Customers</h5><Link to="/customers/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> New Customer</Link></div>
      <div className="card mb-3"><div className="card-body"><div className="search-box"><i className="bi bi-search"></i><input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div></div></div>
      <div className="card"><div className="table-responsive"><table className="table table-hover mb-0">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Bookings</th><th className="text-end">Actions</th></tr></thead>
        <tbody>
          {data.rows.map(c => {
            if (editRow === c.id) return (
              <tr key={c.id} className="table-active">
                <td><input className="form-control form-control-sm" value={editValues.full_name} onChange={e => setEditValues({...editValues, full_name: e.target.value})} /></td>
                <td><input className="form-control form-control-sm" value={editValues.phone} onChange={e => setEditValues({...editValues, phone: e.target.value})} /></td>
                <td><input className="form-control form-control-sm" value={editValues.email} onChange={e => setEditValues({...editValues, email: e.target.value})} /></td>
                <td><span className="badge bg-secondary">{c.bookings_count || 0}</span></td>
                <td className="text-end"><button className="btn btn-sm btn-success me-1" onClick={() => saveEdit(c.id)}><i className="bi bi-check"></i></button><button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}><i className="bi bi-x"></i></button></td>
              </tr>
            );
            return (
              <tr key={c.id}>
                <td><Link to={`/customers/${c.id}`} className="text-decoration-none fw-semibold">{c.full_name}</Link></td>
                <td>{c.phone || '-'}</td><td className="small">{c.email || '-'}</td>
                <td><span className="badge bg-secondary">{c.bookings_count || 0}</span></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => startEdit(c)} title="Quick Edit"><i className="bi bi-pencil"></i></button>
                  <Link to={`/customers/${c.id}`} className="btn btn-sm btn-outline-primary me-1" title="View"><i className="bi bi-eye"></i></Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)} title="Delete"><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            );
          })}
          {data.rows?.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No customers</td></tr>}
        </tbody>
      </table></div></div>
      {data.total > 20 && (<nav className="mt-3"><ul className="pagination justify-content-center">{Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (<li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>))}</ul></nav>)}
    </div>
  );
}
