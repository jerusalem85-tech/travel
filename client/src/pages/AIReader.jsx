import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const docTypes = {
  flight: {
    label: 'Flight Ticket', icon: 'bi-airplane',
    fields: [
      { key: 'passengerName', label: 'Passenger Name', type: 'text' },
      { key: 'airline', label: 'Airline', type: 'text' },
      { key: 'flightNumber', label: 'Flight #', type: 'text' },
      { key: 'pnr', label: 'PNR', type: 'text' },
      { key: 'ticketNumber', label: 'Ticket #', type: 'text' },
      { key: 'origin', label: 'Origin Airport', type: 'text' },
      { key: 'destination', label: 'Destination Airport', type: 'text' },
      { key: 'departureDate', label: 'Departure Date', type: 'date' },
      { key: 'departureTime', label: 'Departure Time', type: 'time' },
      { key: 'arrivalDate', label: 'Arrival Date', type: 'date' },
      { key: 'arrivalTime', label: 'Arrival Time', type: 'time' },
      { key: 'bookingClass', label: 'Class', type: 'text' },
      { key: 'baggage', label: 'Baggage (kg)', type: 'text' },
    ],
  },
  hotel: {
    label: 'Hotel Voucher', icon: 'bi-building',
    fields: [
      { key: 'guestName', label: 'Guest Name', type: 'text' },
      { key: 'hotelName', label: 'Hotel Name', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'roomType', label: 'Room Type', type: 'text' },
      { key: 'checkIn', label: 'Check In', type: 'date' },
      { key: 'checkOut', label: 'Check Out', type: 'date' },
      { key: 'confirmation', label: 'Confirmation #', type: 'text' },
    ],
  },
  visa: {
    label: 'Visa Document', icon: 'bi-file-earmark-text',
    fields: [
      { key: 'passengerName', label: 'Passenger Name', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'visaType', label: 'Visa Type', type: 'text' },
      { key: 'visaNumber', label: 'Visa #', type: 'text' },
      { key: 'issueDate', label: 'Issue Date', type: 'date' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
    ],
  },
};

export default function AIReader() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('');
  const [form, setForm] = useState({});
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!docType) return Swal.fire('Required', 'Select document type', 'warning');
    const hasData = Object.values(form).some(v => v);
    if (!hasData) return Swal.fire('Required', 'Enter at least one field', 'warning');
    setCreating(true);
    try {
      const payload = { extracted: { type: docType, ...form } };
      const res = await api.post('/ai-reader/create', payload);
      Swal.fire({ icon: 'success', title: 'Booking created!', timer: 1500 }).then(() => {
        if (res.data.created?.[0]?.id) navigate(`/bookings/${res.data.created[0].id}`);
      });
    } catch (e) { Swal.fire('Error', 'Failed', 'error'); } finally { setCreating(false); }
  };

  const fields = docType ? docTypes[docType]?.fields || [] : [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Quick Document Entry</h5>
        <small className="text-muted">Type data from any document → Create booking instantly</small>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Document Type</h6>
              {Object.entries(docTypes).map(([key, val]) => (
                <button key={key} className={`btn btn-lg w-100 mb-2 text-start ${docType === key ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => { setDocType(key); setForm({}); }}>
                  <i className={`bi ${val.icon} me-2`}></i>{val.label}
                </button>
              ))}

              <hr />
              <div className="small text-muted">
                <strong>How to use:</strong><br />
                1. Select document type<br />
                2. Type data from your ticket/voucher<br />
                3. Click Create Booking<br /><br />
                Works with any airline ticket, hotel voucher, or visa document.
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          {docType ? (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-3">
                  <i className={`bi ${docTypes[docType].icon} me-2`}></i>
                  {docTypes[docType].label} — Data Entry
                </h6>
                <div className="row g-2">
                  {fields.map(f => (
                    <div key={f.key} className="col-md-4 col-lg-3">
                      <label className="form-label small text-muted">{f.label}</label>
                      <input type={f.type} className="form-control form-control-sm" value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-success btn-lg mt-3 w-100" onClick={handleCreate} disabled={creating}>
                  {creating ? <><span className="spinner-border spinner-border-sm me-1"></span>Creating...</> : <><i className="bi bi-check-lg me-1"></i>Create Booking from Data</>}
                </button>
              </div>
            </div>
          ) : (
            <div className="card h-100 d-flex align-items-center justify-content-center text-muted">
              <div className="text-center py-5">
                <i className="bi bi-arrow-left display-4 mb-3"></i>
                <p>Select a document type to start entering data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
