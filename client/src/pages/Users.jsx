import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Swal from 'sweetalert2';

function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'staff'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/users');
      setUsers(response.data.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff'
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'staff'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        await api.put(`/api/users/${editingUser.id}`, updateData);
        Swal.fire('Success', 'User updated successfully', 'success');
      } else {
        if (!formData.password) {
          Swal.fire('Error', 'Password is required for new user', 'error');
          return;
        }
        
        await api.post('/api/users', formData);
        Swal.fire('Success', 'User added successfully', 'success');
      }
      
      closeModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      Swal.fire('Error', error.response?.data?.message || 'Failed to save user', 'error');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      Swal.fire('Warning', 'You cannot delete your own account', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This user will be permanently deleted',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/api/users/${userId}`);
        Swal.fire('Success', 'User deleted successfully', 'success');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire('Error', error.response?.data?.message || 'Failed to delete user', 'error');
      }
    }
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { text: 'Admin', class: 'bg-danger' },
      staff: { text: 'Staff', class: 'bg-primary' },
      viewer: { text: 'Viewer', class: 'bg-secondary' }
    };
    return roles[role] || { text: role, class: 'bg-secondary' };
  };

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
        <h2 className="mb-0">
          <i className="bi bi-people-fill me-2"></i>
          User Management
        </h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <i className="bi bi-plus-circle me-1"></i>
          Add User
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Full Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Created Date</th>
                  <th scope="col" className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      No users
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                            <span className="text-white fw-bold">
                              {user.full_name?.charAt(0) || 'U'}
                            </span>
                          </div>
                          {user.full_name}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(user.role).class}`}>
                          {getRoleBadge(user.role).text}
                        </span>
                      </td>
                      <td>
                        {new Date(user.created_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => openEditModal(user)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(user.id)}
                          title="Delete"
                          disabled={user.id === currentUser?.id}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus'} me-2`}></i>
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter email"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      Password {editingUser ? '(Leave empty to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required={!editingUser}
                      placeholder="Enter password"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role *</label>
                    <select
                      className="form-select"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-lg me-1"></i>
                    {editingUser ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
