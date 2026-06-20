import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function AIReader() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleUpload = async () => {
    if (!file) return Swal.fire('Required', 'Select a file', 'warning');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (docType) formData.append('type', docType);
      const res = await api.post('/ai-reader/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExtracted(res.data);
    } catch (e) {
      Swal.fire('Error', e.response?.data?.error || 'Failed to read document', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createRecords = async () => {
    if (!extracted?.extracted) return;
    setCreating(true);
    try {
      const res = await api.post('/ai-reader/create', { extracted: extracted.extracted });
      Swal.fire({ icon: 'success', title: 'Records created!', text: `${res.data.created?.length || 0} records`, timer: 2000, showConfirmButton: false }).then(() => {
        if (res.data.created?.[0]?.id) navigate(`/bookings/${res.data.created[0].id}`);
      });
    } catch (e) {
      Swal.fire('Error', 'Failed to create records', 'error');
    } finally {
      setCreating(false);
    }
  };

  const badgeColor = (conf) => conf >= 70 ? 'success' : conf >= 40 ? 'warning' : 'danger';
  const formatLabel = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">AI Document Reader</h5>
        <small className="text-muted">Upload PDF • Auto-Extract • Create Records</small>
      </div>

      <div className="row g-3">
        <div className="col-md-5">
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Upload Document</h6>
              <div className="mb-2">
                <label className="form-label">Document Type</label>
                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="">Auto-Detect</option>
                  <option value="flight">Flight Ticket</option>
                  <option value="hotel">Hotel Voucher</option>
                  <option value="visa">Visa Document</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">File (PDF, Image)</label>
                <input type="file" className="form-control" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} />
              </div>
              <button className="btn btn-primary w-100" disabled={!file || loading} onClick={handleUpload}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1"></span> Reading...</> : <><i className="bi bi-magic"></i> Extract Data</>}
              </button>

              <hr />
              <div className="small text-muted">
                <strong>Supported:</strong> Airline tickets, hotel vouchers, visa documents<br />
                <strong>Extracts:</strong> Names, flight numbers, PNR, dates, airports, hotels
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          {extracted ? (
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-3">
                  <h6 className="mb-0">
                    <span className={`badge bg-${badgeColor(extracted.extracted?.confidence)} me-2`}>{extracted.extracted?.confidence || 0}%</span>
                    {extracted.extracted?.type?.toUpperCase()} Document
                  </h6>
                  <button className="btn btn-success btn-sm" onClick={createRecords} disabled={creating}>
                    {creating ? 'Creating...' : <><i className="bi bi-check-lg"></i> Create Records</>}
                  </button>
                </div>

                {extracted.extracted && Object.entries(extracted.extracted)
                  .filter(([k]) => !['type', 'confidence'].includes(k) && extracted.extracted[k])
                  .map(([key, val]) => (
                    <div key={key} className="d-flex justify-content-between border-bottom py-1">
                      <span className="text-muted small">{formatLabel(key)}</span>
                      <span className="fw-semibold small">{val}</span>
                    </div>
                  ))}

                {extracted.rawText && (
                  <details className="mt-3">
                    <summary className="text-muted small">Raw text preview</summary>
                    <pre className="small bg-light p-2 mt-1 rounded" style={{ maxHeight: 200, overflow: 'auto', fontSize: '0.7rem' }}>{extracted.rawText}</pre>
                  </details>
                )}
              </div>
            </div>
          ) : (
            <div className="card h-100 d-flex align-items-center justify-content-center text-muted">
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-pdf display-4 mb-3"></i>
                <p>Upload a PDF to extract data automatically</p>
                <small>Flight tickets, hotel vouchers, visas</small>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
