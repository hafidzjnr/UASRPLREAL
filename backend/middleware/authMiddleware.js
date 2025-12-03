const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  // PERBAIKAN: req.header (bukan headder)
  const token = req.header('auth-token');
  
  if (!token) return res.status(401).send('Akses Ditolak');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Token Invalid');
  }
};

module.exports = protect;
