import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [formData, setFormData] = useState({
    user_id: '', booking_id: '', commission_type: 'sales', amount: '', currency: 'SAR', percentage: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      if (userIdFilter) params.append('user_id', userIdFilter);
      const res = await api.get(`/commissions?${params.toString()}`);
      setCommissions(res.data.rows || []);
    } catch (err) {
      Swal.fire('Error', 'Failed to load commissions', 'error');
    } finally { setLoading(false); }
  }, [userIdFilter]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.rows || res.data || []);
    } catch (err) { console.error('Failed to load users', err); }
  };

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);
  useEffect(() => { fetchUsers(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ user_id: '', booking_id: '', commission_type: 'sales', amount: '', currency: 'SAR', percentage: '', notes: '' });
    setEditItem(null);
  };

  const openEdit = (c) => {
    setEditItem(c);
    setFormData({
      user_id: c.user_id ?? '',
      booking_id: c.booking_id ?? '',
      commission_type: c.commission_type || 'sales',
      amount: c.amount ?? '',
      currency: c.currency || 'SAR',
      percentage: c.percentage ?? '',
      notes: c.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id) { Swal.fire('Warning', 'Select a user', 'warning'); return; }
    if (!formData.amount || Number(formData.amount) <= 0) { Swal.fire('Warning', 'Enter a valid amount', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = {
        user_id: Number(formData.user_id),
        booking_id: formData.booking_id ? Number(formData.booking_id) : null,
        commission_type: formData.commission_type,
        amount: Number(formData.amount),
        currency: formData.currency,
        percentage: formData.percentage ? Number(formData.percentage) : null,
        notes: formData.notes
      };
      if (editItem) {
        await api.put(`/commissions/${editItem.id}`, payload);
        Swal.fire({ title: 'Updated', text: 'Commission updated successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/commissions', payload);
        Swal.fire({ title: 'Added', text: 'Commission added successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      }
      setShowModal(false);
      resetForm();
      fetchCommissions();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save commission', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?', text: 'This commission will be deleted', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/commissions/${id}`);
          Swal.fire('Deleted', 'Commission deleted successfully', 'success');
          fetchCommissions();
        } catch (err) { Swal.fire('Error', 'Failed to delete commission', 'error'); }
      }
    });
  };

  const getTypeLabel = (type) => {
    const map = { sales: 'Sales', referral: 'Referral', bonus: 'Bonus' };
    return map[type] || type;
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0"><i className="bi bi-cash-coin me-2"></i>Commissions</h4>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><i className="bi bi-plus-lg me-1"></i>Add Commission</button>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Filter by User</label>
              <select className="form-select" value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value)}>
                <option value="">All Users</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name || u.username}</option>))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => setUserIdFilter('')}><i className="bi bi-arrow-counterclockwise me-1"></i>Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-4 text-muted"><i className="bi bi-inbox fs-1 d-block mb-2"></i>No commissions found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr><th>#</th><th>User</th><th>Booking #</th><th>Type</th><th>Rate %</th><th>Amount</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td className="fw-bold">{c.user_name}</td>
                      <td><code>{c.booking_number || '-'}</code></td>
                      <td><span className="badge bg-light text-dark">{getTypeLabel(c.commission_type)}</span></td>
                      <td>{c.percentage ? `${Number(c.percentage).toFixed(2)}%` : '-'}</td>
                      <td className="fw-bold text-success">{Number(c.amount).toLocaleString()} {c.currency || 'SAR'}</td>
                      <td>{new Date(c.created_at).toLocaleDateString('en-US')}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(c)} title="Edit"><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)} title="Delete"><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className={`bi ${editItem ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>{editItem ? 'Edit Commission' : 'Add New Commission'}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">User <span className="text-danger">*</span></label>
                    <select className="form-select" name="user_id" value={formData.user_id} onChange={handleChange} required>
                      <option value="">Select User</option>
                      {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name || u.username}</option>))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Booking ID (optional)</label>
                    <input type="number" className="form-control" name="booking_id" value={formData.booking_id} onChange={handleChange} placeholder="Booking number..." />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Commission Type <span className="text-danger">*</span></label>
                    <select className="form-select" name="commission_type" value={formData.commission_type} onChange={handleChange}>
                      <option value="sales">Sales</option>
                      <option value="referral">Referral</option>
                      <option value="bonus">Bonus</option>
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Amount <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="amount" value={formData.amount} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                        <span className="input-group-text">SAR</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={handleChange}>
                        <option value="SAR">Saudi Riyal</option>
                        <option value="USD">US Dollar</option>
                        <option value="EUR">Euro</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Percentage (%)</label>
                    <input type="number" className="form-control" name="percentage" value={formData.percentage} onChange={handleChange} min="0" max="100" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="Notes..."></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg me-1"></i>{editItem ? 'Update Commission' : 'Save Commission'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
