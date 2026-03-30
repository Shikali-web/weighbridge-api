const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Get all headmen (with role-based filtering)
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT h.*, s.name as supervisor_name 
      FROM headmen h
      LEFT JOIN supervisors s ON h.supervisor_id = s.id
    `;
    let params = [];
    let conditions = ['h.is_active = true'];
    
    // Role-based filtering
    if (req.user.role === 'supervisor' && req.user.supervisor_id) {
      conditions.push(`h.supervisor_id = $${params.length + 1}`);
      params.push(req.user.supervisor_id);
    } else if (req.user.role === 'headman' && req.user.headman_id) {
      conditions.push(`h.id = $${params.length + 1}`);
      params.push(req.user.headman_id);
    }
    
    if (search) {
      conditions.push(`(h.name ILIKE $${params.length + 1} OR h.national_id ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    
    query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY h.name';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching headmen:', err);
    next(err);
  }
});

// Get single headman
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT h.*, s.name as supervisor_name 
       FROM headmen h
       LEFT JOIN supervisors s ON h.supervisor_id = s.id
       WHERE h.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    
    // Check access
    if (req.user.role === 'supervisor' && result.rows[0].supervisor_id !== req.user.supervisor_id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching headman:', err);
    next(err);
  }
});

// Create headman (Admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res, next) => {
  const { supervisor_id, name, phone, national_id, is_active = true } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO headmen (supervisor_id, name, phone, national_id, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [supervisor_id, name, phone, national_id, is_active]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating headman:', err);
    next(err);
  }
});

// Update headman (Admin only)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
  const { supervisor_id, name, phone, national_id, is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE headmen SET supervisor_id = $1, name = $2, phone = $3, national_id = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [supervisor_id, name, phone, national_id, is_active, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating headman:', err);
    next(err);
  }
});

// Delete headman (Admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE headmen SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Headman not found' });
    }
    res.json({ success: true, message: 'Headman deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;