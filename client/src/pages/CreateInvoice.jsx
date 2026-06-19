import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    booking_id: '',
    total_amount: '',
    notes: ''
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data.rows || res.data || []);
      } catch (err) {
        Swal.fire('Error', 'Failed to load customers', 'error');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      const fetchBookings = async () => {
        try {
          const res = await api.get(`/bookings?customer_id=${formData.customer_id}`);
          setBookings(res.data.rows || res.data || []);
        } catch (err) {
          setBookings([]);
        }
      };
      fetchBookings();
    } else {
      setBookings([]);
    }
  }, [formData.customer_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      Swal.fire('Alert', 'Please select a customer', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('Alert', 'Enter a valid amount', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        total_amount: Number(formData.total_amount),
        notes: formData.notes
      };
      if (formData.booking_id) {
        payload.booking_id = Number(formData.booking_id);
      }
      await api.post('/invoices', payload);
      Swal.fire({
        title: 'Created',
        text: 'Invoice created successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      navigate('/invoices');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to create invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          Create New Invoice
        </h4>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/invoices')}
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
                <div className="mb-3">
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

                <div className="mb-3">
                  <label className="form-label">Trip (Optional)</label>
                  <select
                    className="form-select"
                    name="booking_id"
                    value={formData.booking_id}
                    onChange={handleChange}
                  >
                    <option value="">No Trip</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_number} - {b.from_destination} to {b.to_destination}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
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
                    <span className="input-group-text">USD</span>
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
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        Create Invoice
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/invoices')}
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
                  Select a customer first to view their trips
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  Selecting a trip is optional but recommended
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  Payments can be added later from the invoice page
                </li>
                <li>
                  <i className="bi bi-check-circle text-success me-1"></i>
                  Invoice status is automatic based on payments
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
