import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    booking_id: '',
    total_amount: '',
    notes: ''
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data.rows || res.data || []);
      } catch (err) {
        Swal.fire('خطأ', 'فشل تحميل العملاء', 'error');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      const fetchBookings = async () => {
        try {
          const res = await api.get(`/bookings?customer_id=${formData.customer_id}`);
          setBookings(res.data.rows || res.data || []);
        } catch (err) {
          setBookings([]);
        }
      };
      fetchBookings();
    } else {
      setBookings([]);
    }
  }, [formData.customer_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_id) {
      Swal.fire('تنبيه', '请选择 العميل', 'warning');
      return;
    }
    if (!formData.total_amount || Number(formData.total_amount) <= 0) {
      Swal.fire('تنبيه', 'أدخل مبلغ صحيح', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: Number(formData.customer_id),
        total_amount: Number(formData.total_amount),
        notes: formData.notes
      };
      if (formData.booking_id) {
        payload.booking_id = Number(formData.booking_id);
      }
      await api.post('/invoices', payload);
      Swal.fire({
        title: 'تم الإنشاء',
        text: 'تم إنشاء الفاتورة بنجاح',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      navigate('/invoices');
    } catch (err) {
      Swal.fire('خطأ', err.response?.data?.message || 'فشل إنشاء الفاتورة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          إنشاء فاتورة جديدة
        </h4>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate('/invoices')}
        >
          <i className="bi bi-arrow-right me-1"></i>
          رجوع
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">العميل <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">اختر العميل</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">الرحلة (اختياري)</label>
                  <select
                    className="form-select"
                    name="booking_id"
                    value={formData.booking_id}
                    onChange={handleChange}
                  >
                    <option value="">بدون رحلة</option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.booking_number} - {b.from_destination} إلى {b.to_destination}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">المبلغ الإجمالي <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      name="total_amount"
                      value={formData.total_amount}
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
                  <label className="form-label">ملاحظات</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="ملاحظات إضافية..."
                  ></textarea>
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        إنشاء الفاتورة
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/invoices')}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-info-circle me-1"></i>
                معلومات
              </h6>
              <ul className="list-unstyled mb-0 small text-muted">
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  اختر العميل أولاً لعرض رحلاته
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  اختيار الرحلة اختياري لكنه يُفضل
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle text-success me-1"></i>
                  يمكن إضافة مدفوعات لاحقاً من صفحة الفاتورة
                </li>
                <li>
                  <i className="bi bi-check-circle text-success me-1"></i>
                  حالة الفاتورة تلقائية حسب المدفوعات
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
