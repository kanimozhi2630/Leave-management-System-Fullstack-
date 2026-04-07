import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', role: 'Student' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Login successful! Welcome ${data.user.fullName}`);
        const userObj = { ...data.user, email: formData.email };
        localStorage.setItem('lms_user', JSON.stringify(userObj));
        navigate('/dashboard', { state: { user: userObj } });
      } else {
        alert("Login failed: " + data.error);
      }
    } catch (err) {
      alert("Failed to connect to the server. Is the backend running?");
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <Link to="/" className="back-link"><ArrowLeft size={20} /> Back to Home</Link>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <LogIn className="auth-icon" />
          </div>
          <h2>Welcome Back</h2>
          <p>Login to your account to manage leaves</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="role">Login As</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange}>
              <option value="Student">Student</option>
              <option value="Professor">Professor</option>
              <option value="HOD">Head of Department (HOD)</option>
              <option value="Principal">Principal</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" className="forgot-password">Forgot Password?</a>
          </div>

          <button type="submit" className="btn-auth">Login</button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
