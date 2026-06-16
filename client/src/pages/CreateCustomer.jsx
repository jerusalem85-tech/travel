import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', id_number: '', passport_number: '', nationality: '', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/customers', form);
    navigate(`/customers/${res.data.id}`);
  };

  return (
    <div>
      <h5 className="page-title mb-3">عميل جديد</h5>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">الاسم كامل <span className="text-danger">*</span></label>
                <input className="form-control" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
              </div>
              <div className="col-md-3">
                <label className="form-label">رقم الهاتف</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">البريد الإلكتروني</label>
                <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">رقم الهوية</label>
                <input className="form-control" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">رقم الجواز</label>
                <input className="form-control" value={form.passport_number} onChange={e => setForm({...form, passport_number: e.target.value})} />
              </div>
              <div className="col-md-3">
                <label className="form-label">الجنسية</label>
                <input className="form-control" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary">حفظ</button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/customers')}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
