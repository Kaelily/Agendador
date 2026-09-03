const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'agenda_chefe',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Ensure table and columns exist
pool.query(`
  CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(255) PRIMARY KEY,
    client VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    company_info VARCHAR(255),
    market_operation TEXT,
    biggest_difficulty TEXT,
    problem_to_solve TEXT,
    how_can_we_help TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    created_at TIMESTAMP NOT NULL
  );
  ALTER TABLE meetings ADD COLUMN IF NOT EXISTS email VARCHAR(255);
`).catch(err => console.error('Error initializing/migrating database table:', err));

app.get('/api/meetings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meetings ORDER BY date ASC, time ASC');
    // Mapear os campos do banco (snake_case) para o formato esperado pelo frontend (camelCase)
    const formattedRows = result.rows.map(row => ({
      id: row.id,
      client: row.client,
      email: row.email || null,
      companyInfo: row.company_info || null,
      marketOperation: row.market_operation || null,
      biggestDifficulty: row.biggest_difficulty || null,
      problemToSolve: row.problem_to_solve || null,
      howCanWeHelp: row.how_can_we_help || null,
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : null,
      time: row.time ? row.time.substring(0, 5) : null,
      createdAt: row.created_at
    }));
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/meetings', async (req, res) => {
  const { id, client, email, companyInfo, marketOperation, biggestDifficulty, problemToSolve, howCanWeHelp, date, time, createdAt } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO meetings 
      (id, client, email, company_info, market_operation, biggest_difficulty, problem_to_solve, how_can_we_help, date, time, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [
        id, 
        client || null, 
        email || null, 
        companyInfo || null, 
        marketOperation || null, 
        biggestDifficulty || null, 
        problemToSolve || null, 
        howCanWeHelp || null, 
        date, 
        time, 
        createdAt || new Date().toISOString()
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM meetings WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
