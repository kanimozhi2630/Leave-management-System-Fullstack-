import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  number_of_days: { type: Number, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending' 
  },
  priority: { 
    type: String, 
    enum: ['Normal', 'High'], 
    default: 'Normal' 
  },
  trust_score: { type: Number, default: 0.00 },
  assigned_role: { 
    type: String, 
    enum: ['Professor', 'HOD', 'Principal'], 
    default: 'Professor' 
  },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Leave', leaveSchema);
