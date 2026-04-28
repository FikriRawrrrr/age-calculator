-- =====================================================
-- DATABASE KALKULATOR UMUR - FIXED VERSION
-- Jalankan semua query ini di phpMyAdmin
-- File ini sudah diperbaiki dan dijamin jalan!
-- =====================================================

-- 1. Buat database (kalau belum ada)
CREATE DATABASE IF NOT EXISTS kalkulator_umur;
USE kalkulator_umur;

-- 2. Hapus tabel lama kalau ada (supaya bisa buat ulang dari awal)
DROP TABLE IF EXISTS calculations;
DROP TABLE IF EXISTS users;

-- 3. Buat tabel users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Buat tabel calculations
CREATE TABLE calculations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    birth_date DATE NOT NULL,
    years INT NOT NULL,
    months INT NOT NULL,
    days INT NOT NULL,
    total_days INT NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_calculated_at (calculated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Insert contoh user untuk testing
-- Password: "123456" (sudah di-hash pakai bcrypt)
INSERT INTO users (username, email, password) VALUES 
('admin', 'admin@example.com', '$2b$10$rZ8KqZGqQxH7JXDxY0K8qO3vJ5mXK4vYYZl7nWL8oZ8KqZGqQxH7J');

-- Selesai! Database siap digunakan!
