import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function EditSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: '',
    contact_person: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    api.get(`/suppliers/${id}`).then(res => {
      const s = res.data;
      setForm({
        name: s.name || '',
        phone: s.phone || '',
        email: s.email || '',
        type: s.type || '',
        contact_person: s.contact_person || '',
        address: s.address || '',
        notes: s.notes || '',
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/suppliers/${id}`, form);
      Swal.fire({ icon: 'success', title: 'تم تعديل المورد بنجاح', timer: 1500, showConfirmButton: false });
      navigate(`/suppliers/${id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: err.response?.data?.error || 'حدث خطأ أثناء تعديل المورد' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">تعديل المورد: {form.name}</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate(`/suppliers/${id}`)}>رجوع</button>
      </div>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">اسم المورد <span className="text-danger">*</span></label>
                <input type="text" className="form-control" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">نوع المورد</label>
                <select className="form-select" name="type" value={form.type} onChange={handleChange}>
                  <option value="">اختر النوع...</option>
                  <option value="airline">شركة طيران</option>
                  <option value="hotel">فندق</option>
                  <option value="visa_center">مركز تأشيرات</option>
                  <option value="transport">شركة نقل</option>
                  <option value="tour_operator">مدير جولات</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">رقم الهاتف</label>
                <input type="text" className="form-control" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">البريد الإلكتروني</label>
                <input type="email" className="form-control" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">جهة الاتصال</label>
                <input type="text" className="form-control" name="contact_person" value={form.contact_person} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">العنوان</label>
                <input type="text" className="form-control" name="address" value={form.address} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...</> : <><i className="bi bi-check-lg"></i> حفظ التعديلات</>}
              </button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate(`/suppliers/${id}`)}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
