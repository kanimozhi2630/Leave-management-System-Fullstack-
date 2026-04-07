import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Brain, Zap, MessageSquare } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      {/* Navbar segment */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-primary">LMS</span>
        </div>
        <div className="navbar-actions">
          <Link to="/login" className="btn-login">Login</Link>
          <Link to="/register" className="btn-register">Register</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Leave Management System</h1>
          <p className="hero-subtitle">
            A smart platform to manage student leave requests with intelligent approval, trust scoring, and analytics
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* About Section */}
      <section className="about-section">
        <h2 className="section-title">About</h2>
        
        <div className="about-intro-card">
          <p>
            The system provides role-based dashboards tailored perfectly for the <strong>Principal</strong>, <strong>HOD</strong>, <strong>Professor</strong>, and <strong>Student</strong>. Our platform streamlines the entire application process with cutting-edge capabilities.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card feature-card">
            <Brain className="feature-icon" />
            <h3 className="card-title">Smart leave approval</h3>
            <p className="card-text">
              Automated routing and intelligent decision support for streamlining the entire approval workflow.
            </p>
          </div>

          <div className="about-card feature-card">
            <ShieldCheck className="feature-icon" />
            <h3 className="card-title">Trust score system</h3>
            <p className="card-text">
              Dynamic student reliability tracking based on leave history and attendance records.
            </p>
          </div>

          <div className="about-card feature-card">
            <Zap className="feature-icon" />
            <h3 className="card-title">Emergency detection</h3>
            <p className="card-text">
              Prioritized processing for urgent or medical leaves, ensuring critical requests are never delayed.
            </p>
          </div>

          <div className="about-card feature-card">
            <MessageSquare className="feature-icon" />
            <h3 className="card-title">Chatbot assistance</h3>
            <p className="card-text">
              Integrated AI assistance for writing professional and accurate leave letters instantly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
