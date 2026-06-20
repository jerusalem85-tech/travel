import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const docTypes = [
  { value: 'flight', label: 'Flight Ticket', icon: 'bi-airplane', fields: ['passengerName','airline','flightNumber','pnr','ticketNumber','origin','destination','departureDate','departureTime','arrivalTime','bookingClass'] },
  { value: 'hotel', label: 'Hotel Voucher', icon: 'bi-building', fields: ['hotelName','guestName','roomType','checkIn','checkOut','city','confirmation'] },
  { value: 'visa', label: 'Visa Document', icon: 'bi-file-earmark-text', fields: ['passportName','visaNumber','country','visaType','issueDate','expiryDate'] },
];

const fieldLabels = {
  passengerName: 'Passenger Name', airline: 'Airline', flightNumber: 'Flight #', pnr: 'PNR',
  ticketNumber: 'Ticket #', origin: 'Origin', destination: 'Destination',
  departureDate: 'Dep. Date', departureTime: 'Dep. Time', arrivalTime: 'Arr. Time', bookingClass: 'Class',
  hotelName: 'Hotel Name', guestName: 'Guest Name', roomType: 'Room Type',
  checkIn: 'Check In', checkOut: 'Check Out', city: 'City', confirmation: 'Confirmation #',
  passportName: 'Passport Name', visaNumber: 'Visa #', country: 'Country',
  visaType: 'Visa Type', issueDate: 'Issue Date', expiryDate: 'Expiry Date',
};

