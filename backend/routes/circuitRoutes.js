const express = require('express');
const Circuit = require('../models/Circuit');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

// Save Circuit
router.post('/save', auth, async (req, res) => {
  try {
    const { name, data, id } = req.body;
    let circuit;

    if (id) {
      circuit = await Circuit.findOne({ _id: id, user: req.userId });
      if (circuit) {
        circuit.name = name;
        circuit.data = data;
        await circuit.save();
      } else {
        return res.status(404).json({ message: 'Circuit not found or unauthorized' });
      }
    } else {
      circuit = new Circuit({ name, data, user: req.userId });
      await circuit.save();
    }

    res.status(200).json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get User's Circuits
router.get('/my-circuits', auth, async (req, res) => {
  try {
    const circuits = await Circuit.find({ user: req.userId }).sort({ updatedAt: -1 });
    res.json(circuits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Single Circuit (Public or Owned)
router.get('/:id', async (req, res) => {
  try {
    const circuit = await Circuit.findById(req.params.id);
    if (!circuit) return res.status(404).json({ message: 'Circuit not found' });
    
    // Check if public or if requester is owner (simplified: for now let it be public if requested by ID)
    res.json(circuit);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Circuit
router.delete('/:id', auth, async (req, res) => {
  try {
    const circuit = await Circuit.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!circuit) return res.status(404).json({ message: 'Circuit not found or unauthorized' });
    res.json({ message: 'Circuit deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
