import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateCustomer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    id_number: '',
    passport_number: '',
    nationality: '',
    address: '',
    notes: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/customers', form);
      Swal.fire({ icon: 'success', title: 'تم إنشاء العميل بنجاح', timer: 1500, showConfirmButton: false });
      navigate(`/customers/${res.data.id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: err.response?.data?.error || 'حدث خطأ أثناء إنشاء العميل' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">عميل جديد</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/customers')}>رجوع</button>
      </div>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">الاسم الكامل <span className="text-danger">*</span></label>
                <input type="text" className="form-control" name="full_name" value={form.full_name} onChange={handleChange} required />
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
                <label className="form-label">رقم الهوية</label>
                <input type="text" className="form-control" name="id_number" value={form.id_number} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">رقم جواز السفر</label>
                <input type="text" className="form-control" name="passport_number" value={form.passport_number} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">الجنسية</label>
                <input type="text" className="form-control" name="nationality" value={form.nationality} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">العنوان</label>
                <input type="text" className="form-control" name="address" value={form.address} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
            <div className="mt-3">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...</> : <><i className="bi bi-check-lg"></i> إنشاء العميل</>}
              </button>
              <button type="button" className="btn btn-outline-secondary me-2" onClick={() => navigate('/customers')}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
