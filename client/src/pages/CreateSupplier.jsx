import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const supplierTypes = [
  { value: 'airline', label: 'Airline', icon: 'bi-airplane' },
  { value: 'hotel', label: 'Hotel', icon: 'bi-building' },
  { value: 'visa_provider', label: 'Visa Provider', icon: 'bi-file-earmark-text' },
  { value: 'insurance_provider', label: 'Insurance Provider', icon: 'bi-shield-check' },
  { value: 'transfer_provider', label: 'Transport Provider', icon: 'bi-car-front' },
  { value: 'tour_provider', label: 'Tour Provider', icon: 'bi-map' },
  { value: 'other', label: 'Other', icon: 'bi-three-dots' },
];

export default function CreateSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', contact_person: '', address: '', notes: '' });
  const [types, setTypes] = useState([]);

  const toggleType = (v) => setTypes(p => p.includes(v) ? p.filter(t => t !== v) : [...p, v]);

  useEffect(() => {
    if (isEdit) {
      api.get(`/suppliers/${id}`).then(res => {
        const s = res.data;
        setForm({ name: s.name || '', phone: s.phone || '', email: s.email || '', contact_person: s.contact_person || '', address: s.address || '', notes: s.notes || '' });
        setTypes(s.type ? s.type.split(',').map(t => t.trim()) : []);
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return Swal.fire('Required', 'Enter supplier name', 'warning');
    setSaving(true);
    try {
      const payload = { ...form, type: types.join(',') };
      if (isEdit) { await api.put(`/suppliers/${id}`, payload); }
      else { const r = await api.post('/suppliers', payload); }
      Swal.fire({ icon: 'success', title: isEdit ? 'Updated' : 'Created', timer: 1500, showConfirmButton: false });
      navigate(isEdit ? `/suppliers/${id}` : '/suppliers');
    } catch (e) { Swal.fire('Error', e.response?.data?.error || 'Failed', 'error'); } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate(isEdit ? `/suppliers/${id}` : '/suppliers')}>Back</button>
      </div>
      <div className="card"><div className="card-body"><form onSubmit={handleSubmit}><div className="row g-3">
        <div className="col-md-6"><label className="form-label">Name <span className="text-danger">*</span></label><input className="form-control" name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        <div className="col-md-6"><label className="form-label">Email</label><input type="email" className="form-control" name="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" name="contact_person" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
        <div className="col-12"><label className="form-label">Supplier Types</label>
          <div className="d-flex flex-wrap gap-2 p-2 border rounded">
            {supplierTypes.map(t => (
              <label key={t.value} className={`btn btn-sm ${types.includes(t.value) ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ cursor: 'pointer' }}>
                <input type="checkbox" className="d-none" checked={types.includes(t.value)} onChange={() => toggleType(t.value)} />
                <i className={`bi ${t.icon} me-1`}></i>{t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows="2" name="address" value={form.address} onChange={e => setForm({...form, address: e.target.value})}></textarea></div>
        <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea></div>
        <div className="col-12"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="bi bi-check-lg"></i> {isEdit ? 'Update' : 'Create'} Supplier</>}</button></div>
      </div></form></div></div>
    </div>
  );
}
