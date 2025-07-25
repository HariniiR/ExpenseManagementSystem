const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const session = require('express-session');
const app = express();
require('dotenv').config();
const PORT = 3000;
const path = require('path');
const cors=require('cors');
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true },
  })
);

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.get('/inter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inter.html'));
});


app.use(express.json());



const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Error connecting to the database:', err));


app.post('/register', async (req, res) => {
  const { user_name, user_phoneNo, user_emailID, budget, pword } = req.body;
  try {
        const existingUser = await pool.query(
          `SELECT * FROM USERS WHERE user_emailID = $1`,
          [user_emailID]
        );
        
        if (existingUser.rows.length > 0) {
          return res.status(400).send('User with this email already exists');
        }
    const hashedPassword = await bcrypt.hash(pword, 10);
    const result = await pool.query(
      `INSERT INTO USERS (user_name, user_phoneNo, user_emailID, created_date, budget, pword) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5) RETURNING user_id`,
      [user_name, user_phoneNo, user_emailID, budget,hashedPassword]
    );
    const newUser = result.rows[0];
    req.session.user_id=newUser.user_id;
    req.session.user_emailID=newUser.user_emailID;
    req.session.user_name=newUser.user_name;
    //alert("User registered successfully. Login to enter.")
    res.status(201).json({ message: 'User registered successfully',  user: {
      user_id: newUser.user_id,
      user_name: newUser.user_name,
      user_emailID: newUser.user_emailID
    }
  });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error registering user: ' + err.message);
  }
});


app.post('/login', async (req, res) => {
  const { user_emailID, pword } = req.body;
  //console.log(req.session);
  try {
    //console.log(1);
    const userQuery = 'SELECT user_id, pword, user_name, user_emailID FROM USERS WHERE user_emailID = $1';
    const result = await pool.query(
      userQuery,
      [user_emailID]
    );
    
   
    if (result.rows.length === 0) {
      return res.status(400).json({message: 'User not found.'});
    }

    const user = result.rows[0];
    
   
    const match = await bcrypt.compare(pword, user.pword);
    console.log(1);
    if (match) {
    
      req.session.user_id = user.user_id;
      req.session.user_emailID = user.user_emailID;
      req.session.user_name = user.user_name;
      const responseData = { message: 'Login successful'};
      
      res.status(200).json({ message: 'Login successful', user: { user_id: user.user_id, user_name: user.user_name, user_emailID: user.user_emailID } });
    } else {
      res.status(401).json({message: 'Invalid password.'});
    }

  } catch (err) {
    res.status(500).json({message: 'Error logging in: ' + err.message});
  }
});


app.get('/check-session', (req, res) => {
  if (req.session.user_id) {
    res.status(200).send({ loggedIn: true, user: req.session.user_name });
  } else {
    res.status(401).send({ loggedIn: false });
  }
});


app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out.');
    }
    res.status(200).send('Logout successful');
  });
});
app.get('/get-user-profile/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const result = await pool.query('SELECT user_name, user_emailID, user_phoneNo, budget FROM users WHERE user_id = $1', [user_id]);
    if (result.rows.length === 0) {
      return res.status(404).send('User not found');
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching user profile: ' + err.message);
  }
});


app.put('/update-profile/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const { user_name, user_phoneNo, user_emailID, budget } = req.body;


  if (!req.session.user_id || req.session.user_id !== parseInt(user_id)) {
    return res.status(401).send('Unauthorized');
  }

  try {
    await pool.query(
      `UPDATE USERS 
       SET user_name = $1, user_phoneNo = $2, user_emailID = $3, budget = $4 
       WHERE user_id = $5`,
      [user_name, user_phoneNo, user_emailID, budget, user_id]
    );
    res.status(200).send('Profile updated successfully.');
  } catch (err) {
    res.status(500).send('Error updating profile: ' + err.message);
  }
});
app.get('/generate_expense_report/:user_id', async (req, res) => {
   const { user_id } = req.params;
    try { const result = await pool.query('SELECT generate_expense_report($1)', [user_id]); 
      const report = result.rows[0].generate_expense_report;
       res.status(200).send(report); } 
       catch (err) { 
        console.error('Error generating expense report:', err);
   res.status(500).send('Error generating expense report.'); } });

app.post('/add-expense', async (req, res) => {
  const { user_id,category_id, description, amount, expense_date } = req.body;
  //console.log(1);

  if (!user_id) {
    return res.status(401).json({message:'Unauthorized'});
  }
  try {
    //console.log(req.session);
    await pool.query(
      `INSERT INTO EXPENSES (user_id, category_id, description, amount, expense_date) 
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, category_id, description, amount, expense_date]
    );
    alert("Expense added successfully.");
    res.status(201).send('Expense added successfully.');
  } catch (err) {
    res.status(500).send('Error adding expense: ' + err.message);
  }
});

app.get('/get-expenses/:user_id', async (req, res) => {
  const {user_id}=req.params;
  if (!user_id) {
    return res.status(401).json({message: 'Unauthorized'});
  }

  try {
    const result = await pool.query(
      `SELECT u.user_name,e.expenses_id, e.description, e.amount, e.expense_date, c.category_name 
       FROM EXPENSES e 
       join users u on u.user_id=e.user_id
       JOIN CATEGORY c ON e.category_id = c.category_id 
       WHERE e.user_id = $1 
       ORDER BY e.expense_date DESC`,
      [user_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send('Error fetching expenses: ' + err.message);
  }
});


app.get('/get-categories', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM CATEGORY ORDER BY category_name`);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send('Error fetching categories: ' + err.message);
  }
});
app.delete('/delete-expense/:expense_id', async (req, res) => { 
  const { expense_id } = req.params;
   try { const result = await pool.query('DELETE FROM expenses WHERE expenses_id = $1 RETURNING *', 
    [expense_id]); if (result.rowCount > 0) {
       res.status(200).send(`Expense with ID ${expense_id} deleted.`); } 
       else { res.status(404).send(`Expense with ID ${expense_id} not found.`); } } 
       catch (err) { console.error('Error deleting expense:', err); res.status(500).send('Error deleting expense.'); } });

app.get('/', (req, res) => res.send('Server is running!'));


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
