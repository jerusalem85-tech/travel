import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications');
      setNotifications(response.data.rows);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Swal.fire('خطأ', 'فشل في تحميل الإشعارات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notification) => {
    if (notification.is_read) return;
    
    try {
      await api.put(`/api/notifications/${notification.id}/read`);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      
      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    if (unreadCount === 0) {
      Swal.fire('معلومة', 'لا توجد إشعارات غير مقروءة', 'info');
      return;
    }

    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      Swal.fire('نجاح', 'تم وضع علامة مقروء على جميع الإشعارات', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Swal.fire('خطأ', 'فشل في تحديث الإشعارات', 'error');
    }
  };

  const deleteNotification = async (notificationId) => {
    const result = await Swal.fire({
      title: 'هل أنت متأكد؟',
      text: 'سيتم حذف هذا الإشعار نهائياً',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'نعم، احذف',
      cancelButtonText: 'إلغاء'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/notifications/${notificationId}`);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        Swal.fire('نجاح', 'تم حذف الإشعار بنجاح', 'success');
      } catch (error) {
        console.error('Error deleting notification:', error);
        Swal.fire('خطأ', 'فشل في حذف الإشعار', 'error');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">
            <i className="bi bi-bell-fill me-2"></i>
            الإشعارات
          </h2>
          {unreadCount > 0 && (
            <small className="text-muted">{unreadCount} إشعار غير مقروء</small>
          )}
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <i className="bi bi-check-all me-1"></i>
          وضع علامة مقروء على الكل
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-bell-slash display-1 text-muted"></i>
            <h5 className="mt-3 text-muted">لا توجد إشعارات</h5>
            <p className="text-muted">ستظهر الإشعارات الجديدة هنا</p>
          </div>
        </div>
      ) : (
        <div className="list-group shadow-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`list-group-item list-group-item-action ${!notification.is_read ? 'bg-light bg-opacity-50 border-primary' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => markAsRead(notification)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-1">
                    {!notification.is_read && (
                      <span className="badge bg-primary rounded-pill me-2">جديد</span>
                    )}
                    <h6 className="mb-0 fw-bold">{notification.title}</h6>
                  </div>
                  <p className="mb-1 text-muted">{notification.message}</p>
                  <small className="text-muted">
                    <i className="bi bi-clock me-1"></i>
                    {formatDate(notification.created_at)}
                  </small>
                </div>
                <div className="ms-3">
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="حذف"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              {notification.link && (
                <div className="mt-2">
                  <small className="text-primary">
                    <i className="bi bi-link-45deg me-1"></i>
                    انقر للعرض
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;