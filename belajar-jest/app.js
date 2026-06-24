const express = require('express');

const app = express();

app.use(express.json());

app.post('/auth/login', (req, res) => {

  const { email, password } = req.body;

  if (
    email === 'test@example.com' &&
    password === 'password123'
  ) {
    return res.status(200).json({
      token: 'dummy-token'
    });
  }

  return res.status(401).json({
    message: 'Invalid credentials'
  });

});

module.exports = app;