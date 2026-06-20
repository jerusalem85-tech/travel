import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const emptyServiceDetails = {
  airline: '', airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '', origin_airport: '', destination_airport: '', departure_date: '', departure_time: '', departure_next_day: false, arrival_date: '', arrival_time: '', arrival_next_day: false, ticket_number: '', checked_baggage: '', cabin_baggage: '',
  hotel_name: '', room_type: '', board_basis: '', check_in: '', check_out: '',
  transport_type: '', pickup_location: '', dropoff_location: '', pickup_time: '',
  country: '', visa_type: '', processing_time: '',
  policy_number: '', coverage_type: '', start_date: '', end_date: '',
};

export default function ShowBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'Cash', notes: '' });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({ service_category: '', supplier_id: '', description: '', cost: '', price: '', currency: 'ILS', details: { ...emptyServiceDetails } });
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  const load = () => { api.get(`/bookings/${id}`).then(res => setBooking(res.data)); api.get(`/booking-documents/${id}`).then(res => setDocuments(res.data.rows || [])); };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { api.get('/airports?limit=1000').then(r => setAirports(r.data.rows || [])); api.get('/airlines?limit=1000').then(r => setAirlines(r.data.rows || [])); }, []);

  const handleDelete = () => Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => navigate('/bookings')); });
  const recordPayment = async () => { if (!payForm.amount) return; await api.post('/payments', { booking_id: +id, amount: +payForm.amount, payment_method: payForm.payment_method, notes: payForm.notes }); setShowPayModal(false); setPayForm({ amount: '', payment_method: 'Cash', notes: '' }); load(); };
  const handlePrint = () => window.print();

  const changeStatus = async (s) => { try { await api.put(`/bookings/${id}`, { ...booking, status: s }); load(); } catch {} };
  const deleteService = (sid) => Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/bookings/services/${sid}`).then(() => load()); });

  const handleUpload = async () => { if (!uploadFile) return; const fd = new FormData(); fd.append('file', uploadFile); await api.post(`/booking-documents/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setUploadFile(null); load(); };
  const deleteDoc = (did) => Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/booking-documents/${did}`).then(() => load()); });

  const sendWA = () => {
    const phone = (booking?.customer_phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!phone) return Swal.fire('Warning', 'No phone', 'warning');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`*TravelBox - ${booking.booking_number}*\n\n${booking.customer_name}\n📅 ${booking.travel_date||''}\n💰 ${(booking.total_amount||0).toLocaleString()} ILS\n📍 ${booking.from_destination||''} → ${booking.to_destination||''}`)}`, '_blank');
  };

  if (!booking) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const remaining = (booking.total_amount || 0) - (booking.paid_amount || 0);

  return (
    <div>
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h5 className="page-title mb-0">Booking #{booking.booking_number}</h5>
          <select className="form-select form-select-sm" style={{ width: 130 }} value={booking.status} onChange={e => changeStatus(e.target.value)}>
            <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
          <span className={`badge bg-${booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : booking.status === 'completed' ? 'info' : 'warning'} fs-6`}>{booking.status}</span>
        </div>
        <div className="d-flex gap-1 flex-wrap">
          <button className="btn btn-sm btn-outline-success" onClick={sendWA} title="WhatsApp"><i className="bi bi-whatsapp"></i></button>
          <button className="btn btn-sm btn-outline-info" onClick={handlePrint} title="Print"><i className="bi bi-printer"></i></button>
          <button className="btn btn-sm btn-success" onClick={() => setShowPayModal(true)}><i className="bi bi-cash"></i> Payment</button>
          <Link to={`/bookings/${id}/edit`} className="btn btn-sm btn-warning"><i className="bi bi-pencil"></i> Edit</Link>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}><i className="bi bi-trash"></i> Delete</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/bookings')}>Back</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {/* CUSTOMER + AMOUNTS */}
        <div className="col-md-8">
          <div className="card"><div className="card-body">
            <h6 className="text-primary mb-3"><i className="bi bi-person me-2"></i>Customer & Trip</h6>
            <div className="row g-2">
              <div className="col-6"><small className="text-muted">Customer</small><p className="fw-semibold mb-0">{booking.customer_name}</p></div>
              <div className="col-6"><small className="text-muted">Phone</small><p className="mb-0">{booking.customer_phone || booking.customer?.phone || '-'}</p></div>
              <div className="col-6"><small className="text-muted">From → To</small><p className="mb-0">{booking.from_destination && booking.to_destination ? `${booking.from_destination} → ${booking.to_destination}` : '-'}</p></div>
              <div className="col-3"><small className="text-muted">Travel Date</small><p className="mb-0">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p></div>
              <div className="col-3"><small className="text-muted">Return</small><p className="mb-0">{booking.return_date ? new Date(booking.return_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p></div>
            </div>
            {booking.notes && <div className="mt-2 pt-2 border-top"><small className="text-muted">Notes</small><p className="mb-0 small">{booking.notes}</p></div>}
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light"><div className="card-body text-center">
            <small className="text-muted">Total</small><h3 className="text-primary mb-1">{(booking.total_amount || 0).toLocaleString()} ILS</h3>
            <div className="d-flex justify-content-around mt-2 pt-2 border-top">
              <div><small className="text-muted">Paid</small><h5 className="text-success mb-0">{(booking.paid_amount || 0).toLocaleString()}</h5></div>
              <div><small className="text-muted">Due</small><h5 className={`mb-0 ${remaining > 0 ? 'text-danger' : 'text-success'}`}>{remaining.toLocaleString()}</h5></div>
            </div>
            {(booking.cost_amount > 0) && <div className="mt-2 pt-2 border-top"><small className="text-muted">Cost</small><h5 className="mb-0">{booking.cost_amount.toLocaleString()}</h5></div>}
            {(booking.profit_amount != null) && <div><small className="text-muted">Profit</small><h5 className={`mb-0 ${booking.profit_amount >= 0 ? 'text-success' : 'text-danger'}`}>{booking.profit_amount.toLocaleString()}</h5></div>}
          </div></div>
        </div>
      </div>

      {/* PASSENGERS */}
      <div className="row g-3 mb-3">
        <div className="col-md-12">
          <div className="card"><div className="card-body">
            <h6 className="mb-3"><i className="bi bi-people me-2"></i>Passengers ({booking.passengers?.length || 0})</h6>
            {booking.passengers?.length === 0 && <p className="text-muted small mb-0">No passengers</p>}
            <div className="row g-2">
              {booking.passengers?.map((p, i) => (
                <div key={i} className="col-md-4">
                  <div className="border rounded p-2 bg-light">
                    <strong>{p.full_name || p.name}</strong>
                    <div className="small text-muted">
                      {p.passport_number && <>Passport: {p.passport_number}</>}
                      {p.passport && <>Passport: {p.passport}</>}
                      {p.nationality && <> • {p.nationality}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div></div>
        </div>
      </div>

      {/* SERVICES */}
      <div className="row g-3 mb-3">
        <div className="col-md-12">
          <div className="card border-top border-success border-3"><div className="card-body">
            <div className="d-flex justify-content-between mb-3"><h6 className="mb-0"><i className="bi bi-bag-check me-2 text-success"></i>Services ({booking.services?.length || 0})</h6>
              <button className="btn btn-sm btn-outline-success" onClick={() => { setServiceForm({ service_category: '', supplier_id: '', description: '', cost: '', price: '', currency: 'ILS', details: { ...emptyServiceDetails } }); setShowServiceModal(true); }}><i className="bi bi-plus"></i> Add</button>
            </div>
            {booking.services?.length === 0 && <p className="text-muted small mb-0">No services</p>}
            {booking.services?.map((s, i) => {
              const d = s.details || {};
              return (
                <div key={i} className="border rounded p-2 mb-2 bg-white">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong className="text-success">{s.service_type?.toUpperCase() || 'SERVICE'}</strong>
                      <span className="ms-2 small text-muted">{s.description}</span>
                      {d.airline && <div className="small"><i className="bi bi-airplane me-1"></i>{d.airline} {d.flight_number || ''}{d.origin_airport ? ` • ${d.origin_airport} → ${d.destination_airport}` : ''}</div>}
                      {d.departure_time && <div className="small text-muted"><i className="bi bi-clock me-1"></i>Dep: {d.departure_date} {d.departure_time}{d.departure_next_day ? '+1' : ''}{d.arrival_time ? ` → Arr: ${d.arrival_date} ${d.arrival_time}${d.arrival_next_day ? '+1' : ''}` : ''}</div>}
                      {d.hotel_name && <div className="small"><i className="bi bi-building me-1"></i>{d.hotel_name} {d.check_in && `• ${d.check_in} → ${d.check_out}`}</div>}
                      {d.pickup_location && <div className="small"><i className="bi bi-car-front me-1"></i>{d.pickup_location} → {d.dropoff_location}</div>}
                      {d.country && <div className="small"><i className="bi bi-file-earmark-text me-1"></i>Visa: {d.country} {d.visa_type || ''}</div>}
                      {(d.checked_baggage || d.cabin_baggage) && <div className="small text-muted">Baggage: {d.checked_baggage}kg / {d.cabin_baggage}kg</div>}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="text-end small">
                        {s.cost > 0 && <div className="text-danger">Cost: {s.cost} ILS</div>}
                        {s.price > 0 && <div className="text-success fw-bold">Price: {s.price} ILS</div>}
                      </div>
                      <button className="btn btn-sm text-danger" onClick={() => deleteService(s.id)}><i className="bi bi-x-lg"></i></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div></div>
        </div>
      </div>

      {/* PAYMENTS + DOCUMENTS */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card"><div className="card-body">
            <h6 className="mb-2"><i className="bi bi-cash-stack me-2 text-success"></i>Payments ({booking.payments?.length || 0})</h6>
            {booking.payments?.length === 0 && <p className="text-muted small mb-0">No payments</p>}
            {booking.payments?.map(p => (
              <div key={p.id} className="d-flex justify-content-between border-bottom py-1 small"><span>{p.payment_method} {p.notes}</span><span className="text-success fw-bold">{p.amount?.toLocaleString()} ILS</span></div>
            ))}
          </div></div>
        </div>
        <div className="col-md-6">
          <div className="card"><div className="card-body">
            <h6 className="mb-2"><i className="bi bi-paperclip me-2"></i>Documents ({documents.length})</h6>
            <div className="input-group input-group-sm mb-2"><input type="file" className="form-control" onChange={e => setUploadFile(e.target.files[0])} /><button className="btn btn-outline-primary" onClick={handleUpload}>Upload</button></div>
            {documents.map(d => (
              <div key={d.id} className="d-flex justify-content-between border-bottom py-1 small"><span><i className={`bi ${d.mime_type?.includes('pdf') ? 'bi-file-pdf text-danger' : 'bi-file-image text-primary'} me-1`}></i>{d.file_name}</span><button className="btn btn-sm text-danger" onClick={() => deleteDoc(d.id)}><i className="bi bi-x"></i></button></div>
            ))}
            {documents.length === 0 && <p className="text-muted small mb-0">No attachments</p>}
          </div></div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered"><div className="modal-content">
            <div className="modal-header"><h6>Record Payment</h6><button className="btn-close" onClick={() => setShowPayModal(false)}></button></div>
            <div className="modal-body">
              <div className="mb-2"><label className="form-label">Amount</label><input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} /></div>
              <div className="mb-2"><label className="form-label">Method</label><select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}><option>Cash</option><option>Bank Transfer</option><option>Credit Card</option><option>Cheque</option></select></div>
              <div className="mb-2"><label className="form-label">Notes</label><input className="form-control" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button><button className="btn btn-primary" onClick={recordPayment}>Record</button></div>
          </div></div>
        </div>
      )}
    </div>
  );
}
