import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ bookings: [], customers: [], suppliers: [] });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults({ bookings: [], customers: [], suppliers: [] }); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const [b, c, s] = await Promise.all([
          api.get(`/bookings?search=${query}&limit=5`),
          api.get(`/customers?search=${query}&limit=5`),
          api.get(`/suppliers?search=${query}&limit=5`),
        ]);
        setResults({
          bookings: b.data.rows || [],
          customers: c.data.rows || [],
          suppliers: s.data.rows || [],
        });
      } catch {} finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const total = results.bookings.length + results.customers.length + results.suppliers.length;

  return (
    <div>
      <h5 className="page-title mb-3">Global Search</h5>
      <div className="card mb-3">
        <div className="card-body">
          <div className="input-group input-group-lg">
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search bookings, customers, suppliers..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          </div>
          {query.length > 1 && <small className="text-muted mt-1 d-block">{total} results {searching && <span className="spinner-border spinner-border-sm ms-1"></span>}</small>}
        </div>
      </div>

      {results.bookings.length > 0 && (
        <div className="card mb-3"><div className="card-body">
          <h6 className="text-primary mb-2"><i className="bi bi-journal-bookmark me-2"></i>Bookings ({results.bookings.length})</h6>
          {results.bookings.map(b => (
            <Link key={b.id} to={`/bookings/${b.id}`} className="d-flex justify-content-between text-decoration-none border-bottom py-2">
              <span><strong>{b.booking_number}</strong> <span className="text-muted">{b.customer_name}</span></span>
              <span className={`badge bg-${b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'warning'}`}>{b.status}</span>
            </Link>
          ))}
        </div></div>
      )}

      {results.customers.length > 0 && (
        <div className="card mb-3"><div className="card-body">
          <h6 className="text-success mb-2"><i className="bi bi-people me-2"></i>Customers ({results.customers.length})</h6>
          {results.customers.map(c => (
            <Link key={c.id} to={`/customers/${c.id}`} className="d-flex justify-content-between text-decoration-none border-bottom py-2">
              <span><strong>{c.full_name}</strong></span>
              <span className="text-muted small">{c.phone || c.email || ''}</span>
            </Link>
          ))}
        </div></div>
      )}

      {results.suppliers.length > 0 && (
        <div className="card mb-3"><div className="card-body">
          <h6 className="text-warning mb-2"><i className="bi bi-building me-2"></i>Suppliers ({results.suppliers.length})</h6>
          {results.suppliers.map(s => (
            <Link key={s.id} to={`/suppliers/${s.id}`} className="d-flex justify-content-between text-decoration-none border-bottom py-2">
              <span><strong>{s.name}</strong> <span className="text-muted">{s.type || ''}</span></span>
              <span className="text-muted small">{s.phone || ''}</span>
            </Link>
          ))}
        </div></div>
      )}

      {query.length > 1 && total === 0 && !searching && (
        <div className="text-center py-5 text-muted"><i className="bi bi-search display-4 d-block mb-3"></i>No results found</div>
      )}
    </div>
  );
}
