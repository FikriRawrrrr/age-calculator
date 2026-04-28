// server.js - Backend dengan MySQL, Login, dan History

// 1. Import modules
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// 2. Buat aplikasi Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server jalan di port", PORT);
});
// 3. Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session middleware untuk login
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 jam
}));

// 4. Koneksi MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kalkulator_umur'
});

// Test koneksi database
db.connect((err) => {
    if (err) {
        console.error('❌ Error koneksi database:', err.message);
        console.log('💡 Pastikan MySQL sudah jalan dan database sudah dibuat!');
    } else {
        console.log('✅ Terhubung ke database MySQL');
    }
});

// 5. Middleware cek login
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' });
    }
}

// 6. ROUTES

// Home - redirect ke login atau dashboard
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Register - POST
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validasi input
        if (!username || !email || !password) {
            return res.json({ success: false, message: 'Semua field harus diisi!' });
        }
        
        if (password.length < 6) {
            return res.json({ success: false, message: 'Password minimal 6 karakter!' });
        }
        
        // Cek apakah username atau email sudah ada
        db.query('SELECT * FROM users WHERE username = ? OR email = ?', 
            [username, email], 
            async (err, results) => {
                if (err) {
                    return res.json({ success: false, message: 'Error database' });
                }
                
                if (results.length > 0) {
                    return res.json({ success: false, message: 'Username atau email sudah digunakan!' });
                }
                
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // Insert user baru
                db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                    [username, email, hashedPassword],
                    (err, result) => {
                        if (err) {
                            return res.json({ success: false, message: 'Gagal mendaftar' });
                        }
                        
                        res.json({ success: true, message: 'Registrasi berhasil! Silakan login.' });
                    }
                );
            }
        );
    } catch (error) {
        res.json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// Login - POST
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username dan password harus diisi!' });
    }
    
    // Cari user di database
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) {
            return res.json({ success: false, message: 'Error database' });
        }
        
        if (results.length === 0) {
            return res.json({ success: false, message: 'Username atau password salah!' });
        }
        
        const user = results[0];
        
        // Cek password
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.json({ success: false, message: 'Username atau password salah!' });
        }
        
        // Set session
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.json({ success: true, message: 'Login berhasil!', username: user.username });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logout berhasil' });
});

// Cek status login
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Hitung umur dan simpan ke database
app.post('/api/calculate-age', isAuthenticated, (req, res) => {
    try {
        const birthDate = new Date(req.body.birthdate);
        const today = new Date();
        
        // Hitung selisih tahun
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        
        // Adjust jika hari negatif
        if (days < 0) {
            months--;
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += lastMonth.getDate();
        }
        
        // Adjust jika bulan negatif
        if (months < 0) {
            years--;
            months += 12;
        }
        
        // Hitung total hari hidup
        const diffTime = Math.abs(today - birthDate);
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Hitung total jam, menit, detik
        const totalHours = totalDays * 24;
        const totalMinutes = totalHours * 60;
        const totalSeconds = totalMinutes * 60;
        
        // Format tanggal lahir
        const formattedBirthDate = birthDate.toLocaleDateString('id-ID', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Simpan ke database
        const userId = req.session.userId;
        const birthDateStr = birthDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
        
        db.query(
            'INSERT INTO calculations (user_id, birth_date, years, months, days, total_days) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, birthDateStr, years, months, days, totalDays],
            (err, result) => {
                if (err) {
                    console.error('Error menyimpan ke database:', err);
                }
            }
        );
        
        // Kirim hasil
        res.json({
            success: true,
            age: { years, months, days },
            total: { days: totalDays, hours: totalHours, minutes: totalMinutes, seconds: totalSeconds },
            birthDate: formattedBirthDate
        });
    } catch (error) {
        res.json({ success: false, message: 'Tanggal lahir tidak valid!' });
    }
});

// Get history perhitungan
app.get('/api/history', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    
    db.query(
        'SELECT * FROM calculations WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 20',
        [userId],
        (err, results) => {
            if (err) {
                return res.json({ success: false, message: 'Error mengambil data' });
            }
            
            res.json({ success: true, history: results });
        }
    );
});

// Delete history
app.delete('/api/history/:id', isAuthenticated, (req, res) => {
    const calculationId = req.params.id;
    const userId = req.session.userId;
    
    db.query(
        'DELETE FROM calculations WHERE id = ? AND user_id = ?',
        [calculationId, userId],
        (err, result) => {
            if (err) {
                return res.json({ success: false, message: 'Gagal menghapus' });
            }
            
            if (result.affectedRows === 0) {
                return res.json({ success: false, message: 'Data tidak ditemukan' });
            }
            
            res.json({ success: true, message: 'History berhasil dihapus' });
        }
    );
});

// Clear semua history
app.delete('/api/history', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    
    db.query(
        'DELETE FROM calculations WHERE user_id = ?',
        [userId],
        (err, result) => {
            if (err) {
                return res.json({ success: false, message: 'Gagal menghapus' });
            }
            
            res.json({ success: true, message: 'Semua history berhasil dihapus' });
        }
    );
});

// 7. Jalankan server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📱 Buka browser dan akses URL di atas!`);
});
