import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const docTypes = {
  flight: { label: 'Flight Ticket', icon: 'bi-airplane', color: 'primary', fields: ['passengerName','airline','flightNumber','pnr','ticketNumber','origin','destination','departureDate','departureTime','arrivalDate','arrivalTime','bookingClass'] },
  hotel: { label: 'Hotel Voucher', icon: 'bi-building', color: 'success', fields: ['guestName','hotelName','city','roomType','checkIn','checkOut','confirmation'] },
  visa: { label: 'Visa Document', icon: 'bi-file-earmark-text', color: 'info', fields: ['passengerName','country','visaType','visaNumber','issueDate','expiryDate'] },
};

const L = { passengerName:'Passenger',airline:'Airline',flightNumber:'Flight #',pnr:'PNR',ticketNumber:'Ticket #',origin:'From',destination:'To',departureDate:'Dep Date',departureTime:'Dep Time',arrivalDate:'Arr Date',arrivalTime:'Arr Time',bookingClass:'Class',guestName:'Guest',hotelName:'Hotel',city:'City',roomType:'Room',checkIn:'Check In',checkOut:'Check Out',confirmation:'Conf #',country:'Country',visaType:'Visa Type',visaNumber:'Visa #',issueDate:'Issue',expiryDate:'Expiry' };

export default function AIReader() {
  const navigate = useNavigate();
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [data, setData] = useState({});
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fields = docType ? docTypes[docType]?.fields || [] : [];

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      if (docType) fd.append('type', docType);
      const res = await api.post('/ai-reader/upload', fd);
      if (res.data.extracted) setData(res.data.extracted);
      setRawText(res.data.rawText || '');
      setFile(null);
      if (res.data.error) Swal.fire({ icon: 'info', title: 'Info', text: res.data.error, timer: 2000 });
    } catch (e) { Swal.fire('Error', 'Upload failed', 'error'); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!docType) return Swal.fire('Required', 'Select type', 'warning');
    const hasData = Object.values(data).some(v => v);
    if (!hasData) return Swal.fire('Required', 'Enter at least one field', 'warning');
    setCreating(true);
    try {
      const res = await api.post('/ai-reader/create', { extracted: { type: docType, ...data } });
      Swal.fire({ icon: 'success', title: 'Created!', timer: 1500 }).then(() => {
        if (res.data.created?.[0]?.id) navigate(`/bookings/${res.data.created[0].id}`);
      });
    } catch (e) { Swal.fire('Error', 'Failed', 'error'); } finally { setCreating(false); }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">Document Reader</h5>
        <small className="text-muted">Upload file or type data manually</small>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          {/* Type selector */}
          <div className="card mb-3"><div className="card-body">
            <h6 className="mb-3">Document Type</h6>
            {Object.entries(docTypes).map(([k, v]) => (
              <button key={k} className={`btn btn-lg w-100 mb-2 text-start ${docType === k ? `btn-${v.color}` : 'btn-outline-secondary'}`}
                onClick={() => { setDocType(k); setData({}); setRawText(''); setFile(null); }}>
                <i className={`bi ${v.icon} me-2`}></i>{v.label}
              </button>
            ))}
          </div></div>

          {/* Upload */}
          {docType && (
            <div className="card"><div className="card-body">
              <h6 className="mb-3"><i className="bi bi-cloud-upload me-2"></i>Upload (Optional)</h6>
              <input type="file" className="form-control form-control-sm mb-2" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} />
              <button className="btn btn-primary btn-sm w-100" disabled={!file || loading} onClick={handleUpload}>
                {loading ? 'Extracting...' : 'Extract Data from File'}
              </button>
              <small className="text-muted d-block mt-2">PDF files only. For images, type data manually.</small>
            </div></div>
          )}
        </div>

        <div className="col-md-8">
          <div className="card"><div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                {docType && <span className={`badge bg-${docTypes[docType].color} me-2`}>{docTypes[docType].label}</span>}
                {fields.length > 0 ? `${fields.length} fields` : 'Select a document type'}
              </h6>
              {docType && (
                <button className="btn btn-success" onClick={handleCreate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Booking'}
                </button>
              )}
            </div>

            {fields.length > 0 ? (
              <div className="row g-2">
                {fields.map(f => (
                  <div key={f} className="col-md-4 col-lg-3">
                    <label className="form-label small text-muted">{L[f] || f}</label>
                    <input className="form-control form-control-sm" value={data[f] || ''} onChange={e => setData({ ...data, [f]: e.target.value })} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-arrow-left display-4 d-block mb-3"></i>
                Select a document type to begin
              </div>
            )}

            {rawText && (
              <div className="mt-3">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowRaw(!showRaw)}>
                  {showRaw ? 'Hide' : 'Show'} Extracted Text
                </button>
                {showRaw && (
                  <pre className="small bg-dark text-light p-2 mt-1 rounded" style={{ maxHeight: 200, overflow: 'auto', fontSize: '0.6rem', whiteSpace: 'pre-wrap' }}>{rawText}</pre>
                )}
              </div>
            )}
          </div></div>
        </div>
      </div>
    </div>
  );
}
