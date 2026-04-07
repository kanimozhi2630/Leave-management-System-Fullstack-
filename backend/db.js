import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://kanimozhi301006_db_user:Kanimozhi3010@cluster0.li5d7wv.mongodb.net/leave-management?appName=Cluster0');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed Principal Account if not exists
    const User = (await import('./models/User.js')).default;
    const adminExists = await User.findOne({ role: 'Principal' });

    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin Principal',
        email: 'admin@lms.edu',
        password: hash,
        role: 'Principal'
      });
      console.log('Seeded initial Principal account (admin@lms.edu / admin123)');
    }

  } catch (err) {
    console.error('DATABASE ERROR:', err.message);
    process.exit(1);
  }
};

export default connectDB;
