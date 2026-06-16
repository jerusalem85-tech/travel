import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';

const ShowInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data);
    } catch (err) {
      Swal.fire('خطأ', 'فشل تحميل الفاتورة', 'error');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="badge bg-success fs-6">مدفوعة</span>;
      case 'partial':
        return <span className="badge bg-warning text-dark fs-6">جزئية</span>;
      case 'unpaid':
        return <span className="badge bg-danger fs-6">غير مدفوعة</span>;
      default:
        return <span className="badge bg-secondary fs-6">{status}</span>;
    }
  };

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

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">جاري التحميل...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const remaining = Number(invoice.total_amount) - Number(invoice.paid_amount);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h4 className="mb-0">
          <i className="bi bi-receipt me-2"></i>
          تفاصيل الفاتورة
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate('/invoices')}>
            <i className="bi bi-arrow-right me-1"></i>
            رجوع
          </button>
          <button className="btn btn-outline-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-1"></i>
            طباعة
          </button>
          <Link
            to={`/invoices/${id}/edit`}
            className="btn btn-outline-warning"
          >
            <i className="bi bi-pencil me-1"></i>
            تعديل
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                فاتورة رقم: <code>{invoice.invoice_number}</code>
              </h5>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="card-body">
              <div className="row mb-4">
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">
                    <i className="bi bi-person me-1"></i>
                    معلومات العميل
                  </h6>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '120px' }}>الاسم:</td>
                        <td className="fw-bold">{invoice.customer_name}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">الهاتف:</td>
                        <td>{invoice.customer_phone}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">البريد:</td>
                        <td>{invoice.customer_email || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">
                    <i className="bi bi-info-circle me-1"></i>
                    تفاصيل الفاتورة
                  </h6>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted" style={{ width: '120px' }}>رقم الرحلة:</td>
                        <td>
                          {invoice.booking_number ? (
                            <code>{invoice.booking_number}</code>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">التاريخ:</td>
                        <td>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</td>
                      </tr>
                      {invoice.notes && (
                        <tr>
                          <td className="text-muted">ملاحظات:</td>
                          <td>{invoice.notes}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="row text-center mb-4">
                <div className="col-md-4">
                  <div className="card bg-primary text-white">
                    <div className="card-body">
                      <div className="small text-white-50">المبلغ الإجمالي</div>
                      <h4 className="mb-0">{Number(invoice.total_amount).toLocaleString()} ر.س</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-success text-white">
                    <div className="card-body">
                      <div className="small text-white-50">المبلغ المدفوع</div>
                      <h4 className="mb-0">{Number(invoice.paid_amount).toLocaleString()} ر.س</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-danger text-white">
                    <div className="card-body">
                      <div className="small text-white-50">المتبقي</div>
                      <h4 className="mb-0">{remaining.toLocaleString()} ر.س</h4>
                    </div>
                  </div>
                </div>
              </div>

              <h6 className="text-muted mb-3">
                <i className="bi bi-cash-stack me-1"></i>
                سجل المدفوعات
              </h6>
              {invoice.payments && invoice.payments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>رقم الدفعة</th>
                        <th>المبلغ</th>
                        <th>طريقة الدفع</th>
                        <th>المرجع</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((payment, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><code>{payment.payment_number}</code></td>
                          <td className="fw-bold text-success">
                            {Number(payment.amount).toLocaleString()} ر.س
                          </td>
                          <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                          <td>{payment.reference || '-'}</td>
                          <td>{new Date(payment.created_at).toLocaleDateString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-3 text-muted">
                  <i className="bi bi-inbox fs-4 d-block mb-1"></i>
                  لا توجد مدفوعات بعد
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-4 no-print">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="bi bi-lightning me-1"></i>
                إجراءات سريعة
              </h6>
              <div className="d-grid gap-2">
                <Link
                  to={`/payments?invoice_id=${id}`}
                  className="btn btn-success"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  إضافة دفعة
                </Link>
                <button className="btn btn-outline-primary" onClick={handlePrint}>
                  <i className="bi bi-printer me-1"></i>
                  طباعة الفاتورة
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-light no-print">
            <div className="card-body">
              <h6 className="card-title mb-3">
                <i className="bi bi-pie-chart me-1"></i>
                ملخص الحساب
              </h6>
              <div className="d-flex justify-content-between mb-2">
                <span>الإجمالي:</span>
                <strong>{Number(invoice.total_amount).toLocaleString()} ر.س</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>المدفوع:</span>
                <strong className="text-success">{Number(invoice.paid_amount).toLocaleString()} ر.س</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span>المتبقي:</span>
                <strong className="text-danger">{remaining.toLocaleString()} ر.س</strong>
              </div>
              <div className="progress mt-3" style={{ height: '10px' }}>
                <div
                  className="progress-bar bg-success"
                  style={{
                    width: `${invoice.total_amount > 0 ? (invoice.paid_amount / invoice.total_amount) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="text-center small text-muted mt-1">
                {invoice.total_amount > 0
                  ? Math.round((invoice.paid_amount / invoice.total_amount) * 100)
                  : 0}% مدفوع
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowInvoice;
