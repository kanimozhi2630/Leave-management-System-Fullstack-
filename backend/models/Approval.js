import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  leave_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Leave', required: true },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { 
    type: String, 
    enum: ['Principal', 'HOD', 'Professor'], 
    required: true 
  },
  decision: { 
    type: String, 
    enum: ['Approved', 'Rejected', 'Escalated'], 
    required: true 
  },
  comments: { type: String },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Approval', approvalSchema);
