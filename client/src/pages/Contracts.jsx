import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showDetail, setShowDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    contract_type: 'supplier',
    party_name: '',
    party_phone: '',
    party_email: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    terms: '',
    total_amount: '',
    currency: 'USD',
    status: 'active',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (typeFilter) params.append('contract_type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('Error', 'Failed to load contracts', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      contract_type: 'supplier',
      party_name: '',
      party_phone: '',
      party_email: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      terms: '',
      total_amount: '',
      currency: 'USD',
      status: 'active',
      notes: ''
    });
    setEditId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (contract) => {
    setEditId(contract.id);
    setFormData({
      contract_type: contract.contract_type || 'supplier',
      party_name: contract.party_name || '',
      party_phone: contract.party_phone || '',
      party_email: contract.party_email || '',
      start_date: contract.start_date ? contract.start_date.split('T')[0] : '',
      end_date: contract.end_date ? contract.end_date.split('T')[0] : '',
      terms: contract.terms || '',
      total_amount: contract.total_amount || '',
      currency: contract.currency || 'USD',
      status: contract.status || 'active',
      notes: contract.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party_name.trim()) {
      Swal.fire('Warning', 'Enter party name', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('Warning', 'Enter a valid amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        ...formData,
        total_amount: Number(formData.total_amount)
      };

      if (editId) {
        await api.put(`/contracts/${editId}`, body);
        Swal.fire({ title: 'Updated', text: 'Contract updated successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/contracts', body);
        Swal.fire({ title: 'Added', text: 'Contract added successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      }

      setShowModal(false);
      resetForm();
      fetchContracts();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save contract', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Contract will be deleted: ${name}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/contracts/${id}`);
          Swal.fire('Deleted', 'Contract deleted successfully', 'success');
          fetchContracts();
        } catch (err) {
          Swal.fire('Error', 'Failed to delete contract', 'error');
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      active: 'bg-success',
      expired: 'bg-secondary',
      cancelled: 'bg-danger'
    };
    const labels = {
      active: 'Active',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return <span className={`badge ${map[status] || 'bg-secondary'}`}>{labels[status] || status}</span>;
  };

  const getTypeLabel = (type) => {
    const map = { supplier: 'Supplier', customer: 'Customer', partner: 'Partner' };
    return map[type] || type;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-file-earmark-text me-2"></i>
          Contracts
        </h4>
        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1"></i>
          Add Contract
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search by party name or contract number..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Contract Type</label>
              <select className="form-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="supplier">Supplier</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(1); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              No contracts found
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Contract #</th>
                      <th>Type</th>
                      <th>Party</th>
                      <th>Phone</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c) => (
                      <tr key={c.id}>
                        <td><code>{c.contract_number}</code></td>
                        <td>{getTypeLabel(c.contract_type)}</td>
                        <td>{c.party_name}</td>
                        <td>{c.party_phone || '-'}</td>
                        <td>{c.start_date ? new Date(c.start_date).toLocaleDateString('en-US') : '-'}</td>
                        <td>{c.end_date ? new Date(c.end_date).toLocaleDateString('en-US') : '-'}</td>
                        <td className="fw-bold">{Number(c.total_amount).toLocaleString()} {c.currency || 'USD'}</td>
                        <td>{getStatusBadge(c.status)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-info" onClick={() => setShowDetail(showDetail === c.id ? null : c.id)} title="View Details">
                              <i className="bi bi-eye"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-warning" onClick={() => openEditModal(c)} title="Edit">
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id, c.contract_number)} title="Delete">
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detail View */}
              {showDetail && (() => {
                const contract = contracts.find((c) => c.id === showDetail);
                if (!contract) return null;
                return (
                  <div className="card bg-light mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-file-text me-1"></i> Contract Details {contract.contract_number}</span>
                      <button className="btn btn-sm btn-close" onClick={() => setShowDetail(null)}></button>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6 mb-2"><strong>Party:</strong> {contract.party_name}</div>
                        <div className="col-md-6 mb-2"><strong>Phone:</strong> {contract.party_phone || '-'}</div>
                        <div className="col-md-6 mb-2"><strong>Email:</strong> {contract.party_email || '-'}</div>
                        <div className="col-md-6 mb-2"><strong>Type:</strong> {getTypeLabel(contract.contract_type)}</div>
                        <div className="col-md-6 mb-2"><strong>Start Date:</strong> {contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-US') : '-'}</div>
                        <div className="col-md-6 mb-2"><strong>End Date:</strong> {contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-US') : '-'}</div>
                        <div className="col-md-6 mb-2"><strong>Amount:</strong> {Number(contract.total_amount).toLocaleString()} {contract.currency || 'USD'}</div>
                        <div className="col-md-6 mb-2"><strong>Status:</strong> {getStatusBadge(contract.status)}</div>
                      </div>
                      {contract.terms && (
                        <div className="mt-2">
                          <strong>Terms:</strong>
                          <p className="mb-0 mt-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>{contract.terms}</p>
                        </div>
                      )}
                      {contract.notes && (
                        <div className="mt-2">
                          <strong>Notes:</strong>
                          <p className="mb-0 mt-1 text-muted">{contract.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {totalPages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <li className="page-item disabled"><span className="page-link">...</span></li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                          </li>
                        </React.Fragment>
                      ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editId ? 'Edit Contract' : 'Add New Contract'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Contract Type <span className="text-danger">*</span></label>
                      <select className="form-select" name="contract_type" value={formData.contract_type} onChange={handleChange} required>
                        <option value="supplier">Supplier</option>
                        <option value="customer">Customer</option>
                        <option value="partner">Partner</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Party Name <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" name="party_name" value={formData.party_name} onChange={handleChange} placeholder="Party name..." required />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Party Phone</label>
                      <input type="text" className="form-control" name="party_phone" value={formData.party_phone} onChange={handleChange} placeholder="Phone number..." />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" name="party_email" value={formData.party_email} onChange={handleChange} placeholder="Email..." />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Start Date</label>
                      <input type="date" className="form-control" name="start_date" value={formData.start_date} onChange={handleChange} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">End Date</label>
                      <input type="date" className="form-control" name="end_date" value={formData.end_date} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Terms</label>
                    <textarea className="form-control" name="terms" value={formData.terms} onChange={handleChange} rows="3" placeholder="Contract terms..."></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Total Amount <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="total_amount" value={formData.total_amount} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                        <span className="input-group-text">USD</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={handleChange}>
                        <option value="USD">US Dollar</option>
                        <option value="ILS">Israeli Shekel</option>
                        <option value="SAR">Saudi Riyal</option>
                        <option value="EUR">Euro</option>
                        <option value="GBP">British Pound</option>
                        <option value="EGP">Egyptian Pound</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="Additional notes..."></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>{editId ? 'Update Contract' : 'Save Contract'}</>
                    )}
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

export default Contracts;
