import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function ShowBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'نقداً', notes: '' });

  const load = () => api.get(`/bookings/${id}`).then(res => setBooking(res.data));

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    Swal.fire({ title: 'تأكيد الحذف', text: 'سيتم حذف الحجز وكل البيانات المرتبطة به', icon: 'warning', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء' }).then(r => {
      if (r.isConfirmed) api.delete(`/bookings/${id}`).then(() => navigate('/bookings'));
    });
  };

  const recordPayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return;
    await api.post('/payments', { booking_id: parseInt(id), amount: parseFloat(payForm.amount), payment_method: payForm.payment_method, notes: payForm.notes });
    setShowPayModal(false);
    setPayForm({ amount: '', payment_method: 'نقداً', notes: '' });
    load();
  };

  const statusBadge = (status) => {
    const colors = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' };
    const labels = { confirmed: 'مؤكد', pending: 'معلق', cancelled: 'ملغي', completed: 'مكتمل' };
    return <span className={`badge bg-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>;
  };

  const serviceTypeLabel = (type) => {
    const labels = { flight: 'طيران', hotel: 'فندق', visa: 'تأشيرة', tour: 'جولة', transport: 'نقل', other: 'أخرى' };
    return labels[type] || type || '-';
  };

  if (!booking) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  const remaining = (booking.total_amount || 0) - (booking.paid_amount || 0);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">حجز #{booking.booking_number}</h5>
        <div>
          <button className="btn btn-success me-2" onClick={() => setShowPayModal(true)}><i className="bi bi-cash"></i> تسجيل دفعة</button>
          <Link to={`/bookings/${id}/edit`} className="btn btn-warning me-2"><i className="bi bi-pencil"></i> تعديل</Link>
          <button className="btn btn-danger me-2" onClick={handleDelete}><i className="bi bi-trash"></i> حذف</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/bookings')}>رجوع</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h6>معلومات الحجز</h6>
              <div className="row g-2">
                <div className="col-6 col-md-3">
                  <small className="text-secondary">العميل</small>
                  <p className="mb-0">{booking.customer_name}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">نوع الخدمة</small>
                  <p className="mb-0">{serviceTypeLabel(booking.service_type)}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">الحالة</small>
                  <p className="mb-0">{statusBadge(booking.status)}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">من - إلى</small>
                  <p className="mb-0">{booking.from_destination && booking.to_destination ? `${booking.from_destination} → ${booking.to_destination}` : '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">تاريخ السفر</small>
                  <p className="mb-0">{booking.travel_date || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">تاريخ العودة</small>
                  <p className="mb-0">{booking.return_date || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">الشركة</small>
                  <p className="mb-0">{booking.airline || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">رقم الرحلة</small>
                  <p className="mb-0">{booking.flight_number || '-'}</p>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-secondary">رقم التذكرة</small>
                  <p className="mb-0">{booking.ticket_number || '-'}</p>
                </div>
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
              <div className="d-flex justify-content-around mt-3">
                <div><small className="text-success">مدفوع</small><h5>{booking.paid_amount?.toLocaleString()}</h5></div>
                <div><small className="text-danger">متبقي</small><h5>{remaining.toLocaleString()}</h5></div>
              </div>
              {booking.cost_amount > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <small className="text-secondary">التكلفة</small>
                  <h5 className="mb-0">{booking.cost_amount?.toLocaleString()}</h5>
                </div>
              )}
              {booking.profit_amount != null && (
                <div className="mt-1">
                  <small className="text-secondary">الربح</small>
                  <h5 className={`mb-0 ${booking.profit_amount >= 0 ? 'text-success' : 'text-danger'}`}>{booking.profit_amount?.toLocaleString()}</h5>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>المسافرون ({booking.passengers?.length || 0})</h6>
              {booking.passengers?.length === 0 && <p className="text-secondary mb-0">لا يوجد مسافرون</p>}
              {booking.passengers?.map((p, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <strong>{p.name}</strong>
                    <br />
                    <small className="text-secondary">
                      {p.passport && `جواز: ${p.passport}`}
                      {p.nationality && ` - ${p.nationality}`}
                      {p.type === 'child' && ' - طفل'}
                      {p.type === 'infant' && ' - رضيع'}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>الخدمات ({booking.services?.length || 0})</h6>
              {booking.services?.length === 0 && <p className="text-secondary mb-0">لا توجد خدمات</p>}
              {booking.services?.map((s, i) => (
                <div key={i} className="d-flex justify-content-between align-items-center border-bottom py-2">
                  <div>
                    <strong>{s.description}</strong>
                    {s.supplier_name && <><br /><small className="text-secondary">المورد: {s.supplier_name}</small></>}
                  </div>
                  <div className="text-end">
                    {s.cost > 0 && <div><small className="text-danger">التكلفة: {s.cost?.toLocaleString()}</small></div>}
                    {s.price > 0 && <div><small className="text-success">السعر: {s.price?.toLocaleString()}</small></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>المدفوعات ({booking.payments?.length || 0})</h6>
          {booking.payments?.length === 0 && <p className="text-secondary mb-0">لا توجد مدفوعات</p>}
          {booking.payments?.map(p => (
            <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <div>
                <strong>{p.payment_number}</strong>
                <br />
                <small>{p.payment_method} {p.notes && `- ${p.notes}`}</small>
              </div>
              <span className="text-success">{p.amount?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {showPayModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header"><h6 className="modal-title">تسجيل دفعة</h6><button className="btn-close" onClick={() => setShowPayModal(false)}></button></div>
              <div className="modal-body">
                <div className="mb-2"><label className="form-label">المبلغ</label><input type="number" className="form-control" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} /></div>
                <div className="mb-2"><label className="form-label">طريقة الدفع</label>
                  <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({...payForm, payment_method: e.target.value})}>
                    <option>نقداً</option><option>تحويل بنكي</option><option>شبكة</option><option>بطاقة ائتمان</option>
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">ملاحظات</label><input className="form-control" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>إلغاء</button>
                <button className="btn btn-primary" onClick={recordPayment}>تسجيل الدفعة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
