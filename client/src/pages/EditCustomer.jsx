import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function EditCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`).then(res => {
      const c = res.data;
      setForm({ full_name: c.full_name, phone: c.phone || '', email: c.email || '', id_number: c.id_number || '', passport_number: c.passport_number || '', nationality: c.nationality || '', notes: c.notes || '' });
    });
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.put(`/customers/${id}`, form);
    navigate(`/customers/${id}`);
  };

  if (!form) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <h5 className="page-title mb-3">تعديل العميل</h5>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label">الاسم <span className="text-danger">*</span></label><input className="form-control" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
              <div className="col-md-3"><label className="form-label">الهاتف</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="col-md-3"><label className="form-label">البريد</label><input className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div className="col-md-3"><label className="form-label">رقم الهوية</label><input className="form-control" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} /></div>
              <div className="col-md-3"><label className="form-label">رقم الجواز</label><input className="form-control" value={form.passport_number} onChange={e => setForm({...form, passport_number: e.target.value})} /></div>
              <div className="col-md-3"><label className="form-label">الجنسية</label><input className="form-control" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})} /></div>
              <div className="col-12"><label className="form-label">ملاحظات</label><textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea></div>
            </div>
            <div className="mt-3"><button type="submit" className="btn btn-primary">حفظ</button><button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate(`/customers/${id}`)}>إلغاء</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
