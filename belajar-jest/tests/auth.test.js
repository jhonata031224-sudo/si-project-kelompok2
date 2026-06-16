const request = require('supertest');
const app = require('../app');

describe('Auth API Tests', () => {

  test('POST /auth/login should return token for valid credentials', async () => {

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty('token');

  });

  test('POST /auth/login should return 401 for invalid credentials', async () => {

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);

  });

});