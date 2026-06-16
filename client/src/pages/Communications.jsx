import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Communications = () => {
  const [communications, setCommunications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [customerFilter, setCustomerFilter] = useState('');
  const [formData, setFormData] = useState({
    customer_id: '',
    communication_type: 'email',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (customerFilter) params.append('customer_id', customerFilter);
      const res = await api.get(`/communications?${params.toString()}`);
      setCommunications(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل الاتصالات', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.rows || res.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      communication_type: 'email',
      subject: '',
      message: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id) {
      Swal.fire('تنبيه', 'اختر العميل', 'warning');
      return;
    }
    if (!formData.subject.trim()) {
      Swal.fire('تنبيه', 'أدخل الموضوع', 'warning');
      return;
    }
    if (!formData.message.trim()) {
      Swal.fire('تنبيه', 'أدخل الرسالة', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/communications', {
        customer_id: Number(formData.customer_id),
        communication_type: formData.communication_type,
        subject: formData.subject,
        message: formData.message
      });
      Swal.fire({ title: 'تم الإضافة', text: 'تم تسجيل الاتصال بنجاح', icon: 'success', timer: 2000, showConfirmButton: false });
      setShowModal(false);
      resetForm();
      fetchCommunications();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل تسجيل الاتصال', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذا الاتصال',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/communications/${id}`);
          Swal.fire('تم الحذف', 'تم حذف الاتصال بنجاح', 'success');
          fetchCommunications();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف الاتصال', 'error');
        }
      }
    });
  };

  const getTypeIcon = (type) => {
    const map = {
      email: 'bi-envelope',
      phone: 'bi-telephone',
      whatsapp: 'bi-whatsapp',
      meeting: 'bi-people'
    };
    return map[type] || 'bi-chat';
  };

  const getTypeLabel = (type) => {
    const map = {
      email: 'بريد إلكتروني',
      phone: 'مكالمة هاتفية',
      whatsapp: 'واتساب',
      meeting: 'اجتماع'
    };
    return map[type] || type;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-chat-dots me-2"></i>
          سجل الاتصالات
        </h4>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1"></i>
          إضافة اتصال
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">تصفية بالعميل</label>
              <select className="form-select" value={customerFilter} onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}>
                <option value="">جميع العملاء</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setCustomerFilter(''); setPage(1); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">جاري التحميل...</span>
              </div>
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد اتصالات
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>العميل</th>
                      <th>نوع الاتصال</th>
                      <th>الموضوع</th>
                      <th>الرسالة</th>
                      <th>التاريخ</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communications.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td className="fw-bold">{c.customer_name}</td>
                        <td>
                          <span className="badge bg-light text-dark">
                            <i className={`bi ${getTypeIcon(c.communication_type)} me-1`}></i>
                            {getTypeLabel(c.communication_type)}
                          </span>
                        </td>
                        <td style={{ maxWidth: 200 }}>
                          <div className="text-truncate fw-bold">{c.subject}</div>
                        </td>
                        <td style={{ maxWidth: 250 }}>
                          <div className="text-truncate text-muted">{c.message}</div>
                        </td>
                        <td>{new Date(c.sent_at || c.created_at).toLocaleString('ar-SA')}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.id)} title="حذف">
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
                            <li className="page-item disabled"><span className="page-link">...</span></li>
                          )}
                          <li className={`page-item ${page === p ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setPage(p)}>{p}</button>
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

      {/* Add Communication Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  إضافة اتصال جديد
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">العميل <span className="text-danger">*</span></label>
                    <select className="form-select" name="customer_id" value={formData.customer_id} onChange={handleChange} required>
                      <option value="">اختر العميل</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">نوع الاتصال <span className="text-danger">*</span></label>
                    <select className="form-select" name="communication_type" value={formData.communication_type} onChange={handleChange}>
                      <option value="email">بريد إلكتروني</option>
                      <option value="phone">مكالمة هاتفية</option>
                      <option value="whatsapp">واتساب</option>
                      <option value="meeting">اجتماع</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">الموضوع <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="subject" value={formData.subject} onChange={handleChange} placeholder="موضوع الاتصال..." required />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">الرسالة <span className="text-danger">*</span></label>
                    <textarea className="form-control" name="message" value={formData.message} onChange={handleChange} rows="4" placeholder="محتوى الرسالة..." required></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>حفظ الاتصال</>
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

export default Communications;
