import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import connectDB from './db.js';

import User from './models/User.js';
import Leave from './models/Leave.js';
import Attendance from './models/Attendance.js';
import Approval from './models/Approval.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// ---------------------------------
// AUTHENTICATION & HIERARCHY
// ---------------------------------
app.post('/api/register', async (req, res) => {
  const { name, email, role, password, created_by } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      role,
      password: hash,
      created_by: created_by || null
    });

    // If student, seed a dummy attendance record (75-100%)
    if (role === 'Student') {
      const randomAttendance = (Math.random() * 25 + 75).toFixed(2);
      await Attendance.create({
        student_id: user._id,
        attendance_percentage: parseFloat(randomAttendance)
      });
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
    const user = await User.findOne({ email, role });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const userObj = user.toObject();
    userObj.id = userObj._id; // Provide frontend compatibility for user.id

    res.status(200).json({ message: 'Login successful!', user: userObj });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log in' });
  }
});

app.get('/api/users', async (req, res) => {
    try {
        const usersDB = await User.find({}, 'name email role');
        const users = usersDB.map(u => {
           const uObj = u.toObject();
           uObj.id = uObj._id;
           return uObj;
        });
        res.json(users);
    } catch(err) { res.status(500).json({error: "Failed to fetch users"}); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
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
    const attRecord = await Attendance.findOne({ student_id });
    const attendance = attRecord ? attRecord.attendance_percentage : 80;

    const allLeaves = await Leave.find({ student_id });
    const pastApprovals = allLeaves.filter(l => l.status === 'Approved').length;
    const totalDecided = allLeaves.filter(l => l.status !== 'Pending').length;
    const approval_rate = totalDecided === 0 ? 100 : (pastApprovals / totalDecided) * 100;
    
    // Calculate final Trust Score
    const trust_score = (attendance * 0.6) + (approval_rate * 0.4);

    // 4. Save to Database - All requests start strictly anchored to the Professor Desk
    await Leave.create({
      student_id,
      number_of_days,
      start_date,
      end_date,
      reason,
      priority,
      trust_score,
      assigned_role: 'Professor'
    });

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
      leaves = await Leave.find({ student_id: userId }).sort({ created_at: -1 });
    } else {
      // Principal, HOD and Professor all gain full administrative visibility over queue
      leaves = await Leave.find().populate('student_id', 'name').sort({ created_at: -1 });
      
      // Map to ensure frontend receives expected data structure smoothly
      leaves = leaves.map(l => {
          const leaveObj = l.toObject();
          leaveObj.student_name = leaveObj.student_id ? leaveObj.student_id.name : 'Unknown';
          leaveObj.id = leaveObj._id; // Add 'id' to map to '_id'
          if (leaveObj.student_id && leaveObj.student_id._id) {
             leaveObj.student_id = leaveObj.student_id._id;
          }
          return leaveObj;
      });
    }
    
    // Map _id to id for students too just in case
    if (role === 'Student') {
        leaves = leaves.map(l => {
            const leaveObj = l.toObject();
            leaveObj.id = leaveObj._id;
            return leaveObj;
        });
    }

    res.status(200).json(leaves);
  } catch (error) {
    console.error(error);
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
        await Leave.findByIdAndUpdate(leaveId, { assigned_role: nextRole });
    } else {
        await Leave.findByIdAndUpdate(leaveId, { status: decision });
    }
    
    // Map 'Escalate' from UI strictly to 'Escalated' to pass Schema Validation
    const dbDecision = decision === 'Escalate' ? 'Escalated' : decision;
    
    await Approval.create({
      leave_id: leaveId,
      approved_by: approver_id,
      role: role,
      decision: dbDecision,
      comments: comments || ""
    });
    res.status(200).json({ message: 'Decision stored successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply approval route' });
  }
});

// Simple Analytics route
app.get('/api/analytics', async (req, res) => {
    try {
        const usersAggregation = await User.aggregate([
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);
        const users = usersAggregation.map(u => ({ role: u._id, count: u.count }));
        
        const leavesAggregation = await Leave.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        const leaves = leavesAggregation.map(l => ({ status: l._id, count: l.count }));

        res.json({ users, leaves });
    } catch(err) {
        console.error(err);
        res.status(500).json({error: "Analytics failed"});
    }
});

app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
});

export default app;
