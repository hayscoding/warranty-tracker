
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Low, JSONFile } = require('lowdb');
const { join, dirname } = require('path');
const { fileURLToPath } = require('url');

// Since we're not using ES modules, adapt lowdb setup
const file = join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Initialize database if it doesn't exist
async function initializeDatabase() {
  await db.read();
  db.data = db.data || { users: [], warranties: [] };
  await db.write();
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'warranty-tracker/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});
const upload = multer({ storage: storage });


// --- API Endpoints ---

// Get all warranty items
app.get('/api/warranties', async (req, res) => {
  await db.read();
  res.json(db.data.warranties || []);
});

// Add a new warranty item
app.post('/api/warranties', upload.single('receipt'), async (req, res) => {
  const { itemName, purchaseDate, warrantyExpirationDate } = req.body;
  const receiptPhoto = req.file ? `/uploads/${req.file.filename}` : null;

  if (!itemName || !purchaseDate || !warrantyExpirationDate) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const newItem = {
    id: Date.now(),
    itemName,
    purchaseDate,
    warrantyExpirationDate,
    receiptPhoto
  };

  await db.read();
  db.data.warranties.push(newItem);
  await db.write();

  res.status(201).json(newItem);
});

// --- Server Initialization ---
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
