/**
 * Diode — Project Routes (Placeholder)
 *
 * Endpoints:
 *   GET    /api/projects          — List user's projects
 *   GET    /api/projects/:id      — Get a specific project
 *   POST   /api/projects          — Create a new project
 *   PUT    /api/projects/:id      — Update / save a project
 *   DELETE /api/projects/:id      — Delete a project
 */

// const express = require('express');
// const router = express.Router();
//
// // In-memory project store (replace with database)
// const projects = [];
//
// /**
//  * GET /api/projects
//  */
// router.get('/', (req, res) => {
//   // TODO: filter by authenticated user
//   res.json({ projects });
// });
//
// /**
//  * GET /api/projects/:id
//  */
// router.get('/:id', (req, res) => {
//   const project = projects.find(p => p.id === req.params.id);
//   if (!project) return res.status(404).json({ error: 'Project not found.' });
//   res.json({ project });
// });
//
// /**
//  * POST /api/projects
//  */
// router.post('/', (req, res) => {
//   const { name, description, boardData } = req.body;
//   const project = {
//     id: Date.now().toString(),
//     name: name || 'Untitled Project',
//     description: description || '',
//     boardData: boardData || {},
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   };
//   projects.push(project);
//   res.status(201).json({ project });
// });
//
// /**
//  * PUT /api/projects/:id
//  */
// router.put('/:id', (req, res) => {
//   const index = projects.findIndex(p => p.id === req.params.id);
//   if (index === -1) return res.status(404).json({ error: 'Project not found.' });
//
//   const { name, description, boardData } = req.body;
//   projects[index] = {
//     ...projects[index],
//     name: name ?? projects[index].name,
//     description: description ?? projects[index].description,
//     boardData: boardData ?? projects[index].boardData,
//     updatedAt: new Date().toISOString(),
//   };
//   res.json({ project: projects[index] });
// });
//
// /**
//  * DELETE /api/projects/:id
//  */
// router.delete('/:id', (req, res) => {
//   const index = projects.findIndex(p => p.id === req.params.id);
//   if (index === -1) return res.status(404).json({ error: 'Project not found.' });
//   projects.splice(index, 1);
//   res.json({ message: 'Project deleted.' });
// });
//
// module.exports = router;

console.log('📁 Project routes placeholder loaded.');
