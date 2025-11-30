const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const token = req.headder('auth-token');
  if (!token) return res.status(401).send('Akses ditolak');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // menyimpan id user ke request
    next();;
  } catch (err) {
    res.status(400).send('Token tidak valid');
  }
};

module.exports = protect;