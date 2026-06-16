import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateBooking() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    service_type: '',
    from_destination: '',
    to_destination: '',
    travel_date: '',
    return_date: '',
    airline: '',
    flight_number: '',
    ticket_number: '',
    total_amount: '',
    cost_amount: '',
    notes: '',
  });
  const [passengers, setPassengers] = useState([{ name: '', passport: '', nationality: '', type: 'adult' }]);
  const [services, setServices] = useState([{ description: '', supplier_id: '', cost: '', price: '' }]);

  useEffect(() => {
    api.get('/customers', { params: { limit: 1000 } }).then(res => setCustomers(res.data.rows));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addPassenger = () => {
    setPassengers([...passengers, { name: '', passport: '', nationality: '', type: 'adult' }]);
  };

  const removePassenger = (index) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = value;
    setPassengers(updated);
  };

  const addService = () => {
    setServices([...services, { description: '', supplier_id: '', cost: '', price: '' }]);
  };

  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index, field, value) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        cost_amount: form.cost_amount ? parseFloat(form.cost_amount) : null,
        passengers: passengers.filter(p => p.name.trim() !== ''),
        services: services.filter(s => s.description.trim() !== '').map(s => ({
          ...s,
          cost: s.cost ? parseFloat(s.cost) : null,
          price: s.price ? parseFloat(s.price) : null,
        })),
      };
      const res = await api.post('/bookings', payload);
      Swal.fire({ icon: 'success', title: 'تم إنشاء الحجز بنجاح', timer: 1500, showConfirmButton: false });
      navigate(`/bookings/${res.data.id}`);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'خطأ', text: err.response?.data?.error || 'حدث خطأ أثناء إنشاء الحجز' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">حجز جديد</h5>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>رجوع</button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-title mb-3">معلومات الحجز</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">العميل <span className="text-danger">*</span></label>
                <select className="form-select" name="customer_id" value={form.customer_id} onChange={handleChange} required>
                  <option value="">اختر عميل...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">نوع الخدمة <span className="text-danger">*</span></label>
                <select className="form-select" name="service_type" value={form.service_type} onChange={handleChange} required>
                  <option value="">اختر نوع الخدمة...</option>
                  <option value="flight">طيران</option>
                  <option value="hotel">فندق</option>
                  <option value="visa">تأشيرة</option>
                  <option value="tour">جولة</option>
                  <option value="transport">نقل</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">من</label>
                <input type="text" className="form-control" name="from_destination" value={form.from_destination} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">إلى</label>
                <input type="text" className="form-control" name="to_destination" value={form.to_destination} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">تاريخ السفر</label>
                <input type="date" className="form-control" name="travel_date" value={form.travel_date} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="form-label">تاريخ العودة</label>
                <input type="date" className="form-control" name="return_date" value={form.return_date} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">شركة الطيران</label>
                <input type="text" className="form-control" name="airline" value={form.airline} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">رقم الرحلة</label>
                <input type="text" className="form-control" name="flight_number" value={form.flight_number} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">رقم التذكرة</label>
                <input type="text" className="form-control" name="ticket_number" value={form.ticket_number} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">المبلغ الإجمالي</label>
                <input type="number" step="0.01" className="form-control" name="total_amount" value={form.total_amount} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <label className="form-label">التكلفة</label>
                <input type="number" step="0.01" className="form-control" name="cost_amount" value={form.cost_amount} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-control" rows="2" name="notes" value={form.notes} onChange={handleChange}></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">المسافرون</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addPassenger}><i className="bi bi-plus"></i> إضافة مسافر</button>
            </div>
            {passengers.map((p, i) => (
              <div key={i} className="row g-2 mb-2 align-items-end">
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">الاسم</label>}
                  <input type="text" className="form-control" placeholder="اسم المسافر" value={p.name} onChange={e => handlePassengerChange(i, 'name', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">جواز السفر</label>}
                  <input type="text" className="form-control" placeholder="رقم الجواز" value={p.passport} onChange={e => handlePassengerChange(i, 'passport', e.target.value)} />
                </div>
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">الجنسية</label>}
                  <input type="text" className="form-control" placeholder="الجنسية" value={p.nationality} onChange={e => handlePassengerChange(i, 'nationality', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">النوع</label>}
                  <select className="form-select" value={p.type} onChange={e => handlePassengerChange(i, 'type', e.target.value)}>
                    <option value="adult">بالغ</option>
                    <option value="child">طفل</option>
                    <option value="infant">رضيع</option>
                  </select>
                </div>
                <div className="col-md-2">
                  {passengers.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePassenger(i)}><i className="bi bi-trash"></i></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">الخدمات</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addService}><i className="bi bi-plus"></i> إضافة خدمة</button>
            </div>
            {services.map((s, i) => (
              <div key={i} className="row g-2 mb-2 align-items-end">
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">الوصف</label>}
                  <input type="text" className="form-control" placeholder="وصف الخدمة" value={s.description} onChange={e => handleServiceChange(i, 'description', e.target.value)} />
                </div>
                <div className="col-md-3">
                  {i === 0 && <label className="form-label">المورد</label>}
                  <input type="text" className="form-control" placeholder="اسم المورد" value={s.supplier_id} onChange={e => handleServiceChange(i, 'supplier_id', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">التكلفة</label>}
                  <input type="number" step="0.01" className="form-control" placeholder="التكلفة" value={s.cost} onChange={e => handleServiceChange(i, 'cost', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {i === 0 && <label className="form-label">السعر</label>}
                  <input type="number" step="0.01" className="form-control" placeholder="السعر" value={s.price} onChange={e => handleServiceChange(i, 'price', e.target.value)} />
                </div>
                <div className="col-md-2">
                  {services.length > 1 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeService(i)}><i className="bi bi-trash"></i></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner-border spinner-border-sm me-1"></span> جاري الحفظ...</> : <><i className="bi bi-check-lg"></i> إنشاء الحجز</>}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>إلغاء</button>
        </div>
      </form>
    </div>
  );
}
