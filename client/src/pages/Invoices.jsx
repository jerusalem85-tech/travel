import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      params.append('page', page);
      const res = await api.get(`/invoices?${params.toString()}`);
      setInvoices(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('Error', 'Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleDelete = (id, invoiceNumber) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Invoice ${invoiceNumber} will be deleted`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/invoices/${id}`);
          Swal.fire('Deleted', 'Invoice deleted successfully', 'success');
          fetchInvoices();
        } catch (err) {
          Swal.fire('Error', 'Failed to delete invoice', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="badge bg-success">Paid</span>;
      case 'partial':
        return <span className="badge bg-warning text-dark">Partial</span>;
      case 'unpaid':
        return <span className="badge bg-danger">Unpaid</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          Invoices
        </h4>
        <Link to="/invoices/create" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>
          Add Invoice
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3">
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by invoice number or customer name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
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
                  onClick={() => { setSearch(''); setStatus(''); setPage(1); }}
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
          ) : invoices.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              No invoices found
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Invoice No.</th>
                      <th>Customer</th>
                      <th>Trip</th>
                      <th>Total Amount</th>
                      <th>Paid Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.id}</td>
                        <td>
                          <code>{inv.invoice_number}</code>
                        </td>
                        <td>{inv.customer_name}</td>
                        <td>{inv.booking_number || '-'}</td>
                        <td>{Number(inv.total_amount).toLocaleString()} ر.س</td>
                        <td>{Number(inv.paid_amount).toLocaleString()} ر.س</td>
                        <td>{getStatusBadge(inv.status)}</td>
                        <td>{new Date(inv.created_at).toLocaleDateString('en-US')}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/invoices/${inv.id}`}
                              className="btn btn-outline-info"
                              title="View"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <button
                              className="btn btn-outline-danger"
                              title="Delete"
                              onClick={() => handleDelete(inv.id, inv.invoice_number)}
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
                      <button
                        className="page-link"
                        onClick={() => setPage(page - 1)}
                      >
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
                      <button
                        className="page-link"
                        onClick={() => setPage(page + 1)}
                      >
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
};

export default Invoices;
