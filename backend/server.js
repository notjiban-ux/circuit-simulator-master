require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const circuitRoutes = require('./routes/circuitRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// DB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/circuit-simulator')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/circuits', circuitRoutes);

app.get('/', (req, res) => {
  res.send('Circuit Simulator API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
