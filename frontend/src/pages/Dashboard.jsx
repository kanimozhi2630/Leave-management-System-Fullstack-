import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckSquare, Settings, LogOut, Plus, UserPlus, BarChart2 } from 'lucide-react';
import ChatbotAssistant from '../components/ChatbotAssistant';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('lms_user'));
  const user = location.state?.user || storedUser;

  const [activeTab, setActiveTab] = useState('dashboard');
  const [leaves, setLeaves] = useState([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formData, setFormData] = useState({ start_date: '', end_date: '', reason: '' });
  const [subordinateForm, setSubordinateForm] = useState({ name: '', email: '', password: '' });
  const [subordinates, setSubordinates] = useState([]);
  const [stats, setStats] = useState({ attendance: 100, trustScore: 100 });
  const [sysAnalytics, setSysAnalytics] = useState({ users: [], leaves: [] });

  useEffect(() => {
    // If user doesn't exist, or their session is corrupted from an old version
    if (!user || (!user.name && !user.fullName)) {
      localStorage.removeItem('lms_user');
      navigate('/login');
      return;
    }
    fetchLeaves();
    if (user.role === 'Student') {
       fetch(`http://localhost:5000/api/stats/${user.id}`).then(r=>r.json()).then(d=>setStats(d)).catch(e=>{});
    } else if (user.role === 'Principal' || user.role === 'HOD') {
       fetch(`http://localhost:5000/api/analytics`).then(r=>r.json()).then(d=>setSysAnalytics(d)).catch(e=>{});
    }
  }, [user, navigate]);

  if (!user) return null;
  
  // Safely fallback to fullName if they are on an old cached session token
  const name = user.name || user.fullName || 'Guest';
  const { id, role, email } = user;

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/leaves/${id}/${role}`);
      if (res.ok) setLeaves(await res.json());
    } catch(err) { console.error(err); }
  };

  const handleLogout = () => {
    localStorage.removeItem('lms_user');
    navigate('/login');
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: id, ...formData })
      });
      const data = await response.json();
      if (response.ok) {
        let msg = "Leave application submitted successfully!";
        if(data.sketchyWarning) msg += " \nWARNING: The system evaluated patterns and flagged this submission.";
        alert(msg);
        setShowApplyForm(false);
        setFormData({ start_date: '', end_date: '', reason: '' });
        fetchLeaves();
        if (role === 'Student') {
           fetch(`http://localhost:5000/api/stats/${id}`).then(r=>r.json()).then(d=>setStats(d)).catch(e=>{});
        }
      } else {
        alert("Submission Failed");
      }
    } catch (err) { alert('Network Error'); }
  };

  const handleUpdateStatus = async (leaveId, decision) => {
    try {
      const response = await fetch(`http://localhost:5000/api/leaves/${leaveId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, approver_id: id, role })
      });
      if (response.ok) fetchLeaves();
    } catch(err) { alert('Error updating status'); }
  };

  const targetRoleAdd = role === 'Principal' ? 'HOD' : role === 'HOD' ? 'Professor' : role === 'Professor' ? 'Student' : null;

  const fetchSubordinates = async () => {
    if (!targetRoleAdd) return;
    try {
      const res = await fetch('http://localhost:5000/api/users');
      if (res.ok) {
        const users = await res.json();
        setSubordinates(users.filter(u => u.role === targetRoleAdd));
      }
    } catch(err) {}
  };

  useEffect(() => {
    if (activeTab === 'adduser') fetchSubordinates();
  }, [activeTab]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete this ${targetRoleAdd}? All their data will be erased.`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) fetchSubordinates();
    } catch(err) { alert('Error deleting user'); }
  };

  const handleAddUser = async (e) => {
     e.preventDefault();
     try {
       const res = await fetch('http://localhost:5000/api/register', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ ...subordinateForm, role: targetRoleAdd, created_by: id })
       });
       if(res.ok) {
           alert(`${targetRoleAdd} Account successfully created in the SQL Database!`);
           setSubordinateForm({name:'', email:'', password:''});
           fetchSubordinates();
       } else { alert("Failed to add user. Ensure email is unique."); }
     } catch(err) { alert("Network error"); }
  };

  const pendingRequests = leaves.filter(l => l.status === 'Pending').length;
  const displayedLeaves = activeTab === 'approvals' ? leaves.filter(l => l.status === 'Pending') : leaves;

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>LMS</h2><span className="role-badge">{role}</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}><LayoutDashboard size={20} /> Dashboard</Link>
          <Link to="#" className={`nav-item ${activeTab === 'leaves' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('leaves'); }}><FileText size={20} /> {role === 'Student' ? 'My Leaves' : 'All Requests'}</Link>
          {role !== 'Student' && <Link to="#" className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('approvals'); }}><CheckSquare size={20} /> Approvals</Link>}
          {targetRoleAdd && <Link to="#" className={`nav-item ${activeTab === 'adduser' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('adduser'); }}><UserPlus size={20} /> Manage {targetRoleAdd}s</Link>}
          {(role === 'Principal' || role === 'HOD') && <Link to="#" className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); }}><BarChart2 size={20} /> Analytics</Link>}
        </nav>
        <div className="sidebar-footer"><button className="btn-logout" onClick={handleLogout}><LogOut size={20} /> Logout</button></div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="topbar">
          <div><h1>Welcome, {name}</h1><p>Here is what's happening today.</p></div>
          <div className="user-profile"><div className="avatar">{name.charAt(0).toUpperCase()}</div></div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-cards">
            {role === 'Student' ? (
            <>
              <div className="stat-card"><h3>Total Leaves Applied</h3><p className="stat-value">{leaves.length}</p></div>
              <div className="stat-card"><h3>Evaluated Trust Score</h3><p className="stat-value trust-score" style={{color: stats.trustScore < 50 ? '#dc2626' : '#16a34a'}}>{Number(stats.trustScore).toFixed(1)}%</p></div>
              <div className="stat-card"><h3>Live Attendance Track</h3><p className="stat-value">{Number(stats.attendance).toFixed(1)}%</p></div>
            </>
            ) : (
            <>
               <div className="stat-card"><h3>Pending Approvals Queue</h3><p className="stat-value">{pendingRequests}</p></div>
               <div className="stat-card"><h3>Total Records Mapped</h3><p className="stat-value">{leaves.length}</p></div>
            </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
            <div style={{background: 'white', padding: '2rem', borderRadius: '12px', margin: '2rem'}}>
                <h2>Leave Analytics Data</h2>
                <div style={{height: 300, width: '100%', marginTop: '2rem'}}>
                   {sysAnalytics.leaves.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sysAnalytics.leaves}>
                            <XAxis dataKey="status" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0d9488" />
                        </BarChart>
                    </ResponsiveContainer>
                   ) : <p>No data to chart</p>}
                </div>
            </div>
        )}

        {/* Add User Tab */}
        {activeTab === 'adduser' && targetRoleAdd && (
            <div style={{background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '500px', margin: '2rem'}}>
               <h2>Onboard New {targetRoleAdd}</h2>
               <p style={{fontSize: '0.85rem', color:'#64748b', marginBottom: '1rem'}}>
                  This respects Role Hierarchy. As a {role}, you legally possess permission to add {targetRoleAdd}s underneath your hierarchy bracket inside the SQL Database.
               </p>
               <form onSubmit={handleAddUser}>
                  <div style={{marginBottom: '1rem'}}>
                    <label>Full Name</label>
                    <input type="text" required value={subordinateForm.name} onChange={e => setSubordinateForm({...subordinateForm, name: e.target.value})} style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop:'0.5rem'}}/>
                  </div>
                  <div style={{marginBottom: '1rem'}}>
                    <label>Email Address</label>
                    <input type="email" required value={subordinateForm.email} onChange={e => setSubordinateForm({...subordinateForm, email: e.target.value})} style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop:'0.5rem'}}/>
                  </div>
                  <div style={{marginBottom: '1.5rem'}}>
                    <label>Temporary Password</label>
                    <input type="password" required value={subordinateForm.password} onChange={e => setSubordinateForm({...subordinateForm, password: e.target.value})} style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop:'0.5rem'}}/>
                  </div>
                  <button type="submit" style={{background: '#0d9488', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight:'bold'}}>Deploy Accounts Privileges ({targetRoleAdd})</button>
               </form>

               <div style={{marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem'}}>
                  <h3>Existing {targetRoleAdd}s</h3>
                  {subordinates.length === 0 ? <p style={{color: '#64748b'}}>No {targetRoleAdd}s exist yet.</p> : (
                    <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '1rem'}}>
                      <thead><tr style={{textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>
                        <th style={{paddingBottom: '0.5rem'}}>Name</th>
                        <th style={{paddingBottom: '0.5rem'}}>Email</th>
                        <th style={{paddingBottom: '0.5rem'}}>Action</th>
                      </tr></thead>
                      <tbody>
                        {subordinates.map(sub => (
                          <tr key={sub.id} style={{borderBottom:'1px solid #f8fafc'}}>
                            <td style={{padding: '0.75rem 0'}}>{sub.name}</td>
                            <td>{sub.email}</td>
                            <td><button onClick={()=>handleDeleteUser(sub.id)} style={{background: '#ef4444', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize:'0.8rem', fontWeight:'bold'}}>Delete</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
               </div>
            </div>
        )}

        {/* Tables */}
        {(activeTab === 'dashboard' || activeTab === 'leaves' || activeTab === 'approvals') && (
        <div className="recent-activity">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2>{activeTab === 'approvals' ? 'Pending Action Items' : 'Leave Records Log'}</h2>
            {role === 'Student' && <button onClick={() => setShowApplyForm(!showApplyForm)} style={{backgroundColor: '#0d9488', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Plus size={16} /> Apply for New Leave</button>}
          </div>

          {showApplyForm && role === 'Student' && (
             <div style={{marginBottom: '2rem', maxWidth: '800px'}}>
                   <form onSubmit={handleApplyLeave} style={{background: '#f8fafc', padding: '1.5rem', borderRadius: '12px'}}>
                      <h3>📝 Apply for Leave</h3>
                      <div style={{marginBottom: '1rem', marginTop: '1rem', display: 'flex', gap: '1rem'}}>
                          <div style={{flex: 1}}>
                            <label>Start Date</label>
                            <input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop: '0.5rem'}}/>
                          </div>
                          <div style={{flex: 1}}>
                            <label>End Date</label>
                            <input type="date" required value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} min={formData.start_date} style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop: '0.5rem'}}/>
                          </div>
                      </div>
                      <div style={{marginBottom: '1.5rem'}}>
                         <label>Reason Details</label>
                         <textarea required rows="8" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Will trigger Smart Emergency logic if words like 'accident' or 'hospital' are detected." style={{width: '100%', padding:'0.5rem', borderRadius:'6px', border:'1px solid #cbd5e1', marginTop: '0.5rem'}}></textarea>
                      </div>
                      <button type="submit" style={{backgroundColor: '#0d9488', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Submit</button>
                   </form>
             </div>
          )}

          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{textAlign: 'left', borderBottom: '2px solid #f1f5f9'}}>
                  <th style={{padding: '1rem'}}>ID</th>
                  {role !== 'Student' && <th style={{padding: '1rem'}}>Student</th>}
                  <th style={{padding: '1rem'}}>Priority Class</th>
                  <th style={{padding: '1rem'}}>Requested Dates</th>
                  <th style={{padding: '1rem'}}>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeaves.length === 0 ? (
                  <tr><td colSpan="6" style={{padding: '3rem', textAlign: 'center'}}>No records parsing constraints matching this view.</td></tr>
                ) : (
                  displayedLeaves.map(leave => (
                    <tr key={leave.id} style={{borderBottom: '1px solid #f1f5f9', background: leave.priority === 'High' ? '#fff1f2' : 'transparent'}}>
                      <td style={{padding: '1rem'}}>#{leave.id}</td>
                      {role !== 'Student' && <td style={{padding: '1rem'}}><b>{leave.student_name}</b> <br/><small>Overall Trust: {Number(leave.trust_score).toFixed(0)}%</small></td>}
                      <td style={{padding: '1rem'}}><span style={{color: leave.priority==='High'?'#e11d48':'#475569', fontWeight: leave.priority==='High'?'bold':'normal'}}>{leave.priority}</span></td>
                      <td style={{padding: '1rem'}}>{leave.start_date ? `${new Date(leave.start_date).toLocaleDateString()} to ${new Date(leave.end_date).toLocaleDateString()}` : `${leave.number_of_days} Day(s)`} <br/><em style={{fontSize:'0.8rem', color:'#64748b'}}>{leave.reason.substring(0, 30)}...</em></td>
                      <td style={{padding: '1rem'}}>
                        {role !== 'Student' && leave.status === 'Pending' ? (
                           leave.assigned_role === role ? (
                             <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                               <button onClick={() => handleUpdateStatus(leave.id, 'Approved')} style={{background:'#16a34a', color:'white', border:'none', padding:'0.4rem 0.8rem', borderRadius:'6px', cursor:'pointer'}}>Approve</button>
                               <button onClick={() => handleUpdateStatus(leave.id, 'Rejected')} style={{background:'#dc2626', color:'white', border:'none', padding:'0.4rem 0.8rem', borderRadius:'6px', cursor:'pointer'}}>Reject</button>
                               {role !== 'Principal' && (
                                  <button onClick={() => handleUpdateStatus(leave.id, 'Escalate')} style={{background:'#ea580c', color:'white', border:'none', padding:'0.4rem 0.8rem', borderRadius:'6px', cursor:'pointer'}}>Escalate to {role === 'Professor' ? 'HOD' : 'Principal'}</button>
                               )}
                             </div>
                           ) : (
                             <span style={{padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600', background: '#e2e8f0', color: '#475569'}}>Waiting for escalation ({leave.assigned_role})</span>
                           )
                        ) : (
                          <span style={{padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '600', background: leave.status === 'Pending' ? '#fef08a' : leave.status === 'Approved' ? '#dcfce3' : '#fee2e2', color: leave.status === 'Pending' ? '#854d0e' : leave.status === 'Approved' ? '#166534' : '#991b1b'}}>{leave.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {role === 'Student' && (
          <ChatbotAssistant onUseLetter={(letter) => {
            setFormData({...formData, reason: letter});
            setShowApplyForm(true);
          }} />
        )}
      </main>
    </div>
  );
};
export default Dashboard;
