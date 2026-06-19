import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function EditBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    service_type: '',
    from_destination: '',
    to_destination: '',
    travel_date: '',
    return_date: '',
    airline: '',
    flight_number: '',
    ticket_number: '',
    total_amount: '',
    cost_amount: '',
    notes: '',
    status: '',
  });
  const [passengers, setPassengers] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${id}`),
      api.get('/customers', { params: { limit: 1000 } }),
    ]).then(([bookingRes, customersRes]) => {
      const b = bookingRes.data;
      setForm({
        customer_id: b.customer_id || '',
        service_type: b.service_type || '',
        from_destination: b.from_destination || '',
        to_destination: b.to_destination || '',
        travel_date: b.travel_date || '',
        return_date: b.return_date || '',
        airline: b.airline || '',
        flight_number: b.flight_number || '',
        ticket_number: b.ticket_number || '',
        total_amount: b.total_amount || '',
        cost_amount: b.cost_amount || '',
        notes: b.notes || '',
        status: b.status || '',
      });
      setPassengers(b.passengers?.length > 0 ? b.passengers : [{ name: '', passport: '', nationality: '', type: 'adult' }]);
      setServices(b.services?.length > 0 ? b.services : [{ description: '', supplier_id: '', cost: '', price: '' }]);
      setCustomers(customersRes.data.rows);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addPassenger = () => {
    setPassengers([...passengers, { name: '', passport: '', nationality: '', type: 'adult' }]);
  };

  const removePassenger = (index) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const addService = () => {
    setServices([...services, { description: '', supplier_id: '', cost: '', price: '' }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        cost_amount: form.cost_amount ? parseFloat(form.cost_amount) : null,
        passengers: passengers.filter(p => p.name.trim() !== ''),
        services: services.filter(s => s.description.trim() !== '').map(s => ({
          ...s,
          cost: s.cost ? parseFloat(s.cost) : null,
          price: s.price ? parseFloat(s.price) : null,
        })),
      };
      await api.put(`/bookings/${id}`, payload);
      Swal.fire({ icon: 'success', title: 'Booking updated successfully', timer: 1500, showConfirmButton: false });
      navigate(`/bookings/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'An error occurred while updating the booking' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Edit Booking #{form.booking_number || id}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate(`/bookings/${id}`)}>Back</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title mb-3">Booking Information</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Customer <span className="text-danger">*</span></label>
                <select className="form-select" name="customer_id" value={form.customer_id} onChange={handleChange} required>
                  <option value="">Select a customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Service Type</label>
                <select className="form-select" name="service_type" value={form.service_type} onChange={handleChange}>
                  <option value="">Select service type...</option>
                  <option value="flight">Flight</option>
                  <option value="hotel">Hotel</option>
                  <option value="visa">Visa</option>
                  <option value="tour">Tour</option>
                  <option value="transport">Transport</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">From</label>
                <input type="text" className="form-control" name="from_destination" value={form.from_destination} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">To</label>
                <input type="text" className="form-control" name="to_destination" value={form.to_destination} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Travel Date</label>
                <input type="date" className="form-control" name="travel_date" value={form.travel_date} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Return Date</label>
                <input type="date" className="form-control" name="return_date" value={form.return_date} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Airline</label>
                <input type="text" className="form-control" name="airline" value={form.airline} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Flight Number</label>
                <input type="text" className="form-control" name="flight_number" value={form.flight_number} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Ticket Number</label>
                <input type="text" className="form-control" name="ticket_number" value={form.ticket_number} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Total Amount</label>
                <input type="number" step="0.01" className="form-control" name="total_amount" value={form.total_amount} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Cost</label>
                <input type="number" step="0.01" className="form-control" name="cost_amount" value={form.cost_amount} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Passengers</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPassenger}><i className="bi bi-plus"></i> Add Passenger</button>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className="row g-2 mb-2 align-items-end">
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">Name</label>}
                  <input type="text" className="form-control" placeholder="Passenger name" value={p.name || ''} onChange={e => handlePassengerChange(i, 'name', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">Passport</label>}
                  <input type="text" className="form-control" placeholder="Passport number" value={p.passport || ''} onChange={e => handlePassengerChange(i, 'passport', e.target.value)} />
                </div>
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">Nationality</label>}
                  <input type="text" className="form-control" placeholder="Nationality" value={p.nationality || ''} onChange={e => handlePassengerChange(i, 'nationality', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">Type</label>}
                  <select className="form-select" value={p.type || 'adult'} onChange={e => handlePassengerChange(i, 'type', e.target.value)}>
                    <option value="adult">Adult</option>
                    <option value="child">Child</option>
                    <option value="infant">Infant</option>
                  </select>
                </div>
                <div className="col-md-2">
                  {passengers.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePassenger(i)}><i className="bi bi-trash"></i></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Services</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addService}><i className="bi bi-plus"></i> Add Service</button>
            </div>
            {services.map((s, i) => (
              <div key={i} className="row g-2 mb-2 align-items-end">
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">Description</label>}
                  <input type="text" className="form-control" placeholder="Service description" value={s.description || ''} onChange={e => handleServiceChange(i, 'description', e.target.value)} />
                </div>
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">Supplier</label>}
                  <input type="text" className="form-control" placeholder="Supplier name" value={s.supplier_id || ''} onChange={e => handleServiceChange(i, 'supplier_id', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">Cost</label>}
                  <input type="number" step="0.01" className="form-control" placeholder="Cost" value={s.cost || ''} onChange={e => handleServiceChange(i, 'cost', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">Price</label>}
                  <input type="number" step="0.01" className="form-control" placeholder="Price" value={s.price || ''} onChange={e => handleServiceChange(i, 'price', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {services.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeService(i)}><i className="bi bi-trash"></i></button>
                  )}
                </div>
              </div>
            ))}
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
