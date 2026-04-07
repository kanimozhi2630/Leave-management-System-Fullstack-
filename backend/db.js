import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'lms_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

const setupDatabase = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Building complex 4-table SQL schema...');
        
        await connection.query(`
          SET FOREIGN_KEY_CHECKS = 0;
          
          -- DROP TABLE IF EXISTS approvals;
          -- DROP TABLE IF EXISTS attendance;
          -- DROP TABLE IF EXISTS leaves;
          -- DROP TABLE IF EXISTS users;
          -- DROP TABLE IF EXISTS leave_requests;
          
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('Principal', 'HOD', 'Professor', 'Student') NOT NULL,
            created_by INT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
          );

          CREATE TABLE IF NOT EXISTS leaves (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            number_of_days INT NOT NULL,
            start_date DATE,
            end_date DATE,
            reason TEXT NOT NULL,
            status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
            priority ENUM('Normal', 'High') DEFAULT 'Normal',
            trust_score DECIMAL(5,2) DEFAULT 0.00,
            assigned_role ENUM('Professor', 'HOD', 'Principal') DEFAULT 'Professor',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            attendance_percentage DECIMAL(5,2) DEFAULT 100.00,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS approvals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            leave_id INT NOT NULL,
            approved_by INT NOT NULL,
            role ENUM('Principal', 'HOD', 'Professor') NOT NULL,
            decision ENUM('Approved', 'Rejected', 'Escalated') NOT NULL,
            comments TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
            FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE CASCADE
          );
          
          SET FOREIGN_KEY_CHECKS = 1;
        `);
        console.log('Schema built perfectly.');

        const [principals] = await connection.query(`SELECT * FROM users WHERE role = 'Principal'`);
        if (principals.length === 0) {
            import('bcrypt').then(async (bcrypt) => {
                const hash = await bcrypt.default.hash('admin123', 10);
                await connection.query(
                    `INSERT INTO users (name, email, password, role) VALUES ('Admin Principal', 'admin@lms.edu', ?, 'Principal')`,
                    [hash]
                );
                console.log('Seeded initial Principal account (admin@lms.edu / admin123)');
            });
        }
        connection.release();
    } catch (err) {
        console.error('DATABASE ERROR:', err.message);
    }
};

setupDatabase();

export default pool;
