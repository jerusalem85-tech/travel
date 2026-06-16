import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_id: '',
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments?page=${page}`);
      setPayments(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل المدفوعات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers')
      ]);
      setInvoices(invRes.data.rows || invRes.data || []);
      setCustomers(custRes.data.rows || custRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dropdowns', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      const fetchInvoicesByCustomer = async () => {
        try {
          const res = await api.get(`/invoices?customer_id=${formData.customer_id}`);
          setInvoices(res.data.rows || res.data || []);
        } catch (err) {
          setInvoices([]);
        }
      };
      fetchInvoicesByCustomer();
    }
  }, [formData.customer_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      invoice_id: '',
      amount: '',
      payment_method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_id) {
      Swal.fire('تنبيه', 'اختر الفاتورة', 'warning');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      Swal.fire('تنبيه', 'أدخل مبلغ صحيح', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/payments', {
        invoice_id: Number(formData.invoice_id),
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        reference: formData.reference,
        notes: formData.notes
      });
      Swal.fire({
        title: 'تم الإضافة',
        text: 'تم تسجيل الدفعة بنجاح',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      setShowModal(false);
      resetForm();
      fetchPayments();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل تسجيل الدفعة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, paymentNumber) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: `سيتم حذف الدفعة ${paymentNumber}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/payments/${id}`);
          Swal.fire('تم الحذف', 'تم حذف الدفعة بنجاح', 'success');
          fetchPayments();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف الدفعة', 'error');
        }
      }
    });
  };

  const totalPages = Math.ceil(total / limit);

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: 'نقدي',
      card: 'بطاقة ائتمان',
      transfer: 'تحويل بنكي',
      check: 'شيك',
      other: 'أخرى'
    };
    return methods[method] || method;
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-cash-stack me-2"></i>
          المدفوعات
        </h4>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i>
          إضافة دفعة
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد مدفوعات
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>رقم الدفعة</th>
                      <th>المبلغ</th>
                      <th>طريقة الدفع</th>
                      <th>المرجع</th>
                      <th>رقم الفاتورة</th>
                      <th>العميل</th>
                      <th>التاريخ</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td><code>{p.payment_number}</code></td>
                        <td className="fw-bold text-success">
                          {Number(p.amount).toLocaleString()} ر.س
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {getPaymentMethodLabel(p.payment_method)}
                          </span>
                        </td>
                        <td>{p.reference || '-'}</td>
                        <td><code>{p.invoice_number || '-'}</code></td>
                        <td>{p.customer_name || '-'}</td>
                        <td>{new Date(p.created_at).toLocaleDateString('ar-SA')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(p.id, p.payment_number)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav>
                  <ul className="pagination justify-content-center mb-0">
                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page - 1)}>
                        <i className="bi bi-chevron-right"></i>
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>
                              {p}
                            </button>
                          </li>
                        </React.Fragment>
                      ))}
                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                      <button className="page-link" onClick={() => setPage(page + 1)}>
                        <i className="bi bi-chevron-left"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Payment Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  إضافة دفعة جديدة
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => { setShowModal(false); resetForm(); }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">العميل (اختياري للتصفية)</label>
                    <select
                      className="form-select"
                      name="customer_id"
                      value={formData.customer_id}
                      onChange={handleChange}
                    >
                      <option value="">جميع العملاء</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {c.phone}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">الفاتورة <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="invoice_id"
                      value={formData.invoice_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">اختر الفاتورة</option>
                      {invoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {inv.customer_name} ({Number(inv.total_amount).toLocaleString()} ر.س)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">المبلغ <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        required
                      />
                      <span className="input-group-text">ر.س</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">طريقة الدفع</label>
                    <select
                      className="form-select"
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                    >
                      <option value="cash">نقدي</option>
                      <option value="card">بطاقة ائتمان</option>
                      <option value="transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">المرجع</label>
                    <input
                      type="text"
                      className="form-control"
                      name="reference"
                      value={formData.reference}
                      onChange={handleChange}
                      placeholder="رقم المرجع أو التحويل..."
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">ملاحظات</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="2"
                      placeholder="ملاحظات إضافية..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        حفظ الدفعة
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
