import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function CallLog() {
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: '', notes: '', follow_up_date: '' });
  const [page, setPage] = useState(1);

  const load = () => api.get(`/call-logs?page=${page}&limit=20`).then(r => setLogs(r.data.rows || []));
  useEffect(() => { load(); }, [page]);
  useEffect(() => { api.get('/customers?limit=1000').then(r => setCustomers(r.data.rows || [])); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id || !form.notes) return;
    await api.post('/call-logs', form);
    setShowForm(false); setForm({ customer_id: '', notes: '', follow_up_date: '' }); load();
    Swal.fire({ icon: 'success', title: 'Logged', timer: 1000, showConfirmButton: false });
  };

  const handleDelete = (id) => {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/call-logs/${id}`).then(() => load()); });
  };

  const today = new Date().toISOString().split('T')[0];
  const followUpsToday = logs.filter(l => l.follow_up_date === today);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Call Log & Follow-ups</h5>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><i className="bi bi-plus-lg"></i> Log Call</button>
      </div>

      {followUpsToday.length > 0 && (
        <div className="card mb-3 border-warning"><div className="card-body">
          <h6 className="text-warning mb-2"><i className="bi bi-bell me-2"></i>Follow-ups Today ({followUpsToday.length})</h6>
          {followUpsToday.map(l => (
            <div key={l.id} className="d-flex justify-content-between border-bottom py-1 small">
              <span><strong>{l.customer_name}</strong></span>
              <span className="text-muted">{l.notes}</span>
              <Link to={`/customers/${l.customer_id}`} className="ms-2"><i className="bi bi-person"></i></Link>
            </div>
          ))}
        </div></div>
      )}

      <div className="card"><div className="table-responsive"><table className="table table-hover table-sm mb-0">
        <thead><tr><th>Date</th><th>Customer</th><th>Notes</th><th>Follow-up</th><th></th></tr></thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className={l.follow_up_date && l.follow_up_date <= today ? 'table-warning' : ''}>
              <td className="small">{l.created_at?.split('T')[0]}</td>
              <td><Link to={`/customers/${l.customer_id}`} className="fw-semibold text-decoration-none">{l.customer_name}</Link></td>
              <td className="small">{l.notes}</td>
              <td>{l.follow_up_date ? <span className={`badge ${l.follow_up_date <= today ? 'bg-warning text-dark' : 'bg-secondary'}`}>{l.follow_up_date}</span> : '-'}</td>
              <td><button className="btn btn-sm text-danger" onClick={() => handleDelete(l.id)}><i className="bi bi-x"></i></button></td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No call logs</td></tr>}
        </tbody>
      </table></div></div>

      {showForm && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header"><h6 className="modal-title">Log Call / Follow-up</h6><button type="button" className="btn-close" onClick={() => setShowForm(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">Customer <span className="text-danger">*</span></label>
                  <select className="form-select" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} required>
                    <option value="">Select...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">Notes <span className="text-danger">*</span></label>
                  <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What was discussed..." required></textarea>
                </div>
                <div className="mb-2"><label className="form-label">Follow-up Date</label>
                  <input type="date" className="form-control" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
