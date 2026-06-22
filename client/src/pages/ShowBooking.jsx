import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const emptyDetails = {
  airline: '', airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '', origin_airport: '', destination_airport: '', departure_date: '', departure_time: '', departure_next_day: false, arrival_date: '', arrival_time: '', arrival_next_day: false, ticket_number: '', checked_baggage: '', cabin_baggage: '',
  hotel_name: '', room_type: '', board_basis: '', check_in: '', check_out: '',
  transport_type: '', pickup_location: '', dropoff_location: '', pickup_time: '',
  country: '', visa_type: '', processing_time: '',
  policy_number: '', coverage_type: '', start_date: '', end_date: '',
};

const serviceLabel = (cat) => ({ flight: 'Flight', hotel: 'Hotel', transport: 'Transport', visa: 'Visa', insurance: 'Insurance', other: 'Other' }[cat] || '');

export default function ShowBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'Cash', notes: '' });
  const [documents, setDocuments] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingNumber, setBookingNumber] = useState('');
  const [fromDest, setFromDest] = useState('');
  const [toDest, setToDest] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [passengers, setPassengers] = useState([]);
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);

  const load = async () => {
    const res = await api.get(`/bookings/${id}`);
    const b = res.data;
    setCustomerId(b.customer_id || '');
    setCustomerName(b.customer_name || '');
    setCustomerPhone(b.customer_phone || '');
    setBookingNumber(b.booking_number || '');
    setFromDest(b.from_destination || '');
    setToDest(b.to_destination || '');
    setTravelDate(b.travel_date || '');
    setReturnDate(b.return_date || '');
    setStatus(b.status || 'pending');
    setNotes(b.notes || '');
    setPassengers((b.passengers || []).map(p => ({ id: p.id, name: p.full_name || '', passport: p.passport_number || p.passport || '', nationality: p.nationality || '', dob: p.date_of_birth || '' })));
    setServices((b.services || []).map(s => ({
      id: s.id, service_category: s.service_type || s.service_category || '',
      supplier_id: s.supplier_id || '', description: s.description || '',
      cost: s.cost || '', price: s.amount || s.price || '',
      currency: s.currency || 'ILS',
      details: s.details && typeof s.details === 'object' ? { ...emptyDetails, ...s.details } : { ...emptyDetails },
    })));
    setPayments(b.payments || []);
  };

  useEffect(() => { load(); api.get('/airports?limit=1000').then(r => setAirports(r.data.rows || [])); api.get('/airlines?limit=1000').then(r => setAirlines(r.data.rows || [])); api.get('/suppliers?limit=1000').then(r => setSuppliers(r.data.rows || r.data || [])); }, [id]);

  const paxUpd = (i, field, v) => { const u = [...passengers]; u[i][field] = v; setPassengers(u); };
  const svcUpd = (i, field, v) => { const u = [...services]; u[i][field] = v; if (field === 'service_category') { u[i].details = { ...emptyDetails }; u[i].description = serviceLabel(v); } setServices(u); };
  const svcDtl = (i, field, v) => { const u = [...services]; u[i].details = { ...u[i].details, [field]: v }; setServices(u); };

  const recordPayment = async () => {
    if (!payForm.amount) return;
    await api.post('/payments', { booking_id: +id, amount: +payForm.amount, payment_method: payForm.payment_method, notes: payForm.notes });
    setShowPayModal(false); setPayForm({ amount: '', payment_method: 'Cash', notes: '' });
    load();
  };

  const deleteService = (sid) => Swal.fire({ title: 'Delete this service?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/bookings/services/${sid}`).then(() => load()); });

  const saveAll = async () => {
    setSaving(true);
    try {
      const activeSvcs = services.filter(s => s.service_category);
      const activePax = passengers.filter(p => p.name.trim());
      const totalAmount = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      const costAmount = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
      await api.put(`/bookings/${id}`, {
        customer_id: customerId, status, from_destination: fromDest, to_destination: toDest,
        travel_date: travelDate, return_date: returnDate, notes,
        total_amount: totalAmount, cost_amount: costAmount,
        passengers: activePax.map(p => ({ id: p.id, name: p.name, passport: p.passport, nationality: p.nationality, dob: p.dob })),
        services: activeSvcs.map(s => ({ id: s.id, service_category: s.service_category, supplier_id: s.supplier_id || null, description: s.description, cost: parseFloat(s.cost) || null, price: parseFloat(s.price) || null, currency: s.currency || 'ILS', details: s.details })),
      });
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = () => Swal.fire({ title: 'Delete this booking?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => navigate('/bookings')); });

  const totalAmount = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const totalCost = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
  const profit = totalAmount - totalCost;
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = totalAmount - totalPaid;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div className="d-flex align-items-center gap-2">
          <h5 className="page-title mb-0">Booking #{bookingNumber}</h5>
          <select className="form-select form-select-sm" style={{ width: 130 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
          </select>
          <span className={`badge bg-${status === 'confirmed' ? 'success' : status === 'cancelled' ? 'danger' : status === 'completed' ? 'info' : 'warning'} fs-6`}>{status}</span>
        </div>
        <div className="d-flex gap-1 flex-wrap">
          <button className="btn btn-sm btn-outline-success" onClick={() => { const phone = customerPhone.replace(/[\s\-\(\)\+]/g, ''); if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`*TravelBox - ${bookingNumber}*\n${customerName}\n📅 ${travelDate}\n💰 ${totalAmount.toLocaleString()} ILS`)}`, '_blank'); }} title="WhatsApp"><i className="bi bi-whatsapp"></i></button>
          <button className="btn btn-sm btn-outline-info" onClick={() => window.print()} title="Print"><i className="bi bi-printer"></i></button>
          <button className="btn btn-sm btn-success" onClick={() => setShowPayModal(true)}><i className="bi bi-cash"></i> Payment</button>
          <button className="btn btn-sm btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg"></i> Save</>}
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}><i className="bi bi-trash"></i></button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/bookings')}>Back</button>
        </div>
      </div>

      {/* Customer & Trip */}
      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="card"><div className="card-body">
            <h6 className="text-primary mb-3"><i className="bi bi-person me-2"></i>Customer & Trip</h6>
            <div className="row g-2">
              <div className="col-6"><small className="text-muted">Customer</small><p className="fw-semibold mb-0">{customerName}</p></div>
              <div className="col-6"><small className="text-muted">Phone</small><p className="mb-0">{customerPhone || '-'}</p></div>
              <div className="col-4"><small className="text-muted">From</small><input className="form-control form-control-sm" value={fromDest} onChange={e => setFromDest(e.target.value)} /></div>
              <div className="col-4"><small className="text-muted">To</small><input className="form-control form-control-sm" value={toDest} onChange={e => setToDest(e.target.value)} /></div>
              <div className="col-2"><small className="text-muted">Travel Date</small><input type="date" className="form-control form-control-sm" value={travelDate ? travelDate.split('T')[0] : ''} onChange={e => setTravelDate(e.target.value)} /></div>
              <div className="col-2"><small className="text-muted">Return</small><input type="date" className="form-control form-control-sm" value={returnDate ? returnDate.split('T')[0] : ''} onChange={e => setReturnDate(e.target.value)} /></div>
            </div>
            <div className="mt-2 pt-2 border-top"><small className="text-muted">Notes</small><textarea className="form-control form-control-sm mt-1" rows="1" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card bg-light"><div className="card-body text-center">
            <small className="text-muted">Total</small><h3 className="text-primary mb-1">{totalAmount.toLocaleString()} ILS</h3>
            <div className="d-flex justify-content-around mt-2 pt-2 border-top">
              <div><small className="text-muted">Paid</small><h5 className="text-success mb-0">{totalPaid.toLocaleString()}</h5></div>
              <div><small className="text-muted">Due</small><h5 className={`mb-0 ${remaining > 0 ? 'text-danger' : 'text-success'}`}>{remaining.toLocaleString()}</h5></div>
            </div>
            {totalCost > 0 && <><div className="mt-2 pt-2 border-top"><small className="text-muted">Cost</small><h5 className="mb-0">{totalCost.toLocaleString()}</h5></div><div><small className="text-muted">Profit</small><h5 className={`mb-0 ${profit >= 0 ? 'text-success' : 'text-danger'}`}>{profit.toLocaleString()}</h5></div></>}
          </div></div>
        </div>
      </div>

      {/* Passengers */}
      <div className="card mb-3 border-info border-top border-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-info mb-0"><i className="bi bi-people me-2"></i>Passengers ({passengers.length})</h6>
            <button className="btn btn-sm btn-outline-info" onClick={() => setPassengers([...passengers, { id: null, name: '', passport: '', nationality: '', dob: '' }])}><i className="bi bi-plus"></i> Add</button>
          </div>
          {passengers.length === 0 && <p className="text-muted small">No passengers</p>}
          {passengers.map((p, i) => (
            <div key={i} className="row g-2 mb-2 align-items-center">
              <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Full name" value={p.name} onChange={e => paxUpd(i, 'name', e.target.value)} /></div>
              <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={p.dob} onChange={e => paxUpd(i, 'dob', e.target.value)} /></div>
              <div className="col-md-2">
                <span className="form-control form-control-sm bg-light text-muted">
                  {!p.dob ? '-' : (Math.floor((new Date() - new Date(p.dob)) / (365.25 * 24 * 60 * 60 * 1000)) < 2 ? 'Infant' : Math.floor((new Date() - new Date(p.dob)) / (365.25 * 24 * 60 * 60 * 1000)) < 12 ? 'Child' : 'Adult')}
                </span>
              </div>
              <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Passport" value={p.passport} onChange={e => paxUpd(i, 'passport', e.target.value)} /></div>
              <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Nationality" value={p.nationality} onChange={e => paxUpd(i, 'nationality', e.target.value)} /></div>
              <div className="col-md-1">
                <button className="btn btn-sm btn-outline-danger" onClick={() => setPassengers(passengers.filter((_, j) => j !== i))}><i className="bi bi-x"></i></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="card mb-3 border-success border-top border-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-success mb-0"><i className="bi bi-bag-check me-2"></i>Services ({services.filter(s => s.service_category).length})</h6>
            <button className="btn btn-sm btn-outline-success" onClick={() => setServices([...services, { id: null, service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyDetails } }])}><i className="bi bi-plus"></i> Add</button>
          </div>

          {services.map((s, i) => {
            const cat = s.service_category;
            return (
              <div key={i} className={`border rounded p-2 mb-2 ${cat ? `border-${({flight:'primary',hotel:'success',transport:'warning',visa:'info',insurance:'danger',other:'secondary'})[cat] || 'secondary'}` : ''}`}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex gap-2 align-items-center">
                    {cat && <span className={`badge bg-${({flight:'primary',hotel:'success',transport:'warning',visa:'info',insurance:'danger',other:'secondary'})[cat]} small`}>{serviceLabel(cat)}</span>}
                    <select className="form-select form-select-sm" style={{ width: 140 }} value={cat} onChange={e => svcUpd(i, 'service_category', e.target.value)}>
                      <option value="">Service type...</option>
                      <option value="flight">Flight</option><option value="hotel">Hotel</option><option value="transport">Transport</option>
                      <option value="visa">Visa</option><option value="insurance">Insurance</option><option value="other">Other</option>
                    </select>
                  </div>
                  {services.length > 1 && <button className="btn btn-sm text-danger" onClick={() => s.id ? deleteService(s.id) : setServices(services.filter((_, j) => j !== i))}><i className="bi bi-x-lg"></i></button>}
                </div>

                {cat === 'flight' && (
                  <div className="bg-white rounded p-2">
                    <div className="row g-1">
                      <div className="col-md-3"><select className="form-select form-select-sm" value={s.details.airline_id} onChange={e => { const a = airlines.find(x => x.id == e.target.value); svcDtl(i, 'airline_id', e.target.value); svcDtl(i, 'airline', a ? a.name : ''); }}><option value="">Airline</option>{airlines.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                      <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Flight #" value={s.details.flight_number} onChange={e => svcDtl(i, 'flight_number', e.target.value)} /></div>
                      <div className="col-md-3"><select className="form-select form-select-sm" value={s.details.origin_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); svcDtl(i, 'origin_airport_id', e.target.value); svcDtl(i, 'origin_airport', a ? `${a.code} - ${a.name}` : ''); }}><option value="">From</option>{airports.map(a => <option key={a.id} value={a.id}>{a.code}</option>)}</select></div>
                      <div className="col-md-3"><select className="form-select form-select-sm" value={s.details.destination_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); svcDtl(i, 'destination_airport_id', e.target.value); svcDtl(i, 'destination_airport', a ? `${a.code} - ${a.name}` : ''); }}><option value="">To</option>{airports.map(a => <option key={a.id} value={a.id}>{a.code}</option>)}</select></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.departure_date} onChange={e => svcDtl(i, 'departure_date', e.target.value)} /></div>
                      <div className="col-md-2"><input type="time" className="form-control form-control-sm" value={s.details.departure_time} onChange={e => svcDtl(i, 'departure_time', e.target.value)} /></div>
                      <div className="col-md-1 d-flex align-items-end pb-1"><label className="form-check-label small"><input type="checkbox" className="form-check-input" checked={s.details.departure_next_day} onChange={e => svcDtl(i, 'departure_next_day', e.target.checked)} />+1</label></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.arrival_date} onChange={e => svcDtl(i, 'arrival_date', e.target.value)} /></div>
                      <div className="col-md-2"><input type="time" className="form-control form-control-sm" value={s.details.arrival_time} onChange={e => svcDtl(i, 'arrival_time', e.target.value)} /></div>
                      <div className="col-md-1 d-flex align-items-end pb-1"><label className="form-check-label small"><input type="checkbox" className="form-check-input" checked={s.details.arrival_next_day} onChange={e => svcDtl(i, 'arrival_next_day', e.target.checked)} />+1</label></div>
                      <div className="col-md-2"><input type="number" className="form-control form-control-sm" placeholder="Bag kg" value={s.details.checked_baggage} onChange={e => svcDtl(i, 'checked_baggage', e.target.value)} /></div>
                      <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Ticket #" value={s.details.ticket_number} onChange={e => svcDtl(i, 'ticket_number', e.target.value)} /></div>
                    </div>
                  </div>
                )}
                {cat === 'hotel' && (
                  <div className="bg-white rounded p-2">
                    <div className="row g-1">
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Hotel name" value={s.details.hotel_name} onChange={e => svcDtl(i, 'hotel_name', e.target.value)} /></div>
                      <div className="col-md-2"><input className="form-control form-control-sm" placeholder="Room type" value={s.details.room_type} onChange={e => svcDtl(i, 'room_type', e.target.value)} /></div>
                      <div className="col-md-2"><select className="form-select form-select-sm" value={s.details.board_basis} onChange={e => svcDtl(i, 'board_basis', e.target.value)}><option value="">Board</option><option value="room_only">Room Only</option><option value="breakfast">Breakfast</option><option value="half_board">Half Board</option><option value="full_board">Full Board</option><option value="all_inclusive">All Inclusive</option></select></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.check_in} onChange={e => svcDtl(i, 'check_in', e.target.value)} /></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.check_out} onChange={e => svcDtl(i, 'check_out', e.target.value)} /></div>
                    </div>
                  </div>
                )}
                {cat === 'transport' && (
                  <div className="bg-white rounded p-2">
                    <div className="row g-1">
                      <div className="col-md-2"><select className="form-select form-select-sm" value={s.details.transport_type} onChange={e => svcDtl(i, 'transport_type', e.target.value)}><option value="">Type</option><option value="car">Car</option><option value="bus">Bus</option><option value="van">Van</option><option value="limo">Limousine</option></select></div>
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Pickup" value={s.details.pickup_location} onChange={e => svcDtl(i, 'pickup_location', e.target.value)} /></div>
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Dropoff" value={s.details.dropoff_location} onChange={e => svcDtl(i, 'dropoff_location', e.target.value)} /></div>
                      <div className="col-md-3"><input type="datetime-local" className="form-control form-control-sm" value={s.details.pickup_time} onChange={e => svcDtl(i, 'pickup_time', e.target.value)} /></div>
                    </div>
                  </div>
                )}
                {cat === 'visa' && (
                  <div className="bg-white rounded p-2">
                    <div className="row g-1">
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Country" value={s.details.country} onChange={e => svcDtl(i, 'country', e.target.value)} /></div>
                      <div className="col-md-3"><select className="form-select form-select-sm" value={s.details.visa_type} onChange={e => svcDtl(i, 'visa_type', e.target.value)}><option value="">Type</option><option value="tourist">Tourist</option><option value="business">Business</option><option value="transit">Transit</option></select></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.applicationDate || ''} onChange={e => svcDtl(i, 'applicationDate', e.target.value)} /></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.expiryDate || ''} onChange={e => svcDtl(i, 'expiryDate', e.target.value)} /></div>
                    </div>
                  </div>
                )}
                {cat === 'insurance' && (
                  <div className="bg-white rounded p-2">
                    <div className="row g-1">
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Policy #" value={s.details.policy_number} onChange={e => svcDtl(i, 'policy_number', e.target.value)} /></div>
                      <div className="col-md-3"><input className="form-control form-control-sm" placeholder="Coverage" value={s.details.coverage_type} onChange={e => svcDtl(i, 'coverage_type', e.target.value)} /></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.start_date} onChange={e => svcDtl(i, 'start_date', e.target.value)} /></div>
                      <div className="col-md-2"><input type="date" className="form-control form-control-sm" value={s.details.end_date} onChange={e => svcDtl(i, 'end_date', e.target.value)} /></div>
                    </div>
                  </div>
                )}
                {cat === 'other' && (
                  <div className="bg-white rounded p-2">
                    <input className="form-control form-control-sm" placeholder="Description" value={s.description} onChange={e => svcUpd(i, 'description', e.target.value)} />
                  </div>
                )}

                {cat && (
                  <div className="row g-1 mt-1">
                    <div className="col-md-3"><select className="form-select form-select-sm" value={s.supplier_id} onChange={e => svcUpd(i, 'supplier_id', e.target.value)}><option value="">Supplier</option>{suppliers.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}</select></div>
                    <div className="col-md-2"><input type="number" step="0.01" className="form-control form-control-sm" placeholder="Cost" value={s.cost} onChange={e => svcUpd(i, 'cost', e.target.value)} /></div>
                    <div className="col-md-2"><input type="number" step="0.01" className="form-control form-control-sm" placeholder="Price" value={s.price} onChange={e => svcUpd(i, 'price', e.target.value)} /></div>
                    {parseFloat(s.price) > 0 && <div className="col-md-2 d-flex align-items-center"><span className="text-success small fw-bold">{(Number(s.price) || 0).toLocaleString()} ILS</span></div>}
                  </div>
                )}
              </div>
            );
          })}

          {totalAmount > 0 && (
            <div className="bg-light rounded p-2 mt-2 border">
              <div className="row text-center">
                <div className="col"><small className="text-muted">Cost</small><br /><strong className="text-danger">{totalCost.toLocaleString()}</strong></div>
                <div className="col"><small className="text-muted">Price</small><br /><strong className="text-primary">{totalAmount.toLocaleString()}</strong></div>
                <div className="col"><small className="text-muted">Profit</small><br /><strong className={profit >= 0 ? 'text-success' : 'text-danger'}>{profit.toLocaleString()}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payments & Documents */}
      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card"><div className="card-body">
            <h6 className="mb-2"><i className="bi bi-cash-stack me-2 text-success"></i>Payments ({payments.length})</h6>
            {payments.length === 0 && <p className="text-muted small mb-0">No payments</p>}
            {payments.map(p => (
              <div key={p.id} className="d-flex justify-content-between border-bottom py-1 small"><span>{p.payment_method} {p.notes}</span><span className="text-success fw-bold">{p.amount?.toLocaleString()} ILS</span></div>
            ))}
          </div></div>
        </div>
        <div className="col-md-6">
          <div className="card"><div className="card-body">
            <h6 className="mb-2"><i className="bi bi-paperclip me-2"></i>Documents ({documents.length})</h6>
            <div className="input-group input-group-sm mb-2"><input type="file" className="form-control" onChange={e => setUploadFile(e.target.files[0])} /><button className="btn btn-outline-primary" onClick={async () => { if (!uploadFile) return; const fd = new FormData(); fd.append('file', uploadFile); await api.post(`/booking-documents/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setUploadFile(null); load(); }}>Upload</button></div>
            {documents.map(d => (
              <div key={d.id} className="d-flex justify-content-between border-bottom py-1 small"><span><i className={`bi ${d.mime_type?.includes('pdf') ? 'bi-file-pdf text-danger' : 'bi-file-image text-primary'} me-1`}></i>{d.file_name}</span><button className="btn btn-sm text-danger" onClick={() => Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then(r => { if (r.isConfirmed) api.delete(`/booking-documents/${d.id}`).then(() => load()); })}><i className="bi bi-x"></i></button></div>
            ))}
          </div></div>
        </div>
      </div>

      {/* Payment Modal */}
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
