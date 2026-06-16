import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ShowInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'نقداً', notes: '' });

  const load = () => api.get(`/invoices/${id}`).then(res => setInvoice(res.data));

  useEffect(() => { load(); api.get('/customers', { params: { limit: 1000 } }).then(res => setCustomers(res.data.rows)); }, [id]);

  const recordPayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return;
    await api.post('/payments', { invoice_id: parseInt(id), amount: parseFloat(payForm.amount), payment_method: payForm.payment_method, notes: payForm.notes });
    setShowPayModal(false);
    setPayForm({ amount: '', payment_method: 'نقداً', notes: '' });
    load();
  };

  if (!invoice) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="page-title mb-0">فاتورة #{invoice.invoice_number}</h5>
        <div>
          <button className="btn btn-success me-2" onClick={() => setShowPayModal(true)}><i className="bi bi-cash"></i> تسجيل دفعة</button>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/invoices')}>رجوع</button>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h6>معلومات الفاتورة</h6>
              <div className="row g-2">
                <div className="col-6"><small className="text-secondary">العميل</small><p className="mb-0">{invoice.customer_name}</p></div>
                <div className="col-6"><small className="text-secondary">رقم الحجز</small><p className="mb-0">{invoice.booking_number || '-'}</p></div>
                <div className="col-6"><small className="text-secondary">الحالة</small><p className="mb-0">{invoice.status === 'paid' ? <span className="badge bg-success">مدفوع</span> : invoice.status === 'partial' ? <span className="badge bg-warning">جزئي</span> : <span className="badge bg-danger">غير مدفوع</span>}</p></div>
                <div className="col-6"><small className="text-secondary">التاريخ</small><p className="mb-0">{invoice.created_at?.substring(0, 10)}</p></div>
              </div>
              {invoice.notes && <div className="mt-2"><small className="text-secondary">ملاحظات</small><p className="mb-0">{invoice.notes}</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-primary bg-opacity-10">
            <div className="card-body text-center">
              <h6>المبالغ</h6>
              <h3 className="text-primary">{invoice.total_amount?.toLocaleString()}</h3>
              <small>إجمالي الفاتورة</small>
              <div className="d-flex justify-content-around mt-3">
                <div><small className="text-success">مدفوع</small><h5>{invoice.paid_amount?.toLocaleString()}</h5></div>
                <div><small className="text-danger">متبقي</small><h5>{(invoice.total_amount - invoice.paid_amount)?.toLocaleString()}</h5></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h6>المدفوعات ({invoice.payments?.length || 0})</h6>
          {invoice.payments?.length === 0 && <p className="text-secondary mb-0">لا يوجد مدفوعات</p>}
          {invoice.payments?.map(p => (
            <div key={p.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <div><strong>{p.payment_number}</strong><br /><small>{p.payment_method} {p.notes && `- ${p.notes}`}</small></div>
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
