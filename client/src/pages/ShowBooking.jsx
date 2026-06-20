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
  const [serviceForm, setServiceForm] = useState({ service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyServiceDetails } });
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => { api.get(`/bookings/${id}`).then(res => setBooking(res.data)); api.get(`/booking-documents/${id}`).then(res => setDocuments(res.data.rows || [])); };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    api.get('/airports', { params: { limit: 1000 } }).then(res => setAirports(res.data.rows || res.data || []));
    api.get('/airlines', { params: { limit: 1000 } }).then(res => setAirlines(res.data.rows || res.data || []));
  }, []);

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

  const handlePrint = () => window.print();

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await api.post(`/booking-documents/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadFile(null);
      load();
    } catch (e) { Swal.fire('Error', 'Upload failed', 'error'); } finally { setUploading(false); }
  };

  const deleteDocument = (docId) => {
    Swal.fire({ title: 'Delete document?', icon: 'warning', showCancelButton: true }).then(r => {
      if (r.isConfirmed) api.delete(`/booking-documents/${docId}`).then(() => load());
    });
  };

  const sendWhatsApp = () => {
    const phone = (booking.customer_phone || booking.customer?.phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!phone) return Swal.fire('Warning', 'No phone number for this customer', 'warning');

    const servicesList = (booking.services || []).map(s => {
      const d = s.details || {};
      if (s.service_type === 'flight') return `✈️ ${d.airline || ''} ${d.flight_number || ''}: ${d.origin_airport || ''} → ${d.destination_airport || ''} | ${d.departure_date || ''} ${d.departure_time || ''}`;
      if (s.service_type === 'hotel') return `🏨 ${d.hotel_name || ''} | ${d.check_in || ''} - ${d.check_out || ''}`;
      if (s.service_type === 'visa') return `📄 Visa: ${d.country || ''} | Type: ${d.visa_type || ''}`;
      return `• ${s.description || ''}`;
    }).join('\n');

    const msg = encodeURIComponent(
      `*TravelBox - Booking ${booking.booking_number}*\n\n` +
      `👤 *Customer:* ${booking.customer_name || ''}\n` +
      `📅 *Travel Date:* ${booking.travel_date || 'N/A'}\n` +
      `📍 *Route:* ${booking.from_destination || ''} → ${booking.to_destination || ''}\n` +
      `💰 *Total:* ${(booking.total_amount || 0).toLocaleString()} ILS\n` +
      `💳 *Paid:* ${(booking.paid_amount || 0).toLocaleString()} ILS\n` +
      `📋 *Status:* ${booking.status || 'N/A'}\n\n` +
      `*Services:*\n${servicesList}\n\n` +
      `_Sent via TravelBox System_`
    );

      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const sendReminder = () => {
    const phone = (booking.customer_phone || booking.customer?.phone || '').replace(/[\s\-\(\)\+]/g, '');
    if (!phone) return Swal.fire('Warning', 'No phone number', 'warning');
    const msg = encodeURIComponent(
      `⏰ *Travel Reminder*\n\n` +
      `Dear ${booking.customer_name || 'Customer'},\n\n` +
      `Your trip is coming up!\n\n` +
      `📅 *Date:* ${booking.travel_date || 'N/A'}\n` +
      `✈️ *Route:* ${booking.from_destination || ''} → ${booking.to_destination || ''}\n` +
      `🔢 *Booking:* ${booking.booking_number}\n\n` +
      `Please make sure you have all necessary documents ready.\n\n` +
      `For any questions, contact us.\n` +
      `_TravelBox Team_`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const duplicateBooking = async () => {
    try {
      Swal.fire({ title: 'Duplicate booking?', text: 'This will create a copy of this booking', icon: 'question', showCancelButton: true, confirmButtonText: 'Duplicate' }).then(async r => {
        if (r.isConfirmed) {
          const payload = {
            customer_id: booking.customer_id,
            from_destination: booking.from_destination,
            to_destination: booking.to_destination,
            travel_date: booking.travel_date,
            return_date: booking.return_date,
            total_amount: booking.total_amount,
            cost_amount: booking.cost_amount,
            notes: booking.notes,
            status: 'pending',
            passengers: (booking.passengers || []).map(p => ({ name: p.full_name || p.name, passport: p.passport_number || p.passport, nationality: p.nationality, type: p.type })),
            services: (booking.services || []).map(s => ({
              service_category: s.service_category || s.service_type,
              supplier_id: s.supplier_id,
              description: s.description,
              cost: s.cost || s.amount,
              price: s.price || s.amount,
              details: s.details || {},
            })),
          };
          const res = await api.post('/bookings', payload);
          Swal.fire({ icon: 'success', title: 'Duplicated!', timer: 1000 }).then(() => navigate(`/bookings/${res.data.id}`));
        }
      });
    } catch (e) { Swal.fire('Error', 'Failed to duplicate', 'error'); }
  };

  const changeStatus = async (newStatus) => {
    try {
      await api.put(`/bookings/${id}`, { ...booking, status: newStatus });
      load();
      Swal.fire({ icon: 'success', title: 'Status updated', timer: 1000, showConfirmButton: false });
    } catch (e) { Swal.fire('Error', 'Failed to update status', 'error'); }
  };

  const statusBadge = (status) => {
    const colors = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
    const labels = { confirmed: 'Confirmed', pending: 'Pending', cancelled: 'Cancelled', completed: 'Completed' };
    return <span className={`badge bg-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>;
  };

  const openAddService = () => {
    setServiceForm({ service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyServiceDetails } });
    setShowServiceModal(true);
  };

  const handleServiceCategoryChange = (value) => {
    const updated = { ...serviceForm, service_category: value, details: { ...emptyServiceDetails } };
    if (value === 'flight') updated.description = 'Flight ticket';
    else if (value === 'hotel') updated.description = 'Hotel accommodation';
    else if (value === 'transport') updated.description = 'Transport service';
    else if (value === 'visa') updated.description = 'Visa processing';
    else if (value === 'insurance') updated.description = 'Travel insurance';
    else updated.description = '';
    setServiceForm(updated);
  };

  const handleServiceDetail = (field, value) => {
    setServiceForm({ ...serviceForm, details: { ...serviceForm.details, [field]: value } });
  };

  const addService = async () => {
    if (!serviceForm.service_category) { Swal.fire('Warning', 'Select a service category', 'warning'); return; }
    setSubmitting(true);
    try {
      await api.post(`/bookings/${id}/services`, {
        service_type: serviceForm.service_category,
        supplier_id: serviceForm.supplier_id || null,
        description: serviceForm.description || null,
        amount: serviceForm.price ? parseFloat(serviceForm.price) : 0,
        details: serviceForm.details,
      });
      setShowServiceModal(false);
      Swal.fire({ icon: 'success', title: 'Service added', timer: 1500, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to add service', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteService = async (serviceId) => {
    Swal.fire({ title: 'Delete service?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel' }).then(r => {
      if (r.isConfirmed) api.delete(`/bookings/services/${serviceId}`).then(() => load());
    });
  };

  if (!booking) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const remaining = (booking.total_amount || 0) - (booking.paid_amount || 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Booking #{booking.booking_number}</h5>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{ width: '140px' }} value={booking.status} onChange={e => changeStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-outline-success me-2" onClick={sendWhatsApp} title="Send via WhatsApp"><i className="bi bi-whatsapp"></i> WhatsApp</button>
          <button className="btn btn-outline-warning me-2" onClick={sendReminder} title="Send travel reminder"><i className="bi bi-bell"></i> Reminder</button>
          <button className="btn btn-outline-info me-2" onClick={duplicateBooking}><i className="bi bi-copy"></i> Duplicate</button>
          <button className="btn btn-outline-primary me-2" onClick={handlePrint}><i className="bi bi-printer"></i> Print</button>
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
                  <small className="text-secondary">Status</small>
                  <p className="mb-0">{statusBadge(booking.status)}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">From - To</small>
                  <p className="mb-0">{booking.from_destination && booking.to_destination ? `${booking.from_destination} → ${booking.to_destination}` : '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Travel Date</small>
                  <p className="mb-0">{booking.travel_date ? new Date(booking.travel_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">Return Date</small>
                  <p className="mb-0">{booking.return_date ? new Date(booking.return_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</p>
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
                    <strong>{p.full_name || p.name}</strong>
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
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Services ({booking.services?.length || 0})</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={openAddService}><i className="bi bi-plus"></i> Add Service</button>
              </div>
              {booking.services?.length === 0 && <p className="text-secondary mb-0">No services</p>}
              {booking.services?.map((s, i) => {
                const d = s.details || {};
                return (
                <div key={s.id || i} className="border-bottom py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{s.description}</strong>
                      {s.supplier_name && <><br /><small className="text-secondary">Supplier: {s.supplier_name}</small></>}
                    </div>
                    <div className="text-end d-flex align-items-center gap-2">
                      <div>
                        {s.cost > 0 && <div><small className="text-danger">Cost: {s.cost?.toLocaleString()}</small></div>}
                        {s.price > 0 && <div><small className="text-success">Price: {s.price?.toLocaleString()}</small></div>}
                      </div>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteService(s.id)}><i className="bi bi-x"></i></button>
                    </div>
                  </div>
                  {s.service_type === 'flight' && d.origin_airport && (
                    <div className="mt-1">
                      <small className="text-muted d-block"><strong>{d.airline}</strong>{d.flight_number ? ` • ${d.flight_number}` : ''} {d.ticket_number ? ` • Ticket: ${d.ticket_number}` : ''}</small>
                      <small className="text-muted d-block">Departure: {d.departure_date || ''} {d.departure_time ? `${d.departure_time}${d.departure_next_day ? '+1' : ''}` : ''}  {d.origin_airport}</small>
                      <small className="text-muted d-block">Arrival:   {d.arrival_date || ''} {d.arrival_time ? `${d.arrival_time}${d.arrival_next_day ? '+1' : ''}` : ''}  {d.destination_airport}</small>
                      {(d.checked_baggage || d.cabin_baggage) && <small className="text-muted d-block">Baggage: {d.checked_baggage ? `Checked: ${d.checked_baggage}kg` : ''}{d.checked_baggage && d.cabin_baggage ? ' | ' : ''}{d.cabin_baggage ? `Cabin: ${d.cabin_baggage}kg` : ''}</small>}
                    </div>
                  )}
                  {s.service_type === 'hotel' && d.hotel_name && (
                    <div><small className="text-muted">{d.hotel_name}{d.room_type ? ` • ${d.room_type}` : ''}{d.check_in ? ` • ${new Date(d.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}{d.check_out ? ` - ${new Date(d.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small></div>
                  )}
                  {s.service_type === 'transport' && d.pickup_location && (
                    <div><small className="text-muted">{d.transport_type ? `${d.transport_type}: ` : ''}{d.pickup_location} → {d.dropoff_location}{d.pickup_time ? ` • ${new Date(d.pickup_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}</small></div>
                  )}
                  {s.service_type === 'visa' && d.country && (
                    <div><small className="text-muted">{d.country}{d.visa_type ? ` • ${d.visa_type}` : ''}{d.processing_time ? ` • ${d.processing_time}` : ''}</small></div>
                  )}
                  {s.service_type === 'insurance' && d.policy_number && (
                    <div><small className="text-muted">Policy: {d.policy_number}{d.coverage_type ? ` • ${d.coverage_type}` : ''}{d.start_date ? ` • ${new Date(d.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}{d.end_date ? ` - ${new Date(d.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</small></div>
                  )}
                </div>
                );
              })}
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

      {/* Documents */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0"><i className="bi bi-paperclip me-2"></i>Documents ({documents.length})</h6>
          </div>
          <div className="input-group mb-2">
            <input type="file" className="form-control form-control-sm" onChange={e => setUploadFile(e.target.files[0])} />
            <button className="btn btn-sm btn-outline-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-upload me-1"></i>} Upload
            </button>
          </div>
          {documents.length === 0 && <p className="text-muted small mb-0">Attach tickets, vouchers, passports, invoices...</p>}
          {documents.map(d => (
            <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-1 small">
              <div>
                <i className={`bi ${d.mime_type?.includes('pdf') ? 'bi-file-pdf text-danger' : d.mime_type?.includes('image') ? 'bi-file-image text-primary' : 'bi-file-earmark text-secondary'} me-1`}></i>
                <a href={`/uploads/booking-docs/${d.file_name}`} target="_blank" className="text-decoration-none">{d.file_name}</a>
                <span className="text-muted ms-2">{(d.file_size / 1024).toFixed(0)} KB</span>
              </div>
              <button className="btn btn-sm text-danger" onClick={() => deleteDocument(d.id)}><i className="bi bi-x-lg"></i></button>
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

      {showServiceModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">Add Service</h6><button className="btn-close" onClick={() => setShowServiceModal(false)}></button></div>
              <div className="modal-body">
                <div className="row g-2 mb-2">
                  <div className="col-md-3">
                    <label className="form-label">Category <span className="text-danger">*</span></label>
                    <select className="form-select" value={serviceForm.service_category} onChange={e => handleServiceCategoryChange(e.target.value)}>
                      <option value="">Select category...</option>
                      <option value="flight">Flight</option>
                      <option value="hotel">Hotel</option>
                      <option value="transport">Transport</option>
                      <option value="visa">Visa</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {serviceForm.service_category === 'other' && (
                    <div className="col-md-9">
                      <label className="form-label">Description</label>
                      <input type="text" className="form-control" placeholder="Service description" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
                    </div>
                  )}
                </div>

                {serviceForm.service_category === 'flight' && (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Airline</label>
                        <select className="form-select" value={serviceForm.details.airline_id} onChange={e => {
                          const opt = airlines.find(a => a.id == e.target.value);
                          handleServiceDetail('airline_id', e.target.value);
                          handleServiceDetail('airline', opt ? opt.name : '');
                        }}>
                          <option value="">Select airline...</option>
                          {airlines.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Flight #</label>
                        <input type="text" className="form-control" value={serviceForm.details.flight_number} onChange={e => handleServiceDetail('flight_number', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">From Airport</label>
                        <select className="form-select" value={serviceForm.details.origin_airport_id} onChange={e => {
                          const opt = airports.find(a => a.id == e.target.value);
                          handleServiceDetail('origin_airport_id', e.target.value);
                          handleServiceDetail('origin_airport', opt ? `${opt.code} - ${opt.name}` : '');
                        }}>
                          <option value="">Select...</option>
                          {airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">To Airport</label>
                        <select className="form-select" value={serviceForm.details.destination_airport_id} onChange={e => {
                          const opt = airports.find(a => a.id == e.target.value);
                          handleServiceDetail('destination_airport_id', e.target.value);
                          handleServiceDetail('destination_airport', opt ? `${opt.code} - ${opt.name}` : '');
                        }}>
                          <option value="">Select...</option>
                          {airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-1">
                        <label className="form-label small">Ticket #</label>
                        <input type="text" className="form-control" value={serviceForm.details.ticket_number} onChange={e => handleServiceDetail('ticket_number', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Supplier</label>
                        <input type="text" className="form-control" value={serviceForm.supplier_id} onChange={e => setServiceForm({ ...serviceForm, supplier_id: e.target.value })} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-2">
                        <label className="form-label small">Dep. Date</label>
                        <input type="date" className="form-control" value={serviceForm.details.departure_date} onChange={e => handleServiceDetail('departure_date', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Dep. Time</label>
                        <input type="time" className="form-control" value={serviceForm.details.departure_time} onChange={e => handleServiceDetail('departure_time', e.target.value)} />
                      </div>
                      <div className="col-md-1 d-flex align-items-end pb-1">
                        <label className="form-check-label small"><input type="checkbox" className="form-check-input me-1" checked={serviceForm.details.departure_next_day} onChange={e => handleServiceDetail('departure_next_day', e.target.checked)} />+1</label>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Arr. Date</label>
                        <input type="date" className="form-control" value={serviceForm.details.arrival_date} onChange={e => handleServiceDetail('arrival_date', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Arr. Time</label>
                        <input type="time" className="form-control" value={serviceForm.details.arrival_time} onChange={e => handleServiceDetail('arrival_time', e.target.value)} />
                      </div>
                      <div className="col-md-1 d-flex align-items-end pb-1">
                        <label className="form-check-label small"><input type="checkbox" className="form-check-input me-1" checked={serviceForm.details.arrival_next_day} onChange={e => handleServiceDetail('arrival_next_day', e.target.checked)} />+1</label>
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-2">
                        <label className="form-label small">Checked (kg)</label>
                        <input type="number" className="form-control" placeholder="23" value={serviceForm.details.checked_baggage} onChange={e => handleServiceDetail('checked_baggage', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cabin (kg)</label>
                        <input type="number" className="form-control" placeholder="7" value={serviceForm.details.cabin_baggage} onChange={e => handleServiceDetail('cabin_baggage', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cost</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Price</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                {serviceForm.service_category === 'hotel' && (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Hotel Name</label>
                        <input type="text" className="form-control" value={serviceForm.details.hotel_name} onChange={e => handleServiceDetail('hotel_name', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Room Type</label>
                        <input type="text" className="form-control" value={serviceForm.details.room_type} onChange={e => handleServiceDetail('room_type', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Board Basis</label>
                        <select className="form-select" value={serviceForm.details.board_basis} onChange={e => handleServiceDetail('board_basis', e.target.value)}>
                          <option value="">Select...</option>
                          <option value="room_only">Room Only</option>
                          <option value="breakfast">Breakfast</option>
                          <option value="half_board">Half Board</option>
                          <option value="full_board">Full Board</option>
                          <option value="all_inclusive">All Inclusive</option>
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Check In</label>
                        <input type="date" className="form-control" value={serviceForm.details.check_in} onChange={e => handleServiceDetail('check_in', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Check Out</label>
                        <input type="date" className="form-control" value={serviceForm.details.check_out} onChange={e => handleServiceDetail('check_out', e.target.value)} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Supplier</label>
                        <input type="text" className="form-control" value={serviceForm.supplier_id} onChange={e => setServiceForm({ ...serviceForm, supplier_id: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cost</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Price</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                {serviceForm.service_category === 'transport' && (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-2">
                        <label className="form-label small">Type</label>
                        <select className="form-select" value={serviceForm.details.transport_type} onChange={e => handleServiceDetail('transport_type', e.target.value)}>
                          <option value="">Select...</option>
                          <option value="car">Car</option>
                          <option value="bus">Bus</option>
                          <option value="van">Van</option>
                          <option value="limo">Limousine</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small">Pickup</label>
                        <input type="text" className="form-control" value={serviceForm.details.pickup_location} onChange={e => handleServiceDetail('pickup_location', e.target.value)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small">Dropoff</label>
                        <input type="text" className="form-control" value={serviceForm.details.dropoff_location} onChange={e => handleServiceDetail('dropoff_location', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Pickup Time</label>
                        <input type="datetime-local" className="form-control" value={serviceForm.details.pickup_time} onChange={e => handleServiceDetail('pickup_time', e.target.value)} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Supplier</label>
                        <input type="text" className="form-control" value={serviceForm.supplier_id} onChange={e => setServiceForm({ ...serviceForm, supplier_id: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cost</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Price</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                {serviceForm.service_category === 'visa' && (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Country</label>
                        <input type="text" className="form-control" value={serviceForm.details.country} onChange={e => handleServiceDetail('country', e.target.value)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small">Visa Type</label>
                        <select className="form-select" value={serviceForm.details.visa_type} onChange={e => handleServiceDetail('visa_type', e.target.value)}>
                          <option value="">Select...</option>
                          <option value="tourist">Tourist</option>
                          <option value="business">Business</option>
                          <option value="transit">Transit</option>
                          <option value="student">Student</option>
                          <option value="work">Work</option>
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Processing</label>
                        <input type="text" className="form-control" value={serviceForm.details.processing_time} onChange={e => handleServiceDetail('processing_time', e.target.value)} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Supplier</label>
                        <input type="text" className="form-control" value={serviceForm.supplier_id} onChange={e => setServiceForm({ ...serviceForm, supplier_id: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cost</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Price</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}

                {serviceForm.service_category === 'insurance' && (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Policy #</label>
                        <input type="text" className="form-control" value={serviceForm.details.policy_number} onChange={e => handleServiceDetail('policy_number', e.target.value)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small">Coverage</label>
                        <input type="text" className="form-control" value={serviceForm.details.coverage_type} onChange={e => handleServiceDetail('coverage_type', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Start</label>
                        <input type="date" className="form-control" value={serviceForm.details.start_date} onChange={e => handleServiceDetail('start_date', e.target.value)} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">End</label>
                        <input type="date" className="form-control" value={serviceForm.details.end_date} onChange={e => handleServiceDetail('end_date', e.target.value)} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3">
                        <label className="form-label small">Supplier</label>
                        <input type="text" className="form-control" value={serviceForm.supplier_id} onChange={e => setServiceForm({ ...serviceForm, supplier_id: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Cost</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.cost} onChange={e => setServiceForm({ ...serviceForm, cost: e.target.value })} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small">Price</label>
                        <input type="number" step="0.01" className="form-control" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowServiceModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addService} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
