const router = require('express').Router();
const Transaction = require('../models/Transaction');
// PERBAIKAN: Tambahkan 'd' pada 'middleware'
const protect = require('../middleware/authMiddleware'); 

// GET semua transaksi user yang sedang login
router.get('/', protect, async (req, res) => {
  try {
    // Cari transaksi berdasarkan user id dari token, urutkan dari yang terbaru
    const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST tambah transaksi baru
router.post('/', protect, async (req, res) => {
  const transaction = new Transaction({
    user: req.user._id, // ambil ID dari token
    type: req.body.type,
    amount: req.body.amount,
    category: req.body.category,
    note: req.body.note,
  });

  try {
    const savedTransaction = await transaction.save();
    res.json(savedTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;