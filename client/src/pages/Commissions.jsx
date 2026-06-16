import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';

const Commissions = () => {
  const [commissions, setCommissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [formData, setFormData] = useState({
    user_id: '',
    booking_id: '',
    commission_type: 'sales',
    amount: '',
    currency: 'SAR',
    percentage: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      if (userIdFilter) params.append('user_id', userIdFilter);
      const res = await api.get(`/commissions?${params.toString()}`);
      setCommissions(res.data.rows || []);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل العمولات', 'error');
    } finally {
      setLoading(false);
    }
  }, [userIdFilter]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.rows || res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      booking_id: '',
      commission_type: 'sales',
      amount: '',
      currency: 'SAR',
      percentage: '',
      notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id) {
      Swal.fire('تنبيه', 'اختر المستخدم', 'warning');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      Swal.fire('تنبيه', 'أدخل مبلغ صحيح', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/commissions', {
        user_id: Number(formData.user_id),
        booking_id: formData.booking_id ? Number(formData.booking_id) : null,
        commission_type: formData.commission_type,
        amount: Number(formData.amount),
        currency: formData.currency,
        percentage: formData.percentage ? Number(formData.percentage) : null,
        notes: formData.notes
      });
      Swal.fire({ title: 'تم الإضافة', text: 'تم إضافة العمولة بنجاح', icon: 'success', timer: 2000, showConfirmButton: false });
      setShowModal(false);
      resetForm();
      fetchCommissions();
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل إضافة العمولة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذه العمولة',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/commissions/${id}`);
          Swal.fire('تم الحذف', 'تم حذف العمولة بنجاح', 'success');
          fetchCommissions();
        } catch (err) {
          Swal.fire('خطأ', 'فشل حذف العمولة', 'error');
        }
      }
    });
  };

  const getTypeLabel = (type) => {
    const map = { sales: 'مبيعات', referral: 'إحالة', bonus: 'مكافأة' };
    return map[type] || type;
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-cash-coin me-2"></i>
          العمولات
        </h4>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <i className="bi bi-plus-lg me-1"></i>
          إضافة عمولة
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">تصفية بالمستخدم</label>
              <select className="form-select" value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value)}>
                <option value="">جميع المستخدمين</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.username}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => setUserIdFilter('')}>
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
          ) : commissions.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox fs-1 d-block mb-2"></i>
              لا توجد عمولات
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المستخدم</th>
                    <th>رقم الحجز</th>
                    <th>النوع</th>
                    <th>النسبة %</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td className="fw-bold">{c.user_name}</td>
                      <td><code>{c.booking_number || '-'}</code></td>
                      <td><span className="badge bg-light text-dark">{getTypeLabel(c.commission_type)}</span></td>
                      <td>{c.percentage ? `${Number(c.percentage).toFixed(2)}%` : '-'}</td>
                      <td className="fw-bold text-success">{Number(c.amount).toLocaleString()} {c.currency || 'ر.س'}</td>
                      <td>{new Date(c.created_at).toLocaleDateString('ar-SA')}</td>
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
          )}
        </div>
      </div>

      {/* Add Commission Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-plus-circle me-2"></i>
                  إضافة عمولة جديدة
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">المستخدم <span className="text-danger">*</span></label>
                    <select className="form-select" name="user_id" value={formData.user_id} onChange={handleChange} required>
                      <option value="">اختر المستخدم</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.username}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">رقم الحجز (اختياري)</label>
                    <input type="number" className="form-control" name="booking_id" value={formData.booking_id} onChange={handleChange} placeholder="رقم الحجز..." />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">نوع العمولة <span className="text-danger">*</span></label>
                    <select className="form-select" name="commission_type" value={formData.commission_type} onChange={handleChange}>
                      <option value="sales">مبيعات</option>
                      <option value="referral">إحالة</option>
                      <option value="bonus">مكافأة</option>
                    </select>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">المبلغ <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <input type="number" className="form-control" name="amount" value={formData.amount} onChange={handleChange} min="0" step="0.01" placeholder="0.00" required />
                        <span className="input-group-text">ر.س</span>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">العملة</label>
                      <select className="form-select" name="currency" value={formData.currency} onChange={handleChange}>
                        <option value="SAR">ريال سعودي</option>
                        <option value="USD">دولار أمريكي</option>
                        <option value="EUR">يورو</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">النسبة المئوية (%)</label>
                    <input type="number" className="form-control" name="percentage" value={formData.percentage} onChange={handleChange} min="0" max="100" step="0.01" placeholder="0.00" />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">ملاحظات</label>
                    <textarea className="form-control" name="notes" value={formData.notes} onChange={handleChange} rows="2" placeholder="ملاحظات..."></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>إلغاء</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...</>
                    ) : (
                      <><i className="bi bi-check-lg me-1"></i>حفظ العمولة</>
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

export default Commissions;
