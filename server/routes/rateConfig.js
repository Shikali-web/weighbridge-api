const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM rate_config ORDER BY effective_from DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:key', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM rate_config WHERE config_key = $1', [req.params.key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rate config not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { config_key, config_value, description, effective_from } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO rate_config (config_key, config_value, description, effective_from) VALUES ($1, $2, $3, $4) RETURNING *',
      [config_key, config_value, description, effective_from]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { config_key, config_value, description, effective_from } = req.body;
  try {
    const result = await pool.query(
      'UPDATE rate_config SET config_key = $1, config_value = $2, description = $3, effective_from = $4 WHERE id = $5 RETURNING *',
      [config_key, config_value, description, effective_from, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rate config not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;