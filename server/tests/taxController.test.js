import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import taxRoutes from '../routes/taxRoutes.js';

const app = express();
app.use(bodyParser.json());
app.use('/api/tax', taxRoutes);

describe('TaxController compare & overunder endpoints', () => {
  it('compare endpoint rejects invalid metric', async () => {
    const res = await request(app).get('/api/tax/compare').query({ metrics: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('compare endpoint returns series structure for valid request', async () => {
    const res = await request(app).get('/api/tax/compare').query({ metrics: 'ppn,pph', limit: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('meta');
    expect(res.body).toHaveProperty('series');
    expect(Array.isArray(res.body.series)).toBe(true);
  });

  it('overunder endpoint validates metric', async () => {
    const res = await request(app).get('/api/tax/overunder').query({ metric: 'xyz' });
    expect(res.status).toBe(400);
  });

  it('overunder endpoint returns items array', async () => {
    const res = await request(app).get('/api/tax/overunder').query({ metric: 'ppn', limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
