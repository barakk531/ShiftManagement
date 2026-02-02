


const express = require('express');
// const { add, get } = require('../data/user');
const { get } = require('../data/user'); 
const { createUser } = require('../services/userService');


const { createJSONToken, isValidPassword } = require('../util/auth');
const { isValidEmail, isValidText } = require('../util/validation');

const router = express.Router();

router.post('/signup', async (req, res, next) => {
  const data = req.body;
  console.log('✅ /signup called. body =', data);
  let errors = {};

  if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email.';
  } else {
    try {
      const existingUser = await get(data.email);
      if (existingUser) {
        errors.email = 'Email exists already.';
      }
    } catch (error) {}
  }

  if (!isValidText(data.password, 6)) {
    errors.password = 'Invalid password. Must be at least 6 characters long.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'User signup failed due to validation errors.',
      errors,
    });
  }

  try {
    const firstName = data['first-name'] ?? data.firstName;
    const lastName  = data['last-name']  ?? data.lastName;
    console.log('➡️ calling createUser with email:', data.email);

    const createdUser = await createUser({
      email: data.email,
      password: data.password,
      firstName,
      lastName,
      role: data.role,
      terms: data.terms,
      acquisition: data.acquisition,
    });
    const authToken = createJSONToken(createdUser.email);
    res
      .status(201)
      .json({ message: 'User created.', user: createdUser, token: authToken });
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('already exists')) {
        return res.status(422).json({
          message: 'User signup failed due to validation errors.',
          errors: { email: 'Email exists already.' },
        });
      }
      next(error);
    }

});

router.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  let user;
  try {
    user = await get(email);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed.' });
  }

  const pwIsValid = await isValidPassword(password, user.password);
  if (!pwIsValid) {
    return res.status(422).json({
      message: 'Invalid credentials.',
      errors: { credentials: 'Invalid email or password entered.' },
    });
  }

  const token = createJSONToken(email);
  res.json({ token });
});



module.exports = router;
