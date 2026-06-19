import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const emptyDetails = {
  airline: '', airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '', origin_airport: '', destination_airport: '', departure_date: '', departure_time: '', departure_next_day: false, arrival_date: '', arrival_time: '', arrival_next_day: false, ticket_number: '', checked_baggage: '', cabin_baggage: '',
  hotel_name: '', room_type: '', board_basis: '', check_in: '', check_out: '',
  transport_type: '', pickup_location: '', dropoff_location: '', pickup_time: '',
  country: '', visa_type: '', processing_time: '',
  policy_number: '', coverage_type: '', start_date: '', end_date: '',
};

const serviceLabel = (cat) => ({ flight: 'Flight', hotel: 'Hotel', transport: 'Transport', visa: 'Visa', insurance: 'Insurance', other: 'Other' }[cat] || '');

const normalizeService = (s) => ({
  service_category: s.service_category || s.service_type || '',
  supplier_id: s.supplier_id || '',
  description: s.description || '',
  cost: s.cost || '',
  price: s.amount || s.price || '',
  details: s.details && typeof s.details === 'object' ? { ...emptyDetails, ...s.details } : { ...emptyDetails },
});

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [passengers, setPassengers] = useState([]);
  const [services, setServices] = useState([]);
  const [bookingNumber, setBookingNumber] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${id}`),
      api.get('/customers', { params: { limit: 1000 } }),
      api.get('/airports', { params: { limit: 1000 } }),
      api.get('/airlines', { params: { limit: 1000 } }),
      api.get('/suppliers', { params: { limit: 1000 } }),
    ]).then(([b, c, ap, al, sp]) => {
      const bk = b.data;
      setCustomerId(bk.customer_id || '');
      setStatus(bk.status || 'pending');
      setNotes(bk.notes || '');
      setBookingNumber(bk.booking_number);
      setCustomers(c.data.rows);
      setAirports(ap.data.rows || ap.data || []);
      setAirlines(al.data.rows || al.data || []);
      setSuppliers(sp.data.rows || sp.data || []);
      setPassengers(bk.passengers?.length > 0 ? bk.passengers.map(p => ({ name: p.full_name || p.name, passport: p.passport_number || p.passport, nationality: p.nationality, type: p.type || 'adult' })) : [{ name: '', passport: '', nationality: '', type: 'adult' }]);
      setServices(bk.services?.length > 0 ? bk.services.map(normalizeService) : [{ service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyDetails } }]);
    }).finally(() => setLoading(false));
  }, [id]);

  const pax = (i, field, value) => { const u = [...passengers]; u[i][field] = value; setPassengers(u); };
  const svc = (i, field, value) => { const u = [...services]; u[i][field] = value; if (field === 'service_category') { u[i].details = { ...emptyDetails }; u[i].description = serviceLabel(value); } setServices(u); };
  const dtl = (i, field, value) => { const u = [...services]; u[i].details = { ...u[i].details, [field]: value }; setServices(u); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) { Swal.fire('Required', 'Select a customer', 'warning'); return; }
    const activeSvcs = services.filter(s => s.service_category !== '');
    if (activeSvcs.length === 0) { Swal.fire('Required', 'Add at least one service', 'warning'); return; }
    setSaving(true);
    try {
      const total = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
      const cost = activeSvcs.reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
      await api.put(`/bookings/${id}`, {
        customer_id: customerId,
        status,
        total_amount: total,
        cost_amount: cost,
        notes,
        passengers: passengers.filter(p => p.name.trim() !== ''),
        services: activeSvcs.map(s => ({ ...s, cost: parseFloat(s.cost) || null, price: parseFloat(s.price) || null, supplier_id: s.supplier_id || null })),
      });
      Swal.fire({ icon: 'success', title: 'Booking updated', timer: 1500, showConfirmButton: false }).then(() => navigate(`/bookings/${id}`));
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Failed to update booking', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderFlight = (s, i) => (
    <>
      <div className="row g-2 mb-2">
        <div className="col-md-2">
          <label className="form-label small mb-1">Airline</label>
          <select className="form-select" value={s.details.airline_id} onChange={e => { const a = airlines.find(x => x.id == e.target.value); dtl(i, 'airline_id', e.target.value); dtl(i, 'airline', a ? a.name : ''); }}>
            <option value="">Select...</option>
            {airlines.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Flight #</label>
          <input className="form-control" value={s.details.flight_number} onChange={e => dtl(i, 'flight_number', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Ticket #</label>
          <input className="form-control" value={s.details.ticket_number} onChange={e => dtl(i, 'ticket_number', e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">From Airport</label>
          <select className="form-select" value={s.details.origin_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); dtl(i, 'origin_airport_id', e.target.value); dtl(i, 'origin_airport', a ? `${a.code} - ${a.name}` : ''); }}>
            <option value="">Select airport...</option>
            {airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-1">To Airport</label>
          <select className="form-select" value={s.details.destination_airport_id} onChange={e => { const a = airports.find(x => x.id == e.target.value); dtl(i, 'destination_airport_id', e.target.value); dtl(i, 'destination_airport', a ? `${a.code} - ${a.name}` : ''); }}>
            <option value="">Select airport...</option>
            {airports.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="row g-2 mb-2">
        <div className="col-md-2">
          <label className="form-label small mb-1">Dep. Date</label>
          <input type="date" className="form-control" value={s.details.departure_date} onChange={e => dtl(i, 'departure_date', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Dep. Time</label>
          <input type="time" className="form-control" value={s.details.departure_time} onChange={e => dtl(i, 'departure_time', e.target.value)} />
        </div>
        <div className="col-md-1 d-flex align-items-end pb-2">
          <label className="form-check-label small"><input type="checkbox" className="form-check-input me-1" checked={s.details.departure_next_day} onChange={e => dtl(i, 'departure_next_day', e.target.checked)} />+1</label>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Arr. Date</label>
          <input type="date" className="form-control" value={s.details.arrival_date} onChange={e => dtl(i, 'arrival_date', e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Arr. Time</label>
          <input type="time" className="form-control" value={s.details.arrival_time} onChange={e => dtl(i, 'arrival_time', e.target.value)} />
        </div>
        <div className="col-md-1 d-flex align-items-end pb-2">
          <label className="form-check-label small"><input type="checkbox" className="form-check-input me-1" checked={s.details.arrival_next_day} onChange={e => dtl(i, 'arrival_next_day', e.target.checked)} />+1</label>
        </div>
        <div className="col-md-2">
          <label className="form-label small mb-1">Checked (kg)</label>
          <input type="number" className="form-control" placeholder="23" value={s.details.checked_baggage} onChange={e => dtl(i, 'checked_baggage', e.target.value)} />
        </div>
      </div>
      <div className="row g-2 mb-2">
        <div className="col-md-2">
          <label className="form-label small mb-1">Cabin (kg)</label>
          <input type="number" className="form-control" placeholder="7" value={s.details.cabin_baggage} onChange={e => dtl(i, 'cabin_baggage', e.target.value)} />
        </div>
      </div>
    </>
  );

  const renderSupplierFields = (s, i) => (
    <div className="row g-2 mb-1">
      <div className="col-md-3">
        <label className="form-label small mb-1">Supplier</label>
        <select className="form-select" value={s.supplier_id} onChange={e => svc(i, 'supplier_id', e.target.value)}>
          <option value="">None</option>
          {suppliers.map(sp => <option key={sp.id} value={sp.name}>{sp.name}</option>)}
        </select>
      </div>
      <div className="col-md-2">
        <label className="form-label small mb-1">Cost</label>
        <input type="number" step="0.01" className="form-control" placeholder="0" value={s.cost} onChange={e => svc(i, 'cost', e.target.value)} />
      </div>
      <div className="col-md-2">
        <label className="form-label small mb-1">Price</label>
        <input type="number" step="0.01" className="form-control" placeholder="0" value={s.price} onChange={e => svc(i, 'price', e.target.value)} />
      </div>
      <div className="col-md-2 d-flex align-items-end">
        {s.price > 0 && <span className="text-success fw-bold small">Total: {Number(s.price).toLocaleString()}</span>}
      </div>
    </div>
  );

  const renderService = (s, i) => {
    const cat = s.service_category;
    const label = serviceLabel(cat);
    return (
      <div key={i} className="border rounded p-3 mb-3 bg-white">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            {label && <span className="badge bg-primary me-1">{label}</span>}
            <select className="form-select form-select-sm" style={{ width: '180px' }} value={cat} onChange={e => svc(i, 'service_category', e.target.value)}>
              <option value="">Select category...</option>
              <option value="flight">Flight</option>
              <option value="hotel">Hotel</option>
              <option value="transport">Transport</option>
              <option value="visa">Visa</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
          {services.length > 1 && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setServices(services.filter((_, j) => j !== i))}><i className="bi bi-trash"></i></button>
          )}
        </div>

        {cat === 'flight' && renderFlight(s, i)}
        {cat === 'other' && (
          <div className="row g-2 mb-2">
            <div className="col-md-6"><label className="form-label small mb-1">Description</label><input className="form-control" placeholder="Service description" value={s.description} onChange={e => svc(i, 'description', e.target.value)} /></div>
          </div>
        )}
        {cat === 'hotel' && (
          <div className="row g-2 mb-2">
            <div className="col-md-3"><label className="form-label small mb-1">Hotel</label><input className="form-control" value={s.details.hotel_name} onChange={e => dtl(i, 'hotel_name', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">Room</label><input className="form-control" value={s.details.room_type} onChange={e => dtl(i, 'room_type', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">Board</label><select className="form-select" value={s.details.board_basis} onChange={e => dtl(i, 'board_basis', e.target.value)}><option value="">Select...</option><option value="room_only">Room Only</option><option value="breakfast">Breakfast</option><option value="half_board">Half Board</option><option value="full_board">Full Board</option><option value="all_inclusive">All Inclusive</option></select></div>
            <div className="col-md-2"><label className="form-label small mb-1">Check In</label><input type="date" className="form-control" value={s.details.check_in} onChange={e => dtl(i, 'check_in', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">Check Out</label><input type="date" className="form-control" value={s.details.check_out} onChange={e => dtl(i, 'check_out', e.target.value)} /></div>
          </div>
        )}
        {cat === 'transport' && (
          <div className="row g-2 mb-2">
            <div className="col-md-2"><label className="form-label small mb-1">Type</label><select className="form-select" value={s.details.transport_type} onChange={e => dtl(i, 'transport_type', e.target.value)}><option value="">Select...</option><option value="car">Car</option><option value="bus">Bus</option><option value="van">Van</option><option value="limo">Limousine</option></select></div>
            <div className="col-md-3"><label className="form-label small mb-1">Pickup</label><input className="form-control" value={s.details.pickup_location} onChange={e => dtl(i, 'pickup_location', e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label small mb-1">Dropoff</label><input className="form-control" value={s.details.dropoff_location} onChange={e => dtl(i, 'dropoff_location', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">Pickup Time</label><input type="datetime-local" className="form-control" value={s.details.pickup_time} onChange={e => dtl(i, 'pickup_time', e.target.value)} /></div>
          </div>
        )}
        {cat === 'visa' && (
          <div className="row g-2 mb-2">
            <div className="col-md-3"><label className="form-label small mb-1">Country</label><input className="form-control" value={s.details.country} onChange={e => dtl(i, 'country', e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label small mb-1">Visa Type</label><select className="form-select" value={s.details.visa_type} onChange={e => dtl(i, 'visa_type', e.target.value)}><option value="">Select...</option><option value="tourist">Tourist</option><option value="business">Business</option><option value="transit">Transit</option><option value="student">Student</option><option value="work">Work</option></select></div>
            <div className="col-md-2"><label className="form-label small mb-1">Processing</label><input className="form-control" value={s.details.processing_time} onChange={e => dtl(i, 'processing_time', e.target.value)} /></div>
          </div>
        )}
        {cat === 'insurance' && (
          <div className="row g-2 mb-2">
            <div className="col-md-3"><label className="form-label small mb-1">Policy #</label><input className="form-control" value={s.details.policy_number} onChange={e => dtl(i, 'policy_number', e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label small mb-1">Coverage</label><input className="form-control" value={s.details.coverage_type} onChange={e => dtl(i, 'coverage_type', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">Start</label><input type="date" className="form-control" value={s.details.start_date} onChange={e => dtl(i, 'start_date', e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label small mb-1">End</label><input type="date" className="form-control" value={s.details.end_date} onChange={e => dtl(i, 'end_date', e.target.value)} /></div>
          </div>
        )}
        {cat && renderSupplierFields(s, i)}
      </div>
    );
  };

  const totalAmount = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.price) || 0), 0);
  const totalCost = services.filter(s => s.service_category).reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
  const profit = totalAmount - totalCost;

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Edit Booking #{bookingNumber || id}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate(`/bookings/${id}`)}>Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title mb-3">Customer & Status</h6>
            <div className="row g-2">
              <div className="col-md-6">
                <select className="form-select form-select-lg" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                  <option value="">Select a customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select form-select-lg" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Passengers ({passengers.length})</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setPassengers([...passengers, { name: '', passport: '', nationality: '', type: 'adult' }])}><i className="bi bi-plus"></i> Add</button>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className="row g-2 mb-2">
                <div className="col-md-3">
                  {i === 0 && <label className="form-label small">Name</label>}
                  <input className="form-control" placeholder="Passenger name" value={p.name || ''} onChange={e => pax(i, 'name', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label small">Type</label>}
                  <select className="form-select" value={p.type || 'adult'} onChange={e => pax(i, 'type', e.target.value)}>
                    <option value="adult">Adult</option><option value="child">Child</option><option value="infant">Infant</option>
                  </select>
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label small">Passport</label>}
                  <input className="form-control" placeholder="Passport #" value={p.passport || ''} onChange={e => pax(i, 'passport', e.target.value)} />
                </div>
                <div className="col-md-3">
                  {i === 0 && <label className="form-label small">Nationality</label>}
                  <input className="form-control" placeholder="Nationality" value={p.nationality || ''} onChange={e => pax(i, 'nationality', e.target.value)} />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  {passengers.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setPassengers(passengers.filter((_, j) => j !== i))}><i className="bi bi-trash"></i></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Services ({services.filter(s => s.service_category).length})</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setServices([...services, { service_category: '', supplier_id: '', description: '', cost: '', price: '', details: { ...emptyDetails } }])}><i className="bi bi-plus"></i> Add Service</button>
            </div>
            {services.map((s, i) => renderService(s, i))}
            {totalAmount > 0 && (
              <div className="border-top pt-2 mt-2 text-end">
                <div><small className="text-secondary">Total Cost: {totalCost.toLocaleString()}</small></div>
                <div><small className="text-primary">Total Price: {totalAmount.toLocaleString()}</small></div>
                <div><small className={profit >= 0 ? 'text-success' : 'text-danger'}>Profit: {profit.toLocaleString()}</small></div>
              </div>
            )}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title mb-2">Notes</h6>
            <textarea className="form-control" rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..."></textarea>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg"></i> Save Changes</>}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(`/bookings/${id}`)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
