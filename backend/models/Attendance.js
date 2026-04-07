import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendance_percentage: { type: Number, default: 100.00 }
});

export default mongoose.model('Attendance', attendanceSchema);
