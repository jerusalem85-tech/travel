import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateSupplier() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', service_type: '', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/suppliers', form);
    navigate(`/suppliers/${res.data.id}`);
  };

  return (
    <div>
      <h5 className="page-title mb-3">مورد جديد</h5>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">اسم المورد <span className="text-danger">*</span></label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div className="col-md-6"><label className="form-label">جهة الاتصال</label><input className="form-control" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} /></div>
              <div className="col-md-4"><label className="form-label">الهاتف</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="col-md-4"><label className="form-label">البريد</label><input className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="col-md-4"><label className="form-label">نوع الخدمة</label><input className="form-control" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} /></div>
              <div className="col-12"><label className="form-label">ملاحظات</label><textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea></div>
            </div>
            <div className="mt-3"><button type="submit" className="btn btn-primary">حفظ</button><button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/suppliers')}>إلغاء</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
