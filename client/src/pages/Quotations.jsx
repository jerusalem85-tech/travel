import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    travel_date: '',
    return_date: '',
    from_destination: '',
    to_destination: '',
    airline: '',
    flight_number: '',
    service_type: '',
    total_amount: '',
    cost_amount: '',
    notes: ''
  });
  const limit = 10;

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/quotations?${params.toString()}`);
      setQuotations(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('Error', 'Failed to load quotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.rows || res.data || []);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [page, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuotations();
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      travel_date: '',
      return_date: '',
      from_destination: '',
      to_destination: '',
      airline: '',
      flight_number: '',
      service_type: '',
      total_amount: '',
      cost_amount: '',
      notes: ''
    });
  };

  const openCreate = () => {
    resetForm();
    setEditMode(false);
    setSelectedQuotation(null);
    setViewMode('form');
  };

  const openEdit = async (quotation) => {
    try {
      const res = await api.get(`/quotations/${quotation.id}`);
      const q = res.data;
      setFormData({
        customer_id: q.customer_id || '',
        travel_date: q.travel_date ? q.travel_date.split('T')[0] : '',
        return_date: q.return_date ? q.return_date.split('T')[0] : '',
        from_destination: q.from_destination || '',
        to_destination: q.to_destination || '',
        airline: q.airline || '',
        flight_number: q.flight_number || '',
        service_type: q.service_type || '',
        total_amount: q.total_amount || '',
        cost_amount: q.cost_amount || '',
        notes: q.notes || ''
      });
      setSelectedQuotation(q);
      setEditMode(true);
      setViewMode('form');
    } catch (err) {
      Swal.fire('Error', 'Failed to load quotation', 'error');
    }
  };

  const openView = async (quotation) => {
    try {
      const res = await api.get(`/quotations/${quotation.id}`);
      setSelectedQuotation(res.data);
      setViewMode('detail');
    } catch (err) {
      Swal.fire('Error', 'Failed to load quotation', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      Swal.fire('Warning', 'Select a customer', 'warning');
      return;
    }
    if (!formData.from_destination || !formData.to_destination) {
      Swal.fire('Warning', 'Enter travel destinations', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('Warning', 'Enter the total amount', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        travel_date: formData.travel_date || null,
        return_date: formData.return_date || null,
        from_destination: formData.from_destination,
        to_destination: formData.to_destination,
        airline: formData.airline,
        flight_number: formData.flight_number,
        service_type: formData.service_type,
        total_amount: Number(formData.total_amount),
        cost_amount: formData.cost_amount ? Number(formData.cost_amount) : null,
        notes: formData.notes
      };

      if (editMode && selectedQuotation) {
        await api.put(`/quotations/${selectedQuotation.id}`, payload);
        Swal.fire({
          title: 'Updated',
          text: 'Quotation updated successfully',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        await api.post('/quotations', payload);
        Swal.fire({
          title: 'Created',
          text: 'Quotation created successfully',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
      setViewMode('list');
      resetForm();
      fetchQuotations();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save quotation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const statusLabels = {
      draft: 'Draft',
      sent: 'Sent',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };
    Swal.fire({
      title: 'Change Status',
      text: `Are you sure you want to change status to "${statusLabels[newStatus]}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Change',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.put(`/quotations/${id}/status`, { status: newStatus });
          Swal.fire({
            title: 'Status Changed',
            text: 'Status changed successfully',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          fetchQuotations();
          if (selectedQuotation && selectedQuotation.id === id) {
            setSelectedQuotation((prev) => ({ ...prev, status: newStatus }));
          }
        } catch (err) {
          Swal.fire('Error', 'Failed to change status', 'error');
        }
      }
    });
  };

  const handleDelete = (id, quoteNumber) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Quotation ${quoteNumber} will be deleted`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/quotations/${id}`);
          Swal.fire('Deleted', 'Quotation deleted successfully', 'success');
          fetchQuotations();
        } catch (err) {
          Swal.fire('Error', 'Failed to delete quotation', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="badge bg-secondary">Draft</span>;
      case 'sent':
        return <span className="badge bg-primary">Sent</span>;
      case 'accepted':
        return <span className="badge bg-success">Accepted</span>;
      case 'rejected':
        return <span className="badge bg-danger">Rejected</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getProfit = () => {
    if (!selectedQuotation) return 0;
    return Number(selectedQuotation.total_amount) - Number(selectedQuotation.cost_amount || 0);
  };

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            Quotations
          </h4>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>
            Add Quotation
          </button>
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleSearch}>
              <div className="row g-3">
                <div className="col-md-5">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by quote number or customer name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-outline-primary w-100">
                    <i className="bi bi-search me-1"></i>
                    Search
                  </button>
                </div>
                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>
                    Reset
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                No quotations found
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Quote #</th>
                        <th>Customer</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Travel Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.map((q) => (
                        <tr key={q.id}>
                          <td>{q.id}</td>
                          <td><code>{q.quote_number}</code></td>
                          <td>{q.customer_name}</td>
                          <td>{q.from_destination}</td>
                          <td>{q.to_destination}</td>
                          <td>
                            {q.travel_date
                              ? new Date(q.travel_date).toLocaleDateString('en-US')
                              : '-'}
                          </td>
                          <td className="fw-bold">
                            {Number(q.total_amount).toLocaleString()} SAR
                          </td>
                          <td>{getStatusBadge(q.status)}</td>
                          <td>{new Date(q.created_at).toLocaleDateString('en-US')}</td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-info"
                                title="View"
                                onClick={() => openView(q)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning"
                                title="Edit"
                                onClick={() => openEdit(q)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                title="Delete"
                                onClick={() => handleDelete(q.id, q.quote_number)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <nav>
                    <ul className="pagination justify-content-center mb-0">
                      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPage(page - 1)}>
                          <i className="bi bi-chevron-right"></i>
                        </button>
                      </li>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <li className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            )}
                            <li className={`page-item ${page === p ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => setPage(p)}>
                                {p}
                              </button>
                            </li>
                          </React.Fragment>
                        ))}
                      <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPage(page + 1)}>
                          <i className="bi bi-chevron-left"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FORM VIEW (Create/Edit)
  if (viewMode === 'form') {
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className={`bi ${editMode ? 'bi-pencil' : 'bi-plus-circle'} me-2`}></i>
            {editMode ? 'Edit Quotation' : 'Add New Quotation'}
          </h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setViewMode('list')}
          >
            <i className="bi bi-arrow-right me-1"></i>
            Back
          </button>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Customer <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="customer_id"
                        value={formData.customer_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.full_name || c.name} - {c.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Service Type</label>
                      <select
                        className="form-select"
                        name="service_type"
                        value={formData.service_type}
                        onChange={handleChange}
                      >
                        <option value="">Select Service Type</option>
                        <option value="flight">Flight Ticket</option>
                        <option value="hotel">Hotel</option>
                        <option value="visa">Visa</option>
                        <option value="package">Tour Package</option>
                        <option value="transfer">Transfer</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">From Destination <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="from_destination"
                        value={formData.from_destination}
                        onChange={handleChange}
                        placeholder="e.g. Riyadh"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">To Destination <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        name="to_destination"
                        value={formData.to_destination}
                        onChange={handleChange}
                        placeholder="e.g. Dubai"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Travel Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="travel_date"
                        value={formData.travel_date}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Return Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="return_date"
                        value={formData.return_date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Airline</label>
                      <input
                        type="text"
                        className="form-control"
                        name="airline"
                        value={formData.airline}
                        onChange={handleChange}
                        placeholder="e.g. Saudia Airlines"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Flight Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="flight_number"
                        value={formData.flight_number}
                        onChange={handleChange}
                        placeholder="e.g. SV123"
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Total Amount <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="total_amount"
                          value={formData.total_amount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          required
                        />
                        <span className="input-group-text">SAR</span>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Cost</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="cost_amount"
                          value={formData.cost_amount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                        <span className="input-group-text">SAR</span>
                      </div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Net Profit</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={`${(
                            Number(formData.total_amount || 0) - Number(formData.cost_amount || 0)
                          ).toLocaleString()} SAR`}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Additional notes..."
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1"></i>
                          {editMode ? 'Update Quotation' : 'Create Quotation'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setViewMode('list')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle me-1"></i>
                  Info
                </h6>
                <ul className="list-unstyled mb-0 small text-muted">
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    Select customer and travel destinations
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    Cost is optional for profit calculation
                  </li>
                  <li className="mb-2">
                    <i className="bi bi-check-circle text-success me-1"></i>
                    Default status is "Draft"
                  </li>
                  <li>
                    <i className="bi bi-check-circle text-success me-1"></i>
                    Status can be changed on the quotation page
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  if (viewMode === 'detail' && selectedQuotation) {
    const q = selectedQuotation;
    return (
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            Quotation Details
          </h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setViewMode('list')}
            >
              <i className="bi bi-arrow-right me-1"></i>
              Back
            </button>
            <button
              className="btn btn-outline-warning"
              onClick={() => openEdit(q)}
            >
              <i className="bi bi-pencil me-1"></i>
              Edit
            </button>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Quote #: <code>{q.quote_number}</code>
                </h5>
                {getStatusBadge(q.status)}
              </div>
              <div className="card-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-person me-1"></i>
                      Customer Information
                    </h6>
                    <table className="table table-borderless table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '120px' }}>Name:</td>
                          <td className="fw-bold">{q.customer_name}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Phone:</td>
                          <td>{q.customer_phone}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Email:</td>
                          <td>{q.customer_email || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-info-circle me-1"></i>
                      Quotation Details
                    </h6>
                    <table className="table table-borderless table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted" style={{ width: '120px' }}>Date:</td>
                          <td>{new Date(q.created_at).toLocaleDateString('en-US')}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Service Type:</td>
                          <td>{q.service_type || '-'}</td>
                        </tr>
                        {q.notes && (
                          <tr>
                            <td className="text-muted">Notes:</td>
                            <td>{q.notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h6 className="text-muted mb-3">
                  <i className="bi bi-geo-alt me-1"></i>
                  Trip Details
                </h6>
                <div className="row mb-4">
                  <div className="col-md-3">
                    <div className="card border-primary">
                      <div className="card-body text-center">
                        <i className="bi bi-geo-alt-fill text-primary fs-4"></i>
                        <div className="small text-muted mt-1">From</div>
                        <strong>{q.from_destination}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-success">
                      <div className="card-body text-center">
                        <i className="bi bi-geo-alt-fill text-success fs-4"></i>
                        <div className="small text-muted mt-1">To</div>
                        <strong>{q.to_destination}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-info">
                      <div className="card-body text-center">
                        <i className="bi bi-calendar-event text-info fs-4"></i>
                        <div className="small text-muted mt-1">Travel Date</div>
                        <strong>
                          {q.travel_date
                            ? new Date(q.travel_date).toLocaleDateString('en-US')
                            : '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="card border-warning">
                      <div className="card-body text-center">
                        <i className="bi bi-calendar-minus text-warning fs-4"></i>
                        <div className="small text-muted mt-1">Return Date</div>
                        <strong>
                          {q.return_date
                            ? new Date(q.return_date).toLocaleDateString('en-US')
                            : '-'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {(q.airline || q.flight_number) && (
                  <>
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-airplane me-1"></i>
                      Flight Details
                    </h6>
                    <div className="row mb-4">
                      {q.airline && (
                        <div className="col-md-6">
                          <strong>Airline:</strong> {q.airline}
                        </div>
                      )}
                      {q.flight_number && (
                        <div className="col-md-6">
                          <strong>Flight Number:</strong> <code>{q.flight_number}</code>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="row text-center">
                  <div className="col-md-4">
                    <div className="card bg-primary text-white">
                      <div className="card-body">
                        <div className="small text-white-50">Customer Amount</div>
                        <h4 className="mb-0">{Number(q.total_amount).toLocaleString()} SAR</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-warning text-dark">
                      <div className="card-body">
                        <div className="small text-dark-50">Cost</div>
                        <h4 className="mb-0">{Number(q.cost_amount || 0).toLocaleString()} SAR</h4>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`card ${getProfit() >= 0 ? 'bg-success' : 'bg-danger'} text-white`}>
                      <div className="card-body">
                        <div className="small text-white-50">Net Profit</div>
                        <h4 className="mb-0">{getProfit().toLocaleString()} SAR</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card mb-4">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-arrow-repeat me-1"></i>
                  Change Status
                </h6>
                <div className="d-grid gap-2">
                  {q.status !== 'draft' && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => handleStatusChange(q.id, 'draft')}
                    >
                      <i className="bi bi-pencil-square me-1"></i>
                      Draft
                    </button>
                  )}
                  {q.status !== 'sent' && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleStatusChange(q.id, 'sent')}
                    >
                      <i className="bi bi-send me-1"></i>
                      Sent
                    </button>
                  )}
                  {q.status !== 'accepted' && (
                    <button
                      className="btn btn-outline-success"
                      onClick={() => handleStatusChange(q.id, 'accepted')}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Accepted
                    </button>
                  )}
                  {q.status !== 'rejected' && (
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleStatusChange(q.id, 'rejected')}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Rejected
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h6 className="card-title mb-3">
                  <i className="bi bi-pie-chart me-1"></i>
                  Quotation Summary
                </h6>
                <div className="d-flex justify-content-between mb-2">
                  <span>Customer Amount:</span>
                  <strong>{Number(q.total_amount).toLocaleString()} SAR</strong>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Cost:</span>
                  <strong>{Number(q.cost_amount || 0).toLocaleString()} SAR</strong>
                </div>
                <hr />
                <div className="d-flex justify-content-between">
                  <span>Net Profit:</span>
                  <strong className={getProfit() >= 0 ? 'text-success' : 'text-danger'}>
                    {getProfit().toLocaleString()} SAR
                  </strong>
                </div>
                {Number(q.total_amount) > 0 && (
                  <>
                    <div className="progress mt-3" style={{ height: '10px' }}>
                      <div
                        className="progress-bar bg-success"
                        style={{
                          width: `${Math.min((getProfit() / Number(q.total_amount)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="text-center small text-muted mt-1">
                      Profit Margin: {Math.round((getProfit() / Number(q.total_amount)) * 100)}%
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Quotations;
