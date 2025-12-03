const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

//load config
dotenv.config();

//connect database
connectDB();

const app = express();

//middleware
app.use(express.json()); // agar bisa baca JSON
app.use(cors());

//import routes
const authRoute = require('./routes/auth');
const transactionRoute = require('./routes/transaction'); // Pastikan nama file ini sesuai (transaction.js atau transactions.js)
const userRoute = require('./routes/user');

//route middleware
app.use('/api/auth', authRoute); // <--- INI YANG DIPERBAIKI (Tadinya '/api/user')
app.use('/api/transactions', transactionRoute);
app.use('/api/user', userRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));