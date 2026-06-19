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
      Swal.fire('Error', 'Failed to load notifications', 'error');
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
      Swal.fire('Info', 'No unread notifications', 'info');
      return;
    }

    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      Swal.fire('Success', 'Marked all notifications as read', 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Swal.fire('Error', 'Failed to update notifications', 'error');
    }
  };

  const deleteNotification = async (notificationId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This notification will be permanently deleted',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/notifications/${notificationId}`);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        Swal.fire('Success', 'Notification deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting notification:', error);
        Swal.fire('Error', 'Failed to delete notification', 'error');
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

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
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
          <span className="visually-hidden">Loading...</span>
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
            Notifications
          </h2>
          {unreadCount > 0 && (
            <small className="text-muted">{unreadCount} {unreadCount === 1 ? 'unread notification' : 'unread notifications'}</small>
          )}
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <i className="bi bi-check-all me-1"></i>
          Mark All as Read
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-bell-slash display-1 text-muted"></i>
            <h5 className="mt-3 text-muted">No notifications</h5>
            <p className="text-muted">New notifications will appear here</p>
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
                      <span className="badge bg-primary rounded-pill me-2">New</span>
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
                    title="Delete"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              {notification.link && (
                <div className="mt-2">
                  <small className="text-primary">
                    <i className="bi bi-link-45deg me-1"></i>
                    Click to view
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
