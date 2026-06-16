import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ShowBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/bookings/${id}`).then(res => setBooking(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const addPassenger = async () => {
    const { value: form } = await Swal.fire({
      title: 'إضافة مسافر',
      html: `<input id="name" class="form-control mb-2" placeholder="الاسم"><input id="passport" class="form-control mb-2" placeholder="جواز السفر"><input id="idnum" class="form-control mb-2" placeholder="رقم الهوية"><input id="seat" class="form-control" placeholder="رقم المقعد">`,
      showCancelButton: true, confirmButtonText: 'إضافة', cancelButtonText: 'إلغاء', preConfirm: () => ({
        full_name: document.getElementById('name').value,
        passport_number: document.getElementById('passport').value,
        id_number: document.getElementById('idnum').value,
        seat_number: document.getElementById('seat').value,
      })
    });
    if (form?.full_name) {
      await api.post(`/bookings/${id}/passengers`, form);
      load();
    }
  };

  const addService = async () => {
    const { value: form } = await Swal.fire({
      title: 'إضافة خدمة',
      html: `<input id="stype" class="form-control mb-2" placeholder="نوع الخدمة"><input id="samount" class="form-control mb-2" type="number" placeholder="المبلغ">`,
      showCancelButton: true, confirmButtonText: 'إضافة', cancelButtonText: 'إلغاء', preConfirm: () => ({
        service_type: document.getElementById('stype').value,
        amount: parseFloat(document.getElementById('samount').value) || 0,
      })
    });
    if (form?.service_type) {
      await api.post(`/bookings/${id}/services`, form);
      load();
    }
  };

  const deletePassenger = async (pid) => {
    const r = await Swal.fire({ title: 'تأكيد', text: 'حذف المسافر؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' });
    if (r.isConfirmed) { await api.delete(`/bookings/passengers/${pid}`); load(); }
  };

  const deleteService = async (sid) => {
    const r = await Swal.fire({ title: 'تأكيد', text: 'حذف الخدمة؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' });
    if (r.isConfirmed) { await api.delete(`/bookings/services/${sid}`); load(); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (!booking) return <div className="alert alert-danger">الحجز غير موجود</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">حجز #{booking.booking_number}</h5>
        <div>
          <Link to={`/bookings/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> تعديل</Link>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>رجوع</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h6>معلومات الحجز</h6>
              <div className="row g-2">
                <div className="col-6 col-md-3"><small className="text-secondary">العميل</small><p className="mb-0">{booking.customer_name}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">الحالة</small><p className="mb-0"><span className={`badge bg-${booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'danger' : 'warning'}`}>{booking.status}</span></p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">نوع الخدمة</small><p className="mb-0">{booking.service_type || '-'}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">الوجهة</small><p className="mb-0">{booking.from_destination} → {booking.to_destination}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">تاريخ السفر</small><p className="mb-0">{booking.travel_date || '-'}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">تاريخ العودة</small><p className="mb-0">{booking.return_date || '-'}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">شركة الطيران</small><p className="mb-0">{booking.airline || '-'}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">رقم الرحلة</small><p className="mb-0">{booking.flight_number || '-'}</p></div>
                <div className="col-6 col-md-3"><small className="text-secondary">رقم التذكرة</small><p className="mb-0">{booking.ticket_number || '-'}</p></div>
              </div>
              {booking.notes && <div className="mt-2"><small className="text-secondary">ملاحظات</small><p className="mb-0">{booking.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card bg-primary bg-opacity-10">
            <div className="card-body text-center">
              <h6>المبالغ</h6>
              <h3 className="text-primary">{booking.total_amount?.toLocaleString()}</h3>
              <small>الإجمالي</small>
              <div className="d-flex justify-content-around mt-2">
                <div><small className="text-success">مدفوع</small><br /><strong>{booking.paid_amount?.toLocaleString()}</strong></div>
                <div><small className="text-danger">متبقي</small><br /><strong>{(booking.total_amount - booking.paid_amount)?.toLocaleString()}</strong></div>
              </div>
              <hr />
              <small>التكلفة: {booking.cost_amount?.toLocaleString()} | الربح: {booking.profit_amount?.toLocaleString()}</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">المسافرون</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={addPassenger}><i className="bi bi-plus"></i> إضافة</button>
              </div>
              {booking.passengers?.length === 0 && <p className="text-secondary mb-0">لا يوجد مسافرون</p>}
              {booking.passengers?.map(p => (
                <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div><strong>{p.full_name}</strong><br /><small>{p.passport_number && `جواز: ${p.passport_number}`} {p.id_number && `| هوية: ${p.id_number}`} {p.seat_number && `| مقعد: ${p.seat_number}`}</small></div>
                  <button className="btn btn-sm text-danger" onClick={() => deletePassenger(p.id)}><i className="bi bi-x"></i></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">الخدمات</h6>
                <button className="btn btn-sm btn-outline-primary" onClick={addService}><i className="bi bi-plus"></i> إضافة</button>
              </div>
              {booking.services?.length === 0 && <p className="text-secondary mb-0">لا يوجد خدمات</p>}
              {booking.services?.map(s => (
                <div key={s.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div><strong>{s.service_type}</strong><br /><small>{s.description} {s.supplier_name && `(${s.supplier_name})`}</small></div>
                  <div className="d-flex align-items-center gap-2">
                    <span>{s.amount?.toLocaleString()}</span>
                    <button className="btn btn-sm text-danger" onClick={() => deleteService(s.id)}><i className="bi bi-x"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>المدفوعات</h6>
          {booking.payments?.length === 0 && <p className="text-secondary mb-0">لا يوجد مدفوعات</p>}
          {booking.payments?.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead><tr><th>رقم الدفعة</th><th>المبلغ</th><th>طريقة الدفع</th><th>التاريخ</th></tr></thead>
                <tbody>
                  {booking.payments.map(p => (
                    <tr key={p.id}>
                      <td>{p.payment_number}</td>
                      <td>{p.amount?.toLocaleString()}</td>
                      <td>{p.payment_method || '-'}</td>
                      <td>{p.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
