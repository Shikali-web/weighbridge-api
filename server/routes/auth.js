const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sagib-enterprises-secret-key-2026';

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password required' });
        }
        
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND is_active = true',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        let isValidPassword = false;
        
        // Check if password is hashed
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isValidPassword = await bcrypt.compare(password, user.password);
        } else {
            // Plain text comparison (for initial setup)
            isValidPassword = (password === user.password);
            if (isValidPassword) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
            }
        }
        
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        
        // Update last login
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Create token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role,
                full_name: user.full_name,
                supervisor_id: user.supervisor_id,
                headman_id: user.headman_id
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                supervisor_id: user.supervisor_id,
                headman_id: user.headman_id
            },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, data: decoded });
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// Create default users if none exist
router.post('/setup', async (req, res) => {
    try {
        const checkUsers = await pool.query('SELECT id FROM users LIMIT 1');
        
        if (checkUsers.rows.length === 0) {
            const hashedAdmin = await bcrypt.hash('admin123', 10);
            const hashedSupervisor = await bcrypt.hash('sup123', 10);
            const hashedWeighbridge = await bcrypt.hash('wb123', 10);
            const hashedHeadman = await bcrypt.hash('hm123', 10);
            
            await pool.query(
                `INSERT INTO users (username, password, email, full_name, role, is_active) VALUES
                ('admin', $1, 'admin@sagib.com', 'System Administrator', 'admin', true),
                ('supervisor', $2, 'supervisor@sagib.com', 'John Supervisor', 'supervisor', true),
                ('weighbridge', $3, 'weighbridge@sagib.com', 'Peter Weighbridge', 'weighbridge', true),
                ('headman', $4, 'headman@sagib.com', 'Mary Headman', 'headman', true)`,
                [hashedAdmin, hashedSupervisor, hashedWeighbridge, hashedHeadman]
            );
            
            res.json({ success: true, message: 'Default users created. Username: admin, Password: admin123' });
        } else {
            res.json({ success: true, message: 'Users already exist' });
        }
    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ success: false, message: 'Setup failed' });
    }
});

module.exports = router;