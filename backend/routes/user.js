const router = require('express').Router();
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');

// GET current user's settings
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email monthlyTarget dailyLimit');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      name: user.name,
      email: user.email,
      monthlyTarget: user.monthlyTarget || 0,
      dailyLimit: user.dailyLimit || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user's settings (monthlyTarget, dailyLimit)
router.put('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.monthlyTarget !== undefined) user.monthlyTarget = Number(req.body.monthlyTarget) || 0;
    if (req.body.dailyLimit !== undefined) user.dailyLimit = Number(req.body.dailyLimit) || 0;

    await user.save();
    res.json({ monthlyTarget: user.monthlyTarget, dailyLimit: user.dailyLimit });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
