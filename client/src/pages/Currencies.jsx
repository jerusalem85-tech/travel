import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Currencies = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    exchange_rate: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/currencies');
      setCurrencies(res.data.rows || res.data || []);
    } catch (err) {
      Swal.fire('Error', 'Failed to load currencies', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ code: '', name: '', exchange_rate: '' });
    setEditId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (currency) => {
    setEditId(currency.id);
    setFormData({
      code: currency.code || '',
      name: currency.name || '',
      exchange_rate: currency.exchange_rate || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      Swal.fire('Warning', 'Enter currency code', 'warning');
      return;
    }
    if (!formData.name.trim()) {
      Swal.fire('Warning', 'Enter currency name', 'warning');
      return;
    }
    if (!formData.exchange_rate || Number(formData.exchange_rate) <= 0) {
      Swal.fire('Warning', 'Enter a valid exchange rate', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        exchange_rate: Number(formData.exchange_rate)
      };

      if (editId) {
        await api.put(`/currencies/${editId}`, body);
        Swal.fire({ title: 'Updated', text: 'Currency updated successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      } else {
        await api.post('/currencies', body);
        Swal.fire({ title: 'Added', text: 'Currency added successfully', icon: 'success', timer: 2000, showConfirmButton: false });
      }

      setShowModal(false);
      resetForm();
      fetchCurrencies();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save currency', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id, code) => {
    Swal.fire({
      title: 'Confirm',
      text: `Set ${code} as default currency?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Set',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.post(`/currencies/${id}/set-default`);
          Swal.fire('Done', 'Default currency set successfully', 'success');
          fetchCurrencies();
        } catch (err) {
          Swal.fire('Error', err.response?.data?.message || 'Failed to set default currency', 'error');
        }
      }
    });
  };

  const handleDelete = (currency) => {
    if (currency.is_default) {
      Swal.fire('Warning', 'Cannot delete default currency', 'warning');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Delete currency: ${currency.code} - ${currency.name}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/currencies/${currency.id}`);
          Swal.fire('Deleted', 'Currency deleted successfully', 'success');
          fetchCurrencies();
        } catch (err) {
          Swal.fire('Error', 'Failed to delete currency', 'error');
        }
      }
    });
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-currency-exchange me-2"></i>
          Currencies
        </h4>
        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1"></i>
          Add Currency
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : currencies.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              No currencies
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Exchange Rate</th>
                    <th>Default</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((c) => (
                    <tr key={c.id} className={c.is_default ? 'table-primary' : ''}>
                      <td>{c.id}</td>
                      <td><span className="badge bg-dark fs-6">{c.code}</span></td>
                      <td className="fw-bold">{c.name}</td>
                      <td dir="ltr" className="text-start">{Number(c.exchange_rate).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                      <td>
                        {c.is_default ? (
                          <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Default</span>
                        ) : (
                          <span className="badge bg-secondary">No</span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-warning" onClick={() => openEditModal(c)} title="Edit">
                            <i className="bi bi-pencil"></i>
                          </button>
                          {!c.is_default && (
                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleSetDefault(c.id, c.code)} title="Set as Default">
                              <i className="bi bi-star"></i>
                            </button>
                          )}
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c)} title="Delete">
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editId ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
                  {editId ? 'Edit Currency' : 'Add New Currency'}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency Code <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder="e.g., USD, EUR, SAR"
                        maxLength="5"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., US Dollar, Euro"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Exchange Rate <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      name="exchange_rate"
                      value={formData.exchange_rate}
                      onChange={handleChange}
                      min="0"
                      step="0.0001"
                      placeholder="1.0000"
                      required
                    />
                    <small className="text-muted">Relative to base currency (SAR)</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>{editId ? 'Update Currency' : 'Save Currency'}</>
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

export default Currencies;
