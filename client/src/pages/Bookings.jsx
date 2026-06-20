import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { exportCSV } from '../hooks/useExport';

export default function Bookings() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editValues, setEditValues] = useState({});

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    api.get('/bookings', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page, status, dateFrom, dateTo]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = (id) => {
    Swal.fire({ title: 'Confirm Deletion', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then(r => {
      if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => load());
    });
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => { if (selectAll) { setSelected([]); setSelectAll(false); } else { setSelected(data.rows.map(b => b.id)); setSelectAll(true); } };

  const bulkDelete = () => {
    if (selected.length === 0) return;
    Swal.fire({ title: `Delete ${selected.length} bookings?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete All' }).then(async r => {
      if (r.isConfirmed) { for (const id of selected) await api.delete(`/bookings/${id}`); setSelected([]); setSelectAll(false); load(); }
    });
  };

  const startEdit = (b) => { setEditRow(b.id); setEditValues({ customer_name: b.customer_name, travel_date: b.travel_date || '', status: b.status, total_amount: b.total_amount || '', notes: b.notes || '' }); };
  const cancelEdit = () => { setEditRow(null); setEditValues({}); };
  
  const saveEdit = async (id) => {
    try {
      await api.put(`/bookings/${id}`, { ...editValues, total_amount: parseFloat(editValues.total_amount) || 0 });
      setEditRow(null); load();
    } catch (e) { Swal.fire('Error', 'Failed to save', 'error'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const statusBadge = (s) => {
    const c = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
    const l = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed' };
    return <span className={`badge bg-${c[s] || 'secondary'}`}>{l[s] || s}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Bookings</h5>
        <div className="d-flex gap-2">
          {selected.length > 0 && <button className="btn btn-danger btn-sm" onClick={bulkDelete}><i className="bi bi-trash"></i> Delete ({selected.length})</button>}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => exportCSV(data.rows, 'bookings.csv', ['booking_number','customer_name','from_destination','to_destination','travel_date','total_amount','status'])}>
            <i className="bi bi-download"></i> Export
          </button>
          <Link to="/bookings/create" className="btn btn-primary"><i className="bi bi-plus-lg"></i> New Booking</Link>
        </div>
      </div>

      <div className="card mb-3"><div className="card-body">
        <div className="row g-2">
          <div className="col-md-4"><div className="search-box"><i className="bi bi-search"></i><input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div></div>
          <div className="col-md-2"><input type="date" className="form-control" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} placeholder="From" /></div>
          <div className="col-md-2"><input type="date" className="form-control" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} placeholder="To" /></div>
          <div className="col-md-2"><button className="btn btn-outline-secondary btn-sm w-100" onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); }}>Clear</button></div>
        </div>
      </div></div>

      <div className="card"><div className="card-body border-bottom pb-2">
        <div className="d-flex gap-2 flex-wrap">
          {[{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Confirmed', value: 'confirmed' }, { label: 'Completed', value: 'completed' }, { label: 'Cancelled', value: 'cancelled' }].map(f => (
            <button key={f.value} className={`btn btn-sm ${status === f.value ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setStatus(f.value); setPage(1); }}>{f.label}</button>
          ))}
          <span className="ms-auto text-muted small align-self-center">{data.total} bookings</span>
        </div>
      </div>
      <div className="table-responsive"><table className="table table-hover mb-0">
        <thead><tr><th><input type="checkbox" checked={selectAll} onChange={toggleAll} /></th><th>Booking #</th><th>Customer</th><th>Svc</th><th>Date</th><th>Amount</th><th>Status</th><th className="text-end">Actions</th></tr></thead>
        <tbody>
          {data.rows.map(b => {
            const isEditing = editRow === b.id;
            const rc = b.status === 'confirmed' ? 'table-success' : b.status === 'cancelled' ? 'table-danger' : b.status === 'completed' ? 'table-info' : '';
            if (isEditing) return (
              <tr key={b.id} className="table-active">
                <td></td>
                <td className="fw-bold">{b.booking_number}</td>
                <td><input className="form-control form-control-sm" value={editValues.customer_name} onChange={e => setEditValues({...editValues, customer_name: e.target.value})} /></td>
                <td><span className="badge bg-secondary">{b.service_count || 0}</span></td>
                <td><input type="date" className="form-control form-control-sm" value={editValues.travel_date} onChange={e => setEditValues({...editValues, travel_date: e.target.value})} /></td>
                <td><input type="number" className="form-control form-control-sm" style={{width:100}} value={editValues.total_amount} onChange={e => setEditValues({...editValues, total_amount: e.target.value})} /></td>
                <td><select className="form-select form-select-sm" value={editValues.status} onChange={e => setEditValues({...editValues, status: e.target.value})}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td>
                <td className="text-end">
                  <button className="btn btn-sm btn-success me-1" onClick={() => saveEdit(b.id)}><i className="bi bi-check"></i></button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}><i className="bi bi-x"></i></button>
                </td>
              </tr>
            );
            return (
              <tr key={b.id} className={rc}>
                <td><input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleSelect(b.id)} /></td>
                <td><Link to={`/bookings/${b.id}`} className="text-decoration-none fw-semibold">{b.booking_number}</Link></td>
                <td>{b.customer_name}</td>
                <td><span className="badge bg-secondary">{b.service_count || 0}</span></td>
                <td>{formatDate(b.travel_date)}</td>
                <td className="fw-semibold">{(b.total_amount || 0).toLocaleString()} ILS</td>
                <td>{statusBadge(b.status)}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => startEdit(b)} title="Quick Edit"><i className="bi bi-pencil"></i></button>
                  <Link to={`/bookings/${b.id}`} className="btn btn-sm btn-outline-primary me-1" title="View"><i className="bi bi-eye"></i></Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(b.id)} title="Delete"><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div></div>

      {data.total > 20 && (<nav className="mt-3"><ul className="pagination justify-content-center">{Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (<li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>))}</ul></nav>)}
    </div>
  );
}
