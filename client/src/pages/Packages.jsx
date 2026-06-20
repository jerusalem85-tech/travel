import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Packages() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', destination: '', duration_days: '', includes: '', excludes: '',
    price_per_person: '', currency: 'USD', status: 'active', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/tour-packages', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [page, status]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({
      name: '', description: '', destination: '', duration_days: '', includes: '', excludes: '',
      price_per_person: '', currency: 'USD', status: 'active', notes: ''
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '', description: item.description || '', destination: item.destination || '',
      duration_days: item.duration_days || '', includes: item.includes || '', excludes: item.excludes || '',
      price_per_person: item.price_per_person || '', currency: item.currency || 'USD',
      status: item.status || 'active', notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.destination.trim()) {
      Swal.fire('Alert', 'Enter package name and destination', 'warning'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        duration_days: formData.duration_days ? Number(formData.duration_days) : null,
        price_per_person: formData.price_per_person ? Number(formData.price_per_person) : null
      };
      if (editItem) {
        await api.put(`/tour-packages/${editItem.id}`, payload);
        Swal.fire('Updated', 'Package updated successfully', 'success');
      } else {
        await api.post('/tour-packages', payload);
        Swal.fire('Added', 'Package added successfully', 'success');
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
      title: 'Confirm Deletion', text: `The package "${name}" will be deleted`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/tour-packages/${id}`).then(() => { if (detailItem?.id === id) setDetailItem(null); load(); });
    });
  };

  const statusBadge = (s) => {
    const colors = { active: 'success', inactive: 'secondary' };
    const labels = { active: 'Active', inactive: 'Inactive' };
    return <span className={`badge bg-${colors[s] || 'secondary'}`}>{labels[s] || s}</span>;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Tour Packages</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> New Package
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-8">
              <div className="search-box">
                <i className="bi bi-search"></i>
                <input className="form-control" placeholder="Search by name or package code..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Destination</th><th>Duration (Days)</th><th>Price/Person</th><th>Currency</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(p => (
                <tr key={p.id}>
                  <td><code>{p.package_code || '-'}</code></td>
                  <td>
                    <button className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold" onClick={() => setDetailItem(p)}>
                      {p.name}
                    </button>
                  </td>
                  <td>{p.destination || '-'}</td>
                  <td>{p.duration_days || '-'}</td>
                  <td>{p.price_per_person ? Number(p.price_per_person).toLocaleString() : '-'}</td>
                  <td>{p.currency || 'USD'}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => setDetailItem(p)}><i className="bi bi-eye"></i></button>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(p)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.id, p.name)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No packages found</td></tr>
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

      {/* Detail View Modal */}
      {detailItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-info-circle me-2"></i>Package Details</h5>
                <button type="button" className="btn-close" onClick={() => setDetailItem(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Package Code</h6>
                    <p className="fw-bold">{detailItem.package_code || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Name</h6>
                    <p className="fw-bold">{detailItem.name}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Destination</h6>
                    <p>{detailItem.destination || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Duration (Days)</h6>
                    <p>{detailItem.duration_days || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Price per Person</h6>
                    <p className="text-primary fw-bold">{detailItem.price_per_person ? `${Number(detailItem.price_per_person).toLocaleString()} ${detailItem.currency || 'USD'}` : '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Status</h6>
                    <p>{statusBadge(detailItem.status)}</p>
                  </div>
                  <div className="col-12">
                    <h6 className="text-muted mb-1">Description</h6>
                    <p>{detailItem.description || 'No description available'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Includes</h6>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{detailItem.includes || '-'}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-1">Excludes</h6>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{detailItem.excludes || '-'}</p>
                  </div>
                  <div className="col-12">
                    <h6 className="text-muted mb-1">Notes</h6>
                    <p>{detailItem.notes || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-warning" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <i className="bi bi-pencil me-1"></i> Edit
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDetailItem(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-box-seam me-2"></i>
                  {editItem ? 'Edit Package' : 'Add New Package'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input className="form-control" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Destination <span className="text-danger">*</span></label>
                      <input className="form-control" name="destination" value={formData.destination} onChange={e => setFormData({ ...formData, destination: e.target.value })} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" name="description" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Duration (Days)</label>
                      <input type="number" className="form-control" name="duration_days" value={formData.duration_days} onChange={e => setFormData({ ...formData, duration_days: e.target.value })} min="1" />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Price per Person</label>
                      <input type="number" className="form-control" name="price_per_person" value={formData.price_per_person} onChange={e => setFormData({ ...formData, price_per_person: e.target.value })} min="0" step="0.01" />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Currency</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="ILS">Israeli Shekel</option>
                        <option value="USD">US Dollar</option>
                        <option value="SAR">Saudi Riyal</option>
                        <option value="AED">UAE Dirham</option>
                        <option value="EUR">Euro</option>
                        <option value="EGP">Egyptian Pound</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" name="status" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Includes</label>
                      <textarea className="form-control" name="includes" rows="3" value={formData.includes} onChange={e => setFormData({ ...formData, includes: e.target.value })} placeholder="e.g. Flight tickets, accommodation, transfer"></textarea>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Excludes</label>
                      <textarea className="form-control" name="excludes" rows="3" value={formData.excludes} onChange={e => setFormData({ ...formData, excludes: e.target.value })} placeholder="e.g. Insurance, personal expenses"></textarea>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
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
