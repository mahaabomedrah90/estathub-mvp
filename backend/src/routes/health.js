// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'estathub-backend',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

module.exports = router;
