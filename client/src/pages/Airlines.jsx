import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Airlines() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    code: '', name: '', country: '', website: '', phone: '', is_active: 1, notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/airlines', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({ code: '', name: '', country: '', website: '', phone: '', is_active: 1, notes: '' });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      code: item.code || '', name: item.name || '', country: item.country || '', website: item.website || '',
      phone: item.phone || '', is_active: item.is_active ?? 1, notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      Swal.fire('Alert', 'Code and name are required', 'warning'); return;
    }
    setSubmitting(true);
    try {
      const payload = { ...formData, is_active: Number(formData.is_active) };
      if (editItem) {
        await api.put(`/airlines/${editItem.id}`, payload);
        Swal.fire('Updated', 'Airline updated successfully', 'success');
      } else {
        await api.post('/airlines', payload);
        Swal.fire('Added', 'Airline added successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Confirm Deletion', text: `Airline "${name}" will be deleted`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/airlines/${id}`).then(() => load());
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Airlines</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> New Airline
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="Search by code or name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Country</th><th>Website</th><th>Phone</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(a => (
                <tr key={a.id}>
                  <td><span className="badge bg-secondary">{a.code}</span></td>
                  <td className="fw-semibold">{a.name}</td>
                  <td>{a.country || '-'}</td>
                  <td>{a.website ? <a href={a.website} target="_blank" rel="noreferrer">{a.website}</a> : '-'}</td>
                  <td>{a.phone || '-'}</td>
                  <td>{a.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(a)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a.id, a.name)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="7" className="text-center text-muted py-4">No airlines found</td></tr>
              )}
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

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-airplane me-2"></i>{editItem ? 'Edit Airline' : 'Add New Airline'}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Code <span className="text-danger">*</span></label>
                      <input className="form-control" name="code" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. SV, EK" required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input className="form-control" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Country</label>
                      <input className="form-control" name="country" value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone</label>
                      <input className="form-control" name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Website</label>
                    <input className="form-control" name="website" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="is_active" checked={formData.is_active == 1} onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })} />
                    <label className="form-check-label" htmlFor="is_active">Active</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg me-1"></i> Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
