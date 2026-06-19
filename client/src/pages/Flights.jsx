import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Flights() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '',
    departure_time: '', arrival_time: '', price: '', currency: 'SAR', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    api.get('/flight-schedules', { params }).then(res => setData(res.data));
  };

  const loadSelects = async () => {
    try {
      const [aptRes, alRes] = await Promise.all([
        api.get('/flight-schedules/airports'),
        api.get('/flight-schedules/airlines')
      ]);
      setAirports(aptRes.data);
      setAirlines(alRes.data);
    } catch {}
  };

  useEffect(() => { load(); loadSelects(); }, [page]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); load(); }, 300); return () => clearTimeout(t); }, [search]);

  const resetForm = () => {
    setFormData({
      airline_id: '', flight_number: '', origin_airport_id: '', destination_airport_id: '',
      departure_time: '', arrival_time: '', price: '', currency: 'SAR', notes: ''
    });
    setEditItem(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormData({
      airline_id: item.airline_id ?? '',
      flight_number: item.flight_number || '',
      origin_airport_id: item.origin_airport_id ?? '',
      destination_airport_id: item.destination_airport_id ?? '',
      departure_time: item.departure_time || '',
      arrival_time: item.arrival_time || '',
      price: item.price ?? '',
      currency: item.currency || 'SAR',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.flight_number.trim()) {
      Swal.fire('Alert', 'Flight number is required', 'warning'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        airline_id: formData.airline_id ? Number(formData.airline_id) : null,
        origin_airport_id: formData.origin_airport_id ? Number(formData.origin_airport_id) : null,
        destination_airport_id: formData.destination_airport_id ? Number(formData.destination_airport_id) : null,
        price: formData.price ? Number(formData.price) : 0
      };
      if (editItem) {
        await api.put(`/flight-schedules/${editItem.id}`, payload);
        Swal.fire('Updated', 'Flight updated successfully', 'success');
      } else {
        await api.post('/flight-schedules', payload);
        Swal.fire('Added', 'Flight added successfully', 'success');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Confirm Deletion', text: `Flight "${name}" will be deleted`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'Cancel'
    }).then(r => {
      if (r.isConfirmed) api.delete(`/flight-schedules/${id}`).then(() => load());
    });
  };

  const formatDateTime = (dt) => {
    if (!dt) return '-';
    return dt.replace('T', ' ');
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Flights</h5>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg"></i> New Flight
        </button>
      </div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input className="form-control" placeholder="Search by flight number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr><th>Flight</th><th>Airline</th><th>Origin</th><th>Destination</th><th>Departure</th><th>Arrival</th><th>Price</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map(f => (
                <tr key={f.id}>
                  <td><span className="badge bg-primary">{f.flight_number}</span></td>
                  <td>{f.airline_name || '-'} <small className="text-muted">({f.airline_code || ''})</small></td>
                  <td>{f.origin_code ? `${f.origin_code} - ${f.origin_city || ''}` : '-'}</td>
                  <td>{f.destination_code ? `${f.destination_code} - ${f.destination_city || ''}` : '-'}</td>
                  <td>{formatDateTime(f.departure_time)}</td>
                  <td>{formatDateTime(f.arrival_time)}</td>
                  <td>{f.price ? `${Number(f.price).toLocaleString()} ${f.currency || ''}` : '-'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-warning me-1" onClick={() => openEdit(f)}><i className="bi bi-pencil"></i></button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(f.id, f.flight_number)}><i className="bi bi-trash"></i></button>
                  </td>
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No flights found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {data.total > 20 && (
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            {Array.from({ length: Math.ceil(data.total / 20) }, (_, i) => i + 1).map(p => (
              <li key={p} className={`page-item ${p === data.page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(p)}>{p}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-airplane-engines me-2"></i>{editItem ? 'Edit Flight' : 'Add New Flight'}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Airline</label>
                      <select className="form-select" value={formData.airline_id} onChange={e => setFormData({ ...formData, airline_id: e.target.value })}>
                        <option value="">Select Airline</option>
                        {airlines.map(al => <option key={al.id} value={al.id}>{al.name} ({al.code})</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Flight Number <span className="text-danger">*</span></label>
                      <input className="form-control" name="flight_number" value={formData.flight_number} onChange={e => setFormData({ ...formData, flight_number: e.target.value })} placeholder="e.g. SV1055" required />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Departure Airport</label>
                      <select className="form-select" value={formData.origin_airport_id} onChange={e => setFormData({ ...formData, origin_airport_id: e.target.value })}>
                        <option value="">Select Airport</option>
                        {airports.map(ap => <option key={ap.id} value={ap.id}>{ap.name} ({ap.code})</option>)}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Arrival Airport</label>
                      <select className="form-select" value={formData.destination_airport_id} onChange={e => setFormData({ ...formData, destination_airport_id: e.target.value })}>
                        <option value="">Select Airport</option>
                        {airports.map(ap => <option key={ap.id} value={ap.id}>{ap.name} ({ap.code})</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Departure Date & Time</label>
                      <input type="datetime-local" className="form-control" value={formData.departure_time} onChange={e => setFormData({ ...formData, departure_time: e.target.value })} />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Arrival Date & Time</label>
                      <input type="datetime-local" className="form-control" value={formData.arrival_time} onChange={e => setFormData({ ...formData, arrival_time: e.target.value })} />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Price</label>
                      <input type="number" className="form-control" name="price" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} min="0" step="0.01" />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency</label>
                      <select className="form-select" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                        <option value="SAR">Saudi Riyal</option>
                        <option value="AED">UAE Dirham</option>
                        <option value="USD">US Dollar</option>
                        <option value="EUR">Euro</option>
                        <option value="EGP">Egyptian Pound</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea className="form-control" name="notes" rows="2" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span> Saving...</> : <><i className="bi bi-check-lg me-1"></i> Save</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
