import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const emptyDetails = {
  airline: '', airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '', origin_airport: '', destination_airport: '', departure_date: '', departure_time: '', departure_next_day: false, arrival_date: '', arrival_time: '', arrival_next_day: false, ticket_number: '', checked_baggage: '', cabin_baggage: '',
  hotel_name: '', room_type: '', board_basis: '', check_in: '', check_out: '',
  transport_type: '', pickup_location: '', dropoff_location: '', pickup_time: '',
  country: '', visa_type: '', processing_time: '',
  policy_number: '', coverage_type: '', start_date: '', end_date: '',
};

const serviceLabel = (cat) => ({ flight: 'Flight', hotel: 'Hotel', transport: 'Transport', visa: 'Visa', insurance: 'Insurance', other: 'Other' }[cat] || '');
const serviceIcon = (cat) => ({ flight: 'bi-airplane', hotel: 'bi-building', transport: 'bi-car-front', visa: 'bi-file-earmark-text', insurance: 'bi-shield-check', other: 'bi-three-dots' }[cat] || 'bi-circle');
const serviceColor = (cat) => ({ flight: 'primary', hotel: 'success', transport: 'warning', visa: 'info', insurance: 'danger', other: 'secondary' }[cat] || 'secondary');

export default function CreateBooking() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({ full_name: '', phone: '', email: '' });
  const [notes, setNotes] = useState('');
  const [passengers, setPassengers] = useState([{ name: '', passport: '', nationality: '', type: 'adult' }]);
  const [services, setServices] = useState([{ service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyDetails } }]);

  useEffect(() => {
    api.get('/customers', { params: { limit: 1000 } }).then(res => setCustomers(res.data.rows));
    api.get('/airports', { params: { limit: 1000 } }).then(res => setAirports(res.data.rows || res.data || []));
    api.get('/airlines', { params: { limit: 1000 } }).then(res => setAirlines(res.data.rows || res.data || []));
    api.get('/suppliers', { params: { limit: 1000 } }).then(res => setSuppliers(res.data.rows || res.data || []));
  }, []);

  const pax = (i, field, value) => { const u = [...passengers]; u[i][field] = value; setPassengers(u); };
  const svc = (i, field, value) => { const u = [...services]; u[i][field] = value; if (field === 'service_category') { u[i].details = { ...emptyDetails }; u[i].description = serviceLabel(value); } setServices(u); };
  const dtl = (i, field, value) => { const u = [...services]; u[i].details = { ...u[i].details, [field]: value }; setServices(u); };

  const quickAddCustomer = async () => {
    if (!quickForm.full_name) return Swal.fire('Required', 'Enter customer name', 'warning');
    try {
      const res = await api.post('/customers', quickForm);
      setCustomerId(res.data.id); setCustomerSearch(quickForm.full_name); setShowQuickAdd(false);
      setQuickForm({ full_name: '', phone: '', email: '' });
      api.get('/customers', { params: { limit: 1000 } }).then(r => setCustomers(r.data.rows));
      Swal.fire({ icon: 'success', title: 'Customer added', timer: 1200, showConfirmButton: false });
    } catch (e) { Swal.fire('Error', 'Failed', 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) { Swal.fire('Required', 'Select a customer', 'warning'); return; }
    const activeSvcs = services.filter(s => s.service_category !== '');
    if (activeSvcs.length === 0) { Swal.fire('Required', 'Add at least one service', 'warning'); return; }
    setSaving(true);
    try {
      const total = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      const cost = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
      const res = await api.post('/bookings', {
        customer_id: customerId,
        total_amount: total,
        cost_amount: cost,
        notes,
        passengers: passengers.filter(p => p.name.trim() !== ''),
        services: activeSvcs.map(s => ({ ...s, cost: parseFloat(s.cost) || null, price: parseFloat(s.price) || null, supplier_id: s.supplier_id || null })),
      });
      Swal.fire({ icon: 'success', title: 'Booking created', timer: 1500, showConfirmButton: false }).then(() => navigate('/bookings'));
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const totalAmount = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const totalCost = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
  const profit = totalAmount - totalCost;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="page-title mb-1">New Booking</h5>
          <small className="text-muted">Customer → Passengers → Services</small>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>Cancel</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* === CUSTOMER === */}
        <div className="card mb-4 border-primary border-top border-3">
          <div className="card-body">
            <h6 className="text-primary mb-3"><i className="bi bi-person-check me-2"></i>Customer</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
                  <input className="form-control form-control-lg" placeholder="Type to search customer..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setCustomerId(''); }} autoComplete="off" />
                  <button type="button" className="btn btn-outline-success" onClick={() => setShowQuickAdd(true)} title="Quick Add"><i className="bi bi-plus-lg"></i></button>
                </div>
                {customerSearch && !customerId && (
                  <div className="position-absolute z-3 shadow-sm bg-white border rounded w-100 mt-1" style={{ maxWidth: 'calc(50% - 12px)', maxHeight: 220, overflow: 'auto' }}>
                    {customers.filter(c => (c.full_name || '').toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8).map(c => (
                      <button key={c.id} type="button" className="list-group-item list-group-item-action border-0 py-2 px-3 small"
                        onClick={() => { setCustomerId(c.id); setCustomerSearch(c.full_name); }}>
                        <strong>{c.full_name}</strong>
                        {c.phone && <span className="text-muted ms-2">{c.phone}</span>}
                        {c.email && <span className="text-muted ms-2 small">{c.email}</span>}
                      </button>
                    ))}
                    {customers.filter(c => (c.full_name || '').toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                      <div className="p-3 text-muted small text-center">No matches — click <strong>+</strong> to add</div>
                    )}
                  </div>
                )}
              </div>
              {customerId && (
                <div className="col-md-6 d-flex align-items-center">
                  <span className="badge bg-success fs-6 py-2 px-3"><i className="bi bi-check-circle me-1"></i> {customerSearch}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === PASSENGERS === */}
        <div className="card mb-4 border-info border-top border-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-info mb-0"><i className="bi bi-people me-2"></i>Passengers ({passengers.length})</h6>
              <button type="button" className="btn btn-sm btn-outline-info" onClick={() => setPassengers([...passengers, { name: '', passport: '', nationality: '', type: 'adult' }])}><i className="bi bi-plus"></i> Add Passenger</button>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className="row g-2 mb-2 pb-2 border-bottom border-light">
                <div className="col-md-3"><label className="form-label small text-muted">Full Name</label><input className="form-control" placeholder="e.g. Ahmad Hassan" value={p.name} onChange={e => pax(i, 'name', e.target.value)} /></div>
                <div className="col-md-2"><label className="form-label small text-muted">Type</label><select className="form-select" value={p.type} onChange={e => pax(i, 'type', e.target.value)}><option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option></select></div>
                <div className="col-md-2"><label className="form-label small text-muted">Passport #</label><input className="form-control" placeholder="P12345678" value={p.passport} onChange={e => pax(i, 'passport', e.target.value)} /></div>
                <div className="col-md-3"><label className="form-label small text-muted">Nationality</label><input className="form-control" placeholder="Palestinian" value={p.nationality} onChange={e => pax(i, 'nationality', e.target.value)} /></div>
                <div className="col-md-2 d-flex align-items-end">
                  {passengers.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger w-100" onClick={() => setPassengers(passengers.filter((_, j) => j !== i))}><i className="bi bi-trash"></i></button>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* === SERVICES === */}
        <div className="card mb-4 border-success border-top border-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-success mb-0"><i className="bi bi-bag-check me-2"></i>Services ({services.filter(s => s.service_category).length})</h6>
              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setServices([...services, { service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyDetails } }])}><i className="bi bi-plus"></i> Add Service</button>
            </div>

            {services.map((s, i) => {
              const cat = s.service_category;
              const hasCat = !!cat;
              return (
              <div key={i} className={`border rounded p-3 mb-3 ${hasCat ? `border-${serviceColor(cat)} bg-light` : 'border-dashed'}`}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    {hasCat && <span className={`badge bg-${serviceColor(cat)} fs-6`}><i className={`bi ${serviceIcon(cat)} me-1`}></i>{serviceLabel(cat)}</span>}
                    <select className="form-select form-select-sm" style={{ width: 180 }} value={cat} onChange={e => svc(i, 'service_category', e.target.value)}>
                      <option value="">Select type...</option>
                      <option value="flight"><i className="bi bi-airplane"></i> Flight</option>
                      <option value="hotel"> Hotel</option>
                      <option value="transport"> Transport</option>
                      <option value="visa"> Visa</option>
                      <option value="insurance"> Insurance</option>
                      <option value="other"> Other</option>
                    </select>
                  </div>
                  {services.length > 1 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setServices(services.filter((_, j) => j !== i))}><i className="bi bi-trash"></i></button>}
                </div>

                {/* Flight */}
                {cat === 'flight' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Airline</label><select className="form-select form-select-sm" value={s.details.airline_id} onChange={e => { const a = airlines.find(x => x.id == e.target.value); dtl(i, 'airline_id', e.target.value); dtl(i, 'airline', a ? a.name : ''); }}><option value="">Select airline...</option>{airlines.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}</select></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Flight #</label><input className="form-control form-control-sm" placeholder="EK501" value={s.details.flight_number} onChange={e => dtl(i, 'flight_number', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Ticket #</label><input className="form-control form-control-sm" placeholder="TKT-001" value={s.details.ticket_number} onChange={e => dtl(i, 'ticket_number', e.target.value)} /></div>
                      <div className="col-md-5"><label className="form-label small mb-1 text-muted">PNR</label><input className="form-control form-control-sm" placeholder="PNR001" value={s.details.pnr || ''} onChange={e => dtl(i, 'pnr', e.target.value)} /></div>
                    </div>
                    <div className="row g-2 mt-1">
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">From Airport</label><select className="form-select form-select-sm" value={s.details.origin_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); dtl(i, 'origin_airport_id', e.target.value); dtl(i, 'origin_airport', a ? `${a.code} - ${a.name}` : ''); }}><option value="">Select airport...</option>{airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">To Airport</label><select className="form-select form-select-sm" value={s.details.destination_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); dtl(i, 'destination_airport_id', e.target.value); dtl(i, 'destination_airport', a ? `${a.code} - ${a.name}` : ''); }}><option value="">Select airport...</option>{airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Dep. Date</label><input type="date" className="form-control form-control-sm" value={s.details.departure_date} onChange={e => dtl(i, 'departure_date', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Dep. Time</label><input type="time" className="form-control form-control-sm" value={s.details.departure_time} onChange={e => dtl(i, 'departure_time', e.target.value)} /></div>
                      <div className="col-md-1 d-flex align-items-end pb-1"><label className="form-check-label small"><input type="checkbox" className="form-check-input" checked={s.details.departure_next_day} onChange={e => dtl(i, 'departure_next_day', e.target.checked)} />+1</label></div>
                      <div className="col-md-1 d-flex align-items-end pb-1">&nbsp;</div>
                    </div>
                    <div className="row g-2 mt-1">
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Arr. Date</label><input type="date" className="form-control form-control-sm" value={s.details.arrival_date} onChange={e => dtl(i, 'arrival_date', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Arr. Time</label><input type="time" className="form-control form-control-sm" value={s.details.arrival_time} onChange={e => dtl(i, 'arrival_time', e.target.value)} /></div>
                      <div className="col-md-1 d-flex align-items-end pb-1"><label className="form-check-label small"><input type="checkbox" className="form-check-input" checked={s.details.arrival_next_day} onChange={e => dtl(i, 'arrival_next_day', e.target.checked)} />+1</label></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Checked (kg)</label><input type="number" className="form-control form-control-sm" placeholder="23" value={s.details.checked_baggage} onChange={e => dtl(i, 'checked_baggage', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Cabin (kg)</label><input type="number" className="form-control form-control-sm" placeholder="7" value={s.details.cabin_baggage} onChange={e => dtl(i, 'cabin_baggage', e.target.value)} /></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Class</label><input className="form-control form-control-sm" placeholder="Economy" value={s.details.bookingClass || ''} onChange={e => dtl(i, 'bookingClass', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Hotel */}
                {cat === 'hotel' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Hotel Name</label><input className="form-control form-control-sm" placeholder="e.g. Hilton Dubai" value={s.details.hotel_name} onChange={e => dtl(i, 'hotel_name', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Room Type</label><input className="form-control form-control-sm" placeholder="Deluxe" value={s.details.room_type} onChange={e => dtl(i, 'room_type', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Board Basis</label><select className="form-select form-select-sm" value={s.details.board_basis} onChange={e => dtl(i, 'board_basis', e.target.value)}><option value="">Select...</option><option value="room_only">Room Only</option><option value="breakfast">Breakfast</option><option value="half_board">Half Board</option><option value="full_board">Full Board</option><option value="all_inclusive">All Inclusive</option></select></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Check In</label><input type="date" className="form-control form-control-sm" value={s.details.check_in} onChange={e => dtl(i, 'check_in', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Check Out</label><input type="date" className="form-control form-control-sm" value={s.details.check_out} onChange={e => dtl(i, 'check_out', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Transport */}
                {cat === 'transport' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Type</label><select className="form-select form-select-sm" value={s.details.transport_type} onChange={e => dtl(i, 'transport_type', e.target.value)}><option value="">Select...</option><option value="car">Car</option><option value="bus">Bus</option><option value="van">Van</option><option value="limo">Limousine</option></select></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Pickup</label><input className="form-control form-control-sm" placeholder="Pickup location" value={s.details.pickup_location} onChange={e => dtl(i, 'pickup_location', e.target.value)} /></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Dropoff</label><input className="form-control form-control-sm" placeholder="Dropoff location" value={s.details.dropoff_location} onChange={e => dtl(i, 'dropoff_location', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Pickup Time</label><input type="datetime-local" className="form-control form-control-sm" value={s.details.pickup_time} onChange={e => dtl(i, 'pickup_time', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Visa */}
                {cat === 'visa' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Country</label><input className="form-control form-control-sm" placeholder="Turkey" value={s.details.country} onChange={e => dtl(i, 'country', e.target.value)} /></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Visa Type</label><select className="form-select form-select-sm" value={s.details.visa_type} onChange={e => dtl(i, 'visa_type', e.target.value)}><option value="">Select...</option><option value="tourist">Tourist</option><option value="business">Business</option><option value="transit">Transit</option><option value="student">Student</option><option value="work">Work</option></select></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Apply Date</label><input type="date" className="form-control form-control-sm" value={s.details.applicationDate || ''} onChange={e => dtl(i, 'applicationDate', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Expiry</label><input type="date" className="form-control form-control-sm" value={s.details.expiryDate || ''} onChange={e => dtl(i, 'expiryDate', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Insurance */}
                {cat === 'insurance' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Provider</label><input className="form-control form-control-sm" placeholder="AXA Insurance" value={s.details.policy_number ? '' : s.details.providerName} onChange={e => dtl(i, 'providerName', e.target.value)} /></div>
                      <div className="col-md-3"><label className="form-label small mb-1 text-muted">Policy #</label><input className="form-control form-control-sm" placeholder="POL-12345" value={s.details.policy_number} onChange={e => dtl(i, 'policy_number', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">Start</label><input type="date" className="form-control form-control-sm" value={s.details.start_date} onChange={e => dtl(i, 'start_date', e.target.value)} /></div>
                      <div className="col-md-2"><label className="form-label small mb-1 text-muted">End</label><input type="date" className="form-control form-control-sm" value={s.details.end_date} onChange={e => dtl(i, 'end_date', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Other */}
                {cat === 'other' && (
                  <div className="bg-white rounded p-2 mb-2">
                    <div className="row g-2">
                      <div className="col-md-12"><label className="form-label small mb-1 text-muted">Description</label><input className="form-control form-control-sm" placeholder="Service description..." value={s.description} onChange={e => svc(i, 'description', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* Supplier + Cost + Price — always shown when category selected */}
                {cat && (
                  <div className="row g-2 mt-1">
                    <div className="col-md-3">
                      <label className="form-label small mb-1 text-muted">Supplier</label>
                      <select className="form-select form-select-sm" value={s.supplier_id} onChange={e => svc(i, 'supplier_id', e.target.value)}>
                        <option value="">None</option>
                        {suppliers.map(sp => <option key={sp.id} value={sp.name}>{sp.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-2"><label className="form-label small mb-1 text-muted">Cost</label><input type="number" step="0.01" className="form-control form-control-sm" placeholder="0" value={s.cost} onChange={e => svc(i, 'cost', e.target.value)} /></div>
                    <div className="col-md-2"><label className="form-label small mb-1 text-muted">Price</label><input type="number" step="0.01" className="form-control form-control-sm" placeholder="0" value={s.price} onChange={e => svc(i, 'price', e.target.value)} /></div>
                    <div className="col-md-2"><label className="form-label small mb-1 text-muted">Currency</label>
                      <select className="form-select form-select-sm" value={s.currency || 'ILS'} onChange={e => svc(i, 'currency', e.target.value)}>
                        <option value="ILS">ILS</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="JOD">JOD</option><option value="AED">AED</option>
                      </select>
                    </div>
                    <div className="col-md-3 d-flex align-items-end">
                      {s.price > 0 && <span className="text-success small fw-bold">Total: {(Number(s.price) || 0).toLocaleString()} {s.currency || 'ILS'}</span>}
                    </div>
                  </div>
                )}
              </div>
              );
            })}

            {/* Totals */}
            {totalAmount > 0 && (
              <div className="bg-light rounded p-3 mt-2 border">
                <div className="row text-center">
                  <div className="col"><small className="text-muted">Total Cost</small><br /><strong className="text-danger">{totalCost.toLocaleString()} ILS</strong></div>
                  <div className="col"><small className="text-muted">Total Price</small><br /><strong className="text-primary">{totalAmount.toLocaleString()} ILS</strong></div>
                  <div className="col"><small className="text-muted">Profit</small><br /><strong className={profit >= 0 ? 'text-success' : 'text-danger'}>{profit.toLocaleString()} ILS</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === NOTES === */}
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="text-muted mb-2"><i className="bi bi-pencil me-2"></i>Notes</h6>
            <textarea className="form-control" rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..."></textarea>
          </div>
        </div>

        {/* === SUBMIT === */}
        <div className="d-flex gap-2 mb-4">
          <button type="submit" className="btn btn-primary btn-lg px-5" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg"></i> Create Booking</>}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-lg" onClick={() => navigate('/bookings')}>Cancel</button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showQuickAdd && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">Quick Add Customer</h6><button className="btn-close" onClick={() => setShowQuickAdd(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">Name <span className="text-danger">*</span></label><input className="form-control" value={quickForm.full_name} onChange={e => setQuickForm({ ...quickForm, full_name: e.target.value })} autoFocus /></div>
                <div className="mb-2"><label className="form-label">Phone</label><input className="form-control" value={quickForm.phone} onChange={e => setQuickForm({ ...quickForm, phone: e.target.value })} /></div>
                <div className="mb-2"><label className="form-label">Email</label><input type="email" className="form-control" value={quickForm.email} onChange={e => setQuickForm({ ...quickForm, email: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowQuickAdd(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={quickAddCustomer}>Add Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
