import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'flight', label: 'Flight', icon: 'bi-airplane' },
  { value: 'hotel', label: 'Hotel', icon: 'bi-building' },
  { value: 'insurance', label: 'Insurance', icon: 'bi-shield-check' },
  { value: 'transport', label: 'Transport', icon: 'bi-bus-front' },
  { value: 'visa', label: 'Visa', icon: 'bi-passport' },
];

export default function Services() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    name: '', category: 'flight', description: '', price: '', currency: 'USD',
    supplier_id: '', is_active: 1, notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (category) params.category = category;
    api.get('/services-catalog', { params }).then(res => setData(res.data));
  };

  const loadSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.rows || res.data || []);
    } catch {}
  };

  useEffect(() => { load(); }, [page, category]);
  useEffect(() => { loadSuppliers(); }, []);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({
      name: '', category: 'flight', description: '', price: '', currency: 'USD',
      supplier_id: '', is_active: 1, notes: ''
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'flight',
      description: item.description || '',
      price: item.price ?? '',
      currency: item.currency || 'USD',
      supplier_id: item.supplier_id ?? '',
      is_active: item.is_active ?? 1,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { Swal.fire('Alert', 'Service name is required', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: formData.price ? Number(formData.price) : 0,
        supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
        is_active: Number(formData.is_active)
      };
      if (editItem) {
        await api.put(`/services-catalog/${editItem.id}`, payload);
        Swal.fire('Updated', 'Service updated successfully', 'success');
      } else {
        await api.post('/services-catalog', payload);
        Swal.fire('Added', 'Service added successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Save failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Confirm Deletion', text: `Service "${name}" will be deleted`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel'
    }).then(r => { if (r.isConfirmed) api.delete(`/services-catalog/${id}`).then(() => load()); });
  };

  const catIcon = (cat) => {
    const map = { flight: 'bi-airplane', hotel: 'bi-building', insurance: 'bi-shield-check', transport: 'bi-bus-front', visa: 'bi-passport' };
    return map[cat] || 'bi-gear';
  };

  const catLabel = (cat) => {
    const map = { flight: 'Flight', hotel: 'Hotel', insurance: 'Insurance', transport: 'Transport', visa: 'Visa' };
    return map[cat] || cat;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Services Catalog</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> Add Service
        </button>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-5">
              <div className="search-box">
                <i className="bi bi-search"></i>
                <input className="form-control" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>Name</th><th>Category</th><th>Price</th><th>Supplier</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(s => (
                <tr key={s.id}>
                  <td className="fw-semibold">{s.name}</td>
                  <td><span className="badge bg-light text-dark"><i className={`bi ${catIcon(s.category)} me-1`}></i>{catLabel(s.category)}</span></td>
                  <td>{s.price ? `${Number(s.price).toLocaleString()} ${s.currency || 'USD'}` : '-'}</td>
                  <td>{s.supplier_name || '-'}</td>
                  <td>{s.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(s)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id, s.name)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="6" className="text-center text-muted py-4">No services found</td></tr>
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
                <h5 className="modal-title"><i className="bi bi-gear me-2"></i>{editItem ? 'Edit Service' : 'Add New Service'}</h5>
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
                      <label className="form-label">Category <span className="text-danger">*</span></label>
                      <select className="form-select" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                        {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Price</label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="price" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} min="0" step="0.01" />
                        <span className="input-group-text">{formData.currency || 'USD'}</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency</label>
                      <select className="form-select" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="USD">US Dollar</option>
                        <option value="ILS">Israeli Shekel</option>
                        <option value="SAR">Saudi Riyal</option>
                        <option value="EUR">Euro</option>
                        <option value="EGP">Egyptian Pound</option>
                        <option value="EGP">Egyptian Pound</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Supplier</label>
                      <select className="form-select" value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}>
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="form-check mt-4">
                        <input className="form-check-input" type="checkbox" id="is_active" checked={formData.is_active == 1} onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })} />
                        <label className="form-check-label" htmlFor="is_active">Active</label>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" name="description" rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>Save</>}
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
