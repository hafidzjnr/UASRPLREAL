const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Register
router.post('/register', async (req, res) => {
  try {
    // cek email duplikat
    const emailExist = await User.findOne({ email: req.body.email });
    if (emailExist) return res.status(400).json({ error: 'Email sudah terdaftar' });

    // hash pw
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // buat user baru
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();
    res.json({ user: savedUser._id, name: savedUser.name });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // cek email
    const foundUser = await User.findOne({ email: req.body.email });
    if (!foundUser) return res.status(400).json({ error: 'Email tidak ditemukan' });

    // cek pw
    const validPass = await bcrypt.compare(req.body.password, foundUser.password);
    if (!validPass) return res.status(400).json({ error: 'Password salah' });

    // buat token jwt
    const token = jwt.sign({ _id: foundUser._id }, process.env.JWT_SECRET);
    res.header('auth-token', token).json({ token: token, name: foundUser.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;