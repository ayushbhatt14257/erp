require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const path = require("path");


const authRoutes = require('./routes/auth');
const skuRoutes = require('./routes/skus');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const masterRoutes = require('./routes/masters');
const { generateMonthlyReport } = require('./utils/reportGenerator');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/masters', masterRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`📴 Client disconnected: ${socket.id}`);
  });
});

// Auto-generate monthly report on 1st of each month at 00:05
cron.schedule('5 0 1 * *', async () => {
  console.log('📊 Running monthly report auto-generation...');
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  await generateMonthlyReport(lastMonth.getFullYear(), lastMonth.getMonth() + 1);
  console.log('✅ Monthly report generated');
});


const __dirname1 = path.resolve();

app.use(express.static(path.join(__dirname1, "client", "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname1, "client", "dist", "index.html"));
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});
