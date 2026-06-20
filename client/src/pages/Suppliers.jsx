import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const typeConfig = {
  airline: { label: 'Airline', icon: 'bi-airplane', color: 'primary' },
  hotel: { label: 'Hotel', icon: 'bi-building', color: 'success' },
  visa_provider: { label: 'Visa', icon: 'bi-file-earmark-text', color: 'info' },
  insurance_provider: { label: 'Insurance', icon: 'bi-shield-check', color: 'warning' },
  transfer_provider: { label: 'Transport', icon: 'bi-car-front', color: 'danger' },
  tour_provider: { label: 'Tour', icon: 'bi-map', color: 'secondary' },
};

const allTypes = [{ value: '', label: 'All' }, ...Object.entries(typeConfig).map(([k, v]) => ({ value: k, label: v.label }))];

export default function Suppliers() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    api.get('/suppliers', { params }).then(res => setData(res.data));
  };
  useEffect(() => { load(); }, [page, typeFilter]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'Confirm Delete', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(r => {
      if (r.isConfirmed) api.delete(`/suppliers/${id}`).then(() => load());
    });
  };

  const renderTypes = (types) => {
    if (!types) return <span className="text-muted">-</span>;
    return types.split(',').map(t => {
      const cfg = typeConfig[t.trim()];
      return cfg ? <span key={t} className={`badge bg-${cfg.color} me-1 small`}><i className={`bi ${cfg.icon} me-1`}></i>{cfg.label}</span> : <span key={t} className="badge bg-dark me-1 small">{t}</span>;
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Suppliers</h5>
        <Link to="/suppliers/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> New Supplier</Link>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-8">
              <div className="search-box"><i className="bi bi-search"></i><input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
            <div className="col-md-4 d-flex gap-2 flex-wrap">
              {allTypes.map(t => (
                <button key={t.value} className={`btn btn-sm ${typeFilter === t.value ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTypeFilter(t.value)}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card"><div className="table-responsive"><table className="table table-hover mb-0">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Types</th><th>Services</th><th></th></tr></thead>
        <tbody>
          {data.rows.map(s => (
            <tr key={s.id}><td><Link to={`/suppliers/${s.id}`} className="text-decoration-none fw-semibold">{s.name}</Link></td><td>{s.phone || '-'}</td><td className="small">{s.email || '-'}</td><td>{renderTypes(s.type)}</td><td><span className="badge bg-secondary">{s.services_count || 0}</span></td>
              <td><Link to={`/suppliers/${s.id}`} className="btn btn-sm btn-outline-primary me-1"><i className="bi bi-eye"></i></Link><Link to={`/suppliers/${s.id}/edit`} className="btn btn-sm btn-outline-warning me-1"><i className="bi bi-pencil"></i></Link><button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}><i className="bi bi-trash"></i></button></td>
            </tr>
          ))}
          {data.rows?.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-4">No suppliers found</td></tr>}
        </tbody>
      </table></div></div>
      {data.total > 20 && (<nav className="mt-3"><ul className="pagination justify-content-center">{Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (<li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>))}</ul></nav>)}
    </div>
  );
}