export default function AIReader() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [editable, setEditable] = useState({});
  const [mode, setMode] = useState('auto'); // auto | manual
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rawTextExpanded, setRawTextExpanded] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleUpload = async () => {
    if (!file) return Swal.fire('Required', 'Select a file', 'warning');
    setLoading(true); setUploadError(''); setExtracted(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (docType) formData.append('type', docType);
      const res = await api.post('/ai-reader/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data;

      if (!result.extracted || result.extracted.confidence < 10) {
        setUploadError('Could not extract data automatically. Try Manual mode or check the raw text preview.');
        setExtracted(result);
        return;
      }

      // Build editable fields
      const editFields = {};
      const fields = docTypes.find(d => d.value === result.extracted.type)?.fields || Object.keys(result.extracted).filter(k => !['type','confidence'].includes(k));
      fields.forEach(f => { editFields[f] = result.extracted[f] || ''; });
      setEditable(editFields);
      setExtracted(result);

      if (result.extracted.confidence < 40) {
        setUploadError('Low confidence extraction. Review and edit fields below before creating.');
      }
    } catch (e) {
      setUploadError(e.response?.data?.error || 'Failed to read document. Try a different file or use Manual mode.');
    } finally {
      setLoading(false);
    }
  };

  const createRecords = async () => {
    if (!docType) return Swal.fire('Required', 'Select document type first', 'warning');
    setCreating(true);
    try {
      const payload = { extracted: { type: docType, ...editable } };
      const res = await api.post('/ai-reader/create', payload);
      Swal.fire({ icon: 'success', title: 'Records created!', timer: 2000, showConfirmButton: false }).then(() => {
        if (res.data.created?.[0]?.id) navigate(`/bookings/${res.data.created[0].id}`);
      });
    } catch (e) {
      Swal.fire('Error', 'Failed to create records', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!docType) return Swal.fire('Required', 'Select document type', 'warning');
    const hasData = Object.values(editable).some(v => v);
    if (!hasData) return Swal.fire('Required', 'Fill at least one field', 'warning');
    setCreating(true);
    try {
      const payload = { extracted: { type: docType, ...editable } };
      const res = await api.post('/ai-reader/create', payload);
      Swal.fire({ icon: 'success', title: 'Created!', timer: 1500, showConfirmButton: false }).then(() => {
        if (res.data.created?.[0]?.id) navigate(`/bookings/${res.data.created[0].id}`);
      });
    } catch (e) { Swal.fire('Error', 'Failed', 'error'); } finally { setCreating(false); }
  };

  const badgeColor = (conf) => conf >= 60 ? 'success' : conf >= 30 ? 'warning' : 'danger';

  const activeFields = docTypes.find(d => d.value === (extracted?.extracted?.type || docType))?.fields
    || Object.keys(editable).filter(k => editable[k]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">AI Document Reader</h5>
        <div className="d-flex gap-2">
          <div className="btn-group btn-group-sm">
            <button className={`btn ${mode === 'auto' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMode('auto')}>
              <i className="bi bi-magic me-1"></i>Auto
            </button>
            <button className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => {
              setMode('manual');
              if (docType) {
                const fields = docTypes.find(d => d.value === docType)?.fields || [];
                const edit = {};
                fields.forEach(f => { edit[f] = editable[f] || ''; });
                setEditable(edit);
              }
            }}>
              <i className="bi bi-pencil me-1"></i>Manual
            </button>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Upload Panel */}
        <div className={mode === 'auto' ? 'col-md-5' : 'col-md-12'}>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3"><i className="bi bi-cloud-upload me-2"></i>Upload Document</h6>

              <div className="mb-2">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e => {
                  setDocType(e.target.value);
                  setExtracted(null); setEditable({});
                  if (e.target.value) {
                    const fields = docTypes.find(d => d.value === e.target.value)?.fields || [];
                    const edit = {};
                    fields.forEach(f => { edit[f] = ''; });
                    setEditable(edit);
                  }
                }}>
                  <option value="">-- Select type --</option>
                  {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {mode === 'auto' && (
                <>
                  <div className="mb-3">
                    <label className="form-label">File (PDF, JPG, PNG)</label>
                    <div className="input-group">
                      <input type="file" className="form-control" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { setFile(e.target.files[0]); setUploadError(''); setExtracted(null); }} />
                    </div>
                    <small className="text-muted">Best results with digital PDFs (not scanned images)</small>
                  </div>
                  <button className="btn btn-primary w-100" disabled={!file || loading} onClick={handleUpload}>
                    {loading ? <><span className="spinner-border spinner-border-sm me-1"></span> Reading...</> : <><i className="bi bi-magic"></i> Extract Data</>}
                  </button>
                  {uploadError && <div className="alert alert-warning py-2 mt-2 mb-0 small"><i className="bi bi-exclamation-triangle me-1"></i>{uploadError}</div>}
                </>
              )}

              {mode === 'manual' && (
                <div className="alert alert-info py-2 small">
                  <i className="bi bi-info-circle me-1"></i>Fill in the fields manually from your document
                </div>
              )}

              <hr />
              <div className="small text-muted">
                <strong>Supported:</strong> Digital PDFs, screenshots<br />
                <strong>Auto-extracts:</strong> Names, flight numbers, PNR, dates, airports, hotels, visa info
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        {mode === 'auto' && (
          <div className="col-md-7">
            {extracted ? (
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      {extracted.extracted?.confidence > 0 && (
                        <span className={`badge bg-${badgeColor(extracted.extracted?.confidence)} me-2`}>{extracted.extracted?.confidence || 0}% match</span>
                      )}
                      {extracted.extracted?.type?.toUpperCase() || docType?.toUpperCase()}
                    </h6>
                    <button className="btn btn-success btn-sm" onClick={createRecords} disabled={creating || !docType}>
                      {creating ? 'Creating...' : <><i className="bi bi-check-lg"></i> Create Booking</>}
                    </button>
                  </div>

                  {/* Editable extracted fields */}
                  {activeFields.map(field => (
                    <div key={field} className="row g-2 mb-2 align-items-center">
                      <div className="col-4">
                        <label className="form-label small mb-0 text-muted">{fieldLabels[field] || field}</label>
                      </div>
                      <div className="col-8">
                        <input className="form-control form-control-sm" value={editable[field] || ''}
                          onChange={e => setEditable({ ...editable, [field]: e.target.value })} />
                      </div>
                    </div>
                  ))}

                  {/* Raw text preview */}
                  {extracted.rawText && (
                    <div className="mt-3">
                      <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => setRawTextExpanded(!rawTextExpanded)}>
                        <i className={`bi bi-chevron-${rawTextExpanded ? 'up' : 'down'} me-1`}></i>
                        Raw Text Preview {rawTextExpanded ? '(click to collapse)' : '(click to expand)'}
                      </button>
                      {rawTextExpanded && (
                        <pre className="small bg-light p-2 mt-1 rounded" style={{ maxHeight: 250, overflow: 'auto', fontSize: '0.65rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{extracted.rawText || '(no text extracted)'}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card h-100 d-flex align-items-center justify-content-center text-muted">
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-pdf display-4 mb-3"></i>
                  <p>Upload a PDF to auto-extract data</p>
                  <small>Or switch to <strong>Manual</strong> mode to type directly</small>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual mode form */}
      {mode === 'manual' && docType && (
        <div className="card mt-3">
          <div className="card-body">
            <h6 className="mb-3">
              <i className={`bi ${docTypes.find(d => d.value === docType)?.icon} me-2`}></i>
              {docTypes.find(d => d.value === docType)?.label} — Manual Entry
            </h6>
            <div className="row g-2">
              {activeFields.map(field => (
                <div key={field} className="col-md-4 col-lg-3">
                  <label className="form-label small">{fieldLabels[field] || field}</label>
                  <input className="form-control form-control-sm" value={editable[field] || ''}
                    onChange={e => setEditable({ ...editable, [field]: e.target.value })} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary mt-3" onClick={handleManualCreate} disabled={creating}>
              {creating ? 'Creating...' : <><i className="bi bi-check-lg"></i> Create Booking from Data</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
