import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (categoryFilter) params.append('category', categoryFilter);
      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.rows || []);
      setTotal(res.data.total || 0);
      setSum(res.data.sum || 0);
      if (res.data.categories) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, fromDate, toDate, categoryFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      Swal.fire('Alert', 'Enter expense description', 'warning');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      Swal.fire('Alert', 'Enter a valid amount', 'warning');
      return;
    }
    if (!formData.category.trim()) {
      Swal.fire('Alert', 'Enter the category', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/expenses', {
        description: formData.description,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes
      });
      Swal.fire({
        title: 'Added',
        text: 'Expense added successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setShowForm(false);
      resetForm();
      fetchExpenses();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to add expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, description) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Expense will be deleted: ${description}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/expenses/${id}`);
          Swal.fire('Deleted', 'Expense deleted successfully', 'success');
          fetchExpenses();
        } catch (err) {
          Swal.fire('Error', 'Failed to delete expense', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-wallet2 me-2"></i>
          Expenses
        </h4>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <i className="bi bi-plus-lg me-1"></i>
          Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <i className="bi bi-wallet2 fs-2 mb-1"></i>
              <div className="small">Total Expenses</div>
              <h4 className="mb-0">{Number(sum).toLocaleString()} SAR</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <i className="bi bi-receipt fs-2 mb-1"></i>
              <div className="small">Expense Count</div>
              <h4 className="mb-0">{total}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <i className="bi bi-tags fs-2 mb-1"></i>
              <div className="small">Categories</div>
              <h4 className="mb-0">{categories.length}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setCategoryFilter('');
                  setPage(1);
                }}
              >
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              No expenses found
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>{exp.id}</td>
                        <td className="fw-bold">{exp.description}</td>
                        <td>
                          <span className="badge bg-light text-dark">
                            <i className="bi bi-tag me-1"></i>
                            {exp.category}
                          </span>
                        </td>
                        <td className="text-danger fw-bold">
                          {Number(exp.amount).toLocaleString()} SAR
                        </td>
                        <td>{new Date(exp.date).toLocaleDateString('en-US')}</td>
                        <td className="text-muted small">{exp.notes || '-'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(exp.id, exp.description)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="table-active">
                      <td colSpan="3" className="fw-bold text-end">Total:</td>
                      <td className="fw-bold text-danger">
                        {Number(sum).toLocaleString()} SAR
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
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

      {/* Add Expense Form Modal */}
      {showForm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  Add New Expense
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setShowForm(false); resetForm(); }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Description <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Expense description..."
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Amount <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          required
                        />
                        <span className="input-group-text">SAR</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Category <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="E.g.: Flight tickets, Hotels, Transport..."
                      list="categoryList"
                      required
                    />
                    <datalist id="categoryList">
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat} />
                      ))}
                    </datalist>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="2"
                      placeholder="Additional notes..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowForm(false); resetForm(); }}
                  >
                    Cancel
                  </button>
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
                        Save Expense
                      </>
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

export default Expenses;
