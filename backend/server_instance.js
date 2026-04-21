require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const circuitRoutes = require('./routes/circuitRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// DB Connection
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.log('MONGODB_URI not found, connecting to memory server...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        console.log('MongoDB in-memory server connected');
    } else {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        console.log('MongoDB connected');
    }
  } catch (err) {
    console.error('DB Connection error:', err);
  }
};
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/circuits', circuitRoutes);

app.get('/api', (req, res) => {
  res.send('Circuit Simulator API is running');
});

module.exports = app;
