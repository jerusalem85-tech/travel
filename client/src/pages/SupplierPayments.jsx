import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function SupplierPayments() {
  const [data, setData] = useState({ rows: [], total: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ supplier_id: '', booking_id: '', amount: '', currency: 'USD', payment_date: new Date().toISOString().split('T')[0], notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const limit = 15;

  const load = async () => { setLoading(true); try { const r = await api.get(`/supplier-payments?page=${page}&limit=${limit}`); setData(r.data); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [page]);
  useEffect(() => { api.get('/suppliers', { params: { limit: 1000 } }).then(r => setSuppliers(r.data.rows || [])); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id || !form.amount) { Swal.fire('Required', 'Supplier and amount are required', 'warning'); return; }
    setSubmitting(true);
    try {
      await api.post('/supplier-payments', { ...form, amount: parseFloat(form.amount) });
      setShowModal(false);
      setForm({ supplier_id: '', booking_id: '', amount: '', currency: 'USD', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
      Swal.fire({ icon: 'success', title: 'Payment recorded', timer: 1500, showConfirmButton: false });
    } catch (e) { Swal.fire('Error', e.response?.data?.error || 'Failed', 'error'); } finally { setSubmitting(false); }
  };

  const handleDelete = (id) => {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/supplier-payments/${id}`).then(() => load()); });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Supplier Payments</h5>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><i className="bi bi-plus-lg"></i> Record Payment</button>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead><tr><th>Payment #</th><th>Supplier</th><th>Amount</th><th>Currency</th><th>Date</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {data.rows?.map(p => (
                <tr key={p.id}>
                  <td className="fw-semibold">{p.payment_number}</td>
                  <td>{p.supplier_name || '-'}</td>
                  <td className="fw-bold text-danger">{Number(p.amount).toLocaleString()}</td>
                  <td>{p.currency || 'USD'}</td>
                  <td>{p.payment_date || '-'}</td>
                  <td className="text-muted small">{p.notes || '-'}</td>
                  <td><button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id)}><i className="bi bi-trash"></i></button></td>
                </tr>
              ))}
              {data.rows?.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-4">No supplier payments</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {data.total > limit && (
        <nav className="mt-3"><ul className="pagination justify-content-center">
          {Array.from({ length: Math.ceil(data.total / limit) }, (_, i) => i + 1).map(p => (
            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>
          ))}
        </ul></nav>
      )}

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header"><h6 className="modal-title">Record Supplier Payment</h6><button type="button" className="btn-close" onClick={() => setShowModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">Supplier <span className="text-danger">*</span></label>
                  <select className="form-select" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name || s.supplier_name}</option>)}
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">Amount <span className="text-danger">*</span></label><input type="number" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                <div className="row g-2 mb-2">
                  <div className="col-6"><label className="form-label">Currency</label>
                    <select className="form-select" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                      <option value="ILS">ILS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="JOD">JOD</option><option value="AED">AED</option>
                    </select>
                  </div>
                  <div className="col-6"><label className="form-label">Date</label><input type="date" className="form-control" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
                </div>
                <div className="mb-2"><label className="form-label">Notes</label><input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
