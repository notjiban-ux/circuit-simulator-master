/**
 * Diode — Auth Routes (Placeholder)
 *
 * Endpoints:
 *   POST /api/auth/login    — Authenticate user, return JWT
 *   POST /api/auth/register — Create new user account
 *   POST /api/auth/logout   — Invalidate session
 *   GET  /api/auth/me       — Get current user profile
 */

// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
//
// const JWT_SECRET = process.env.JWT_SECRET || 'diode_dev_secret_change_me';
//
// // In-memory user store (replace with database)
// const users = [];
//
// /**
//  * POST /api/auth/register
//  */
// router.post('/register', async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//
//     if (!username || !email || !password) {
//       return res.status(400).json({ error: 'All fields are required.' });
//     }
//
//     const exists = users.find(u => u.email === email);
//     if (exists) {
//       return res.status(409).json({ error: 'Email already registered.' });
//     }
//
//     const hashed = await bcrypt.hash(password, 10);
//     const user = { id: Date.now().toString(), username, email, password: hashed };
//     users.push(user);
//
//     const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
//     res.status(201).json({ token, user: { id: user.id, username, email } });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error.' });
//   }
// });
//
// /**
//  * POST /api/auth/login
//  */
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//
//     const user = users.find(u => u.email === email);
//     if (!user) {
//       return res.status(401).json({ error: 'Invalid credentials.' });
//     }
//
//     const match = await bcrypt.compare(password, user.password);
//     if (!match) {
//       return res.status(401).json({ error: 'Invalid credentials.' });
//     }
//
//     const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
//     res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
//   } catch (err) {
//     res.status(500).json({ error: 'Server error.' });
//   }
// });
//
// /**
//  * GET /api/auth/me
//  */
// router.get('/me', (req, res) => {
//   // Requires auth middleware
//   res.json({ user: null, message: 'Not implemented yet.' });
// });
//
// /**
//  * POST /api/auth/logout
//  */
// router.post('/logout', (req, res) => {
//   res.json({ message: 'Logged out.' });
// });
//
// module.exports = router;

console.log('🔐 Auth routes placeholder loaded.');
