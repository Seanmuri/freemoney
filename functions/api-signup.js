// functions/api-signup.js
const { Pool } = require('pg'); // use PG for Postgres
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode:405 };
  try {
    const { email } = JSON.parse(event.body);
    if(!email || !/^\S+@\S+\.\S+$/.test(email)) return { statusCode:400, body: JSON.stringify({ error:'invalid email' }) };

    // create or update user (demo: no password, ephemeral)
    const client = await pool.connect();
    try {
      const upsert = `INSERT INTO users (email, created_at) VALUES ($1, now()) ON CONFLICT (email) DO UPDATE SET last_seen = now() RETURNING id,email`;
      const res = await client.query(upsert, [email]);
      const user = res.rows[0];

      // In production: create JWT with secure secret
      const token = jwt.sign({ uid: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });

      // fetch simulated earnings and ads for frontend
      const earnings = {
        ad: { you: 35.00, site: 70.00 },
        affiliate: { you: 24.00, site: 48.00 },
        surveys: { you: 20.00, site: 40.00 },
        sponsorship: { you: 40.00, site: 80.00 }
      };
      const ads = [
        { title:'Netlify Deploys', desc:'Static-hosting + CI', url:'https://www.netlify.com' },
        { title:'Edge Functions', desc:'Run serverless at edge', url:'https://www.netlify.com/docs/functions/' }
      ];

      return {
        statusCode: 200,
        body: JSON.stringify({ success:true, token, earnings, ads })
      };
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    return { statusCode:500, body: JSON.stringify({ error:'server error' }) };
  }
};
