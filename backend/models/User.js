import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Principal', 'HOD', 'Professor', 'Student'], 
    required: true 
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

export default mongoose.model('User', userSchema);
