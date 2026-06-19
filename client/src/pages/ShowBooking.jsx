import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function ShowBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'Cash', notes: '' });

  const load = () => api.get(`/bookings/${id}`).then(res => setBooking(res.data));

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    Swal.fire({ title: 'Confirm Deletion', text: 'The booking and all related data will be deleted', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel' }).then(r => {
      if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => navigate('/bookings'));
    });
  };

  const recordPayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return;
    await api.post('/payments', { booking_id: parseInt(id), amount: parseFloat(payForm.amount), payment_method: payForm.payment_method, notes: payForm.notes });
    setShowPayModal(false);
    setPayForm({ amount: '', payment_method: 'Cash', notes: '' });
    load();
  };

  const statusBadge = (status) => {
    const colors = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
    const labels = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed' };
    return <span className={`badge bg-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>;
  };

  const serviceTypeLabel = (type) => {
    const labels = { flight: 'Flight', hotel: 'Hotel', visa: 'Visa', tour: 'Tour', transport: 'Transport', other: 'Other' };
    return labels[type] || type || '-';
  };

  if (!booking) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const remaining = (booking.total_amount || 0) - (booking.paid_amount || 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Booking #{booking.booking_number}</h5>
        <div>
          <button className="btn btn-success me-2" onClick={() => setShowPayModal(true)}><i className="bi bi-cash"></i> Record Payment</button>
          <Link to={`/bookings/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> Edit</Link>
          <button className="btn btn-danger me-2" onClick={handleDelete}><i className="bi bi-trash"></i> Delete</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>Back</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h6>Booking Details</h6>
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Customer</small>
                  <p className="mb-0">{booking.customer_name}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Service Type</small>
                  <p className="mb-0">{serviceTypeLabel(booking.service_type)}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Status</small>
                  <p className="mb-0">{statusBadge(booking.status)}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">From - To</small>
                  <p className="mb-0">{booking.from_destination && booking.to_destination ? `${booking.from_destination} → ${booking.to_destination}` : '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Travel Date</small>
                  <p className="mb-0">{booking.travel_date || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Return Date</small>
                  <p className="mb-0">{booking.return_date || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Airline</small>
                  <p className="mb-0">{booking.airline || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Flight No.</small>
                  <p className="mb-0">{booking.flight_number || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Ticket No.</small>
                  <p className="mb-0">{booking.ticket_number || '-'}</p>
                </div>
              </div>
              {booking.notes && <div className="mt-2"><small className="text-secondary">Notes</small><p className="mb-0">{booking.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary bg-opacity-10">
            <div className="card-body text-center">
              <h6>Amounts</h6>
              <h3 className="text-primary">{booking.total_amount?.toLocaleString()}</h3>
              <small>Total</small>
              <div className="d-flex justify-content-around mt-3">
                <div><small className="text-success">Paid</small><h5>{booking.paid_amount?.toLocaleString()}</h5></div>
                <div><small className="text-danger">Remaining</small><h5>{remaining.toLocaleString()}</h5></div>
              </div>
              {booking.cost_amount > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <small className="text-secondary">Cost</small>
                  <h5 className="mb-0">{booking.cost_amount?.toLocaleString()}</h5>
                </div>
              )}
              {booking.profit_amount != null && (
                <div className="mt-1">
                  <small className="text-secondary">Profit</small>
                  <h5 className={`mb-0 ${booking.profit_amount >= 0 ? 'text-success' : 'text-danger'}`}>{booking.profit_amount?.toLocaleString()}</h5>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>Passengers ({booking.passengers?.length || 0})</h6>
              {booking.passengers?.length === 0 && <p className="text-secondary mb-0">No passengers</p>}
              {booking.passengers?.map((p, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <strong>{p.name}</strong>
                    <br />
                    <small className="text-secondary">
                      {p.passport && `Passport: ${p.passport}`}
                      {p.nationality && ` - ${p.nationality}`}
                      {p.type === 'child' && ' - Child'}
                      {p.type === 'infant' && ' - Infant'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>Services ({booking.services?.length || 0})</h6>
              {booking.services?.length === 0 && <p className="text-secondary mb-0">No services</p>}
              {booking.services?.map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <strong>{s.description}</strong>
                    {s.supplier_name && <><br /><small className="text-secondary">Supplier: {s.supplier_name}</small></>}
                  </div>
                  <div className="text-end">
                    {s.cost > 0 && <div><small className="text-danger">Cost: {s.cost?.toLocaleString()}</small></div>}
                    {s.price > 0 && <div><small className="text-success">Price: {s.price?.toLocaleString()}</small></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>Payments ({booking.payments?.length || 0})</h6>
          {booking.payments?.length === 0 && <p className="text-secondary mb-0">No payments</p>}
          {booking.payments?.map(p => (
            <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <div>
                <strong>{p.payment_number}</strong>
                <br />
                <small>{p.payment_method} {p.notes && `- ${p.notes}`}</small>
              </div>
              <span className="text-success">{p.amount?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {showPayModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">Record Payment</h6><button className="btn-close" onClick={() => setShowPayModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">Amount</label><input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">Payment Method</label>
                  <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({...payForm, payment_method: e.target.value})}>
                    <option>Cash</option><option>Bank Transfer</option><option>Mada</option><option>Credit Card</option>
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">Notes</label><input className="form-control" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={recordPayment}>Record Payment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
