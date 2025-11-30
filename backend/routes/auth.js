const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const user = require('../models/user');

//Register
router.post('/register', async (req, res) => {
  //cek email duplikat
  const emailExist = await user.findOne({email: req.body.email });
  if (emailExist) return res.status(400).send('Email sudah terdaftar');

  //hash pw
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  // buat user baru
  const user = new user({
    namme: req.body.name,
    email: req.body.email,
    password: hashedPassword,
  });

  try {
    const savedUser = await user.save();
    res.send({user: savedUser._id, name: savedUser.name });
  }catch (err) {
    res.status(400).send(err);
  }
});

//Login
router.post('/login', async (req, res) => {
  //cek email
  const user = await user.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('Email tidak ditemukan');

  //cek pw
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send('Password salah');

  // buat token jwt
  const token = jwt.sign({_id: user._id }, process.env.JWT_SECRET);
  res.header('auth-token', token).send({token: token, name: user.name });
});

module.exports = router;