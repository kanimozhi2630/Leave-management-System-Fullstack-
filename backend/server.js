import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import db from './db.js';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------
// AUTHENTICATION & HIERARCHY
// ---------------------------------
app.post('/api/register', async (req, res) => {
  const { name, email, role, password, created_by } = req.body;
  try {
    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, role, password, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, email, role, hash, created_by || null]
    );

    // If student, seed a dummy attendance record (75-100%)
    if (role === 'Student') {
      const randomAttendance = (Math.random() * 25 + 75).toFixed(2);
      await db.execute('INSERT INTO attendance (student_id, attendance_percentage) VALUES (?, ?)', [result.insertId, randomAttendance]);
    }

    res.status(201).json({ message: 'User added successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    res.status(200).json({ message: 'Login successful!', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, email, role FROM users');
        res.json(users);
    } catch(err) { res.status(500).json({error: "Failed to fetch users"}); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ---------------------------------
// SMART LEAVE LOGIC & SUBMISSIONS
// ---------------------------------
app.post('/api/leaves', async (req, res) => {
  const { student_id, start_date, end_date, reason } = req.body;
  try {
    const sDate = new Date(start_date);
    const eDate = new Date(end_date);
    const number_of_days = Math.max(1, Math.ceil((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);

    // 1. Emergency Detection
    const urgentKeywords = ['accident', 'hospital', 'emergency'];
    const isHighPriority = urgentKeywords.some(word => reason.toLowerCase().includes(word));
    const priority = isHighPriority ? 'High' : 'Normal';

    // Fake Leave Logic Check
    const sketchyPatterns = ['monday', 'friday', 'exam', 'party'];
    const isSketchy = sketchyPatterns.some(word => reason.toLowerCase().includes(word));

    // 2. Trust Score Formula: (attendance * 0.6) + (approval_rate * 0.4)
    const [attRows] = await db.execute('SELECT attendance_percentage FROM attendance WHERE student_id = ?', [student_id]);
    const attendance = attRows.length > 0 ? parseFloat(attRows[0].attendance_percentage) : 80;

    const [allLeaves] = await db.execute('SELECT status FROM leaves WHERE student_id = ?', [student_id]);
    const pastApprovals = allLeaves.filter(l => l.status === 'Approved').length;
    const totalDecided = allLeaves.filter(l => l.status !== 'Pending').length;
    const approval_rate = totalDecided === 0 ? 100 : (pastApprovals / totalDecided) * 100;
    
    // Calculate final Trust Score
    const trust_score = (attendance * 0.6) + (approval_rate * 0.4);

    // 4. Save to Database - All requests start strictly anchored to the Professor Desk
    const [result] = await db.execute(
      'INSERT INTO leaves (student_id, number_of_days, start_date, end_date, reason, priority, trust_score, assigned_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, number_of_days, start_date, end_date, reason, priority, trust_score, 'Professor']
    );

    res.status(201).json({ 
        message: 'Leave applied successfully under Manual Workflow escalation logic!', 
        sketchyWarning: isSketchy
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed submitting complex leave logic' });
  }
});

// ---------------------------------
// LEAVE DATA RETREIVAL & ANALYTICS
// ---------------------------------
// Fetch based on Role scope
app.get('/api/leaves/:userId/:role', async (req, res) => {
  const { userId, role } = req.params;
  try {
    let leaves = [];
    if (role === 'Student') {
      const [rows] = await db.execute(`
        SELECT l.* 
        FROM leaves l 
        WHERE l.student_id = ? ORDER BY l.created_at DESC`, [userId]);
      leaves = rows;
    } else {
      // Principal, HOD and Professor all gain full administrative visibility over queue
      const [rows] = await db.execute(`
        SELECT l.*, s.name as student_name FROM leaves l 
        JOIN users s ON l.student_id = s.id ORDER BY l.created_at DESC`);
      leaves = rows;
    }
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Update Leave and track Approval record executing Hierarchical Escalations
app.put('/api/leaves/:leaveId/approve', async (req, res) => {
  const { leaveId } = req.params;
  const { decision, approver_id, role, comments } = req.body;
  
  try {
    if (decision === 'Escalate') {
        const nextRole = role === 'Professor' ? 'HOD' : 'Principal';
        await db.execute('UPDATE leaves SET assigned_role = ? WHERE id = ?', [nextRole, leaveId]);
    } else {
        await db.execute('UPDATE leaves SET status = ? WHERE id = ?', [decision, leaveId]);
    }
    
    // Map 'Escalate' from UI strictly to 'Escalated' to pass MySQL ENUM data validations!
    const dbDecision = decision === 'Escalate' ? 'Escalated' : decision;
    
    await db.execute(
      'INSERT INTO approvals (leave_id, approved_by, role, decision, comments) VALUES (?, ?, ?, ?, ?)',
       [leaveId, approver_id, role, dbDecision, comments || ""]
    );
    res.status(200).json({ message: 'Decision stored successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply approval route' });
  }
});

// Simple Analytics route
app.get('/api/analytics', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT role, COUNT(*) as count FROM users GROUP BY role');
        const [leaves] = await db.execute('SELECT status, COUNT(*) as count FROM leaves GROUP BY status');
        res.json({ users, leaves });
    } catch(err) {
        res.status(500).json({error: "Analytics failed"});
    }
});

app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
});
