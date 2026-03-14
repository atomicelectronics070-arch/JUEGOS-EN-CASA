import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const dbPath = path.join(__dirname, 'database.db');

let db;

async function initDB() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
        
        CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            option_type TEXT NOT NULL,
            url TEXT NOT NULL,
            dedicatoria TEXT,
            fecha_invitacion TEXT,
            fecha_cita TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            option_type TEXT NOT NULL,
            url TEXT NOT NULL,
            dedicatoria TEXT,
            fecha_invitacion TEXT,
            fecha_cita TEXT,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS recuerdos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cita_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            foto TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cita_id) REFERENCES citas(id)
        );
    `);
    
    const adminExists = db.exec("SELECT id FROM users WHERE username = 'admin'");
    if (adminExists.length === 0 || adminExists[0].values.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hashedPassword, 'admin']);
        db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['user', hashedPassword, 'user']);
        saveDB();
    }
}

function saveDB() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

const SECRET_KEY = 'couples-game-secret-key-2024';

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const result = db.exec("SELECT * FROM users WHERE username = ?", [username]);
    
    if (result.length === 0 || result[0].values.length === 0) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const userRow = result[0].values[0];
    const user = {
        id: userRow[0],
        username: userRow[1],
        password: userRow[2],
        role: userRow[3]
    };
    
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, role: user.role, username: user.username });
});

app.get('/api/options', authenticate, (req, res) => {
    const result = db.exec("SELECT * FROM options ORDER BY option_type");
    if (result.length === 0) return res.json([]);
    
    const columns = result[0].columns;
    const options = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
    res.json(options);
});

app.post('/api/options', authenticate, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
    const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita } = req.body;
    
    const existing = db.exec("SELECT id FROM options WHERE option_type = ?", [option_type]);
    if (existing.length > 0 && existing[0].values.length > 0) {
        db.run(`UPDATE options SET url = ?, dedicatoria = ?, fecha_invitacion = ?, fecha_cita = ? WHERE option_type = ?`,
            [url, dedicatoria, fecha_invitacion, fecha_cita, option_type]);
    } else {
        db.run(`INSERT INTO options (option_type, url, dedicatoria, fecha_invitacion, fecha_cita) VALUES (?, ?, ?, ?, ?)`,
            [option_type, url, dedicatoria, fecha_invitacion, fecha_cita]);
    }
    saveDB();
    res.json({ success: true });
});

app.post('/api/assign-option', authenticate, (req, res) => {
    const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita } = req.body;
    db.run(`INSERT INTO citas (option_type, url, dedicatoria, fecha_invitacion, fecha_cita) VALUES (?, ?, ?, ?, ?)`,
        [option_type, url, dedicatoria, fecha_invitacion, fecha_cita]);
    saveDB();
    res.json({ success: true });
});

app.get('/api/citas', authenticate, (req, res) => {
    const result = db.exec("SELECT * FROM citas ORDER BY assigned_at DESC");
    if (result.length === 0) return res.json([]);
    
    const columns = result[0].columns;
    const citas = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
    res.json(citas);
});

app.post('/api/recuerdos', authenticate, upload.single('foto'), (req, res) => {
    const { cita_id, titulo } = req.body;
    const foto = req.file ? `/uploads/${req.file.filename}` : null;
    db.run('INSERT INTO recuerdos (cita_id, titulo, foto) VALUES (?, ?, ?)', [cita_id, titulo, foto]);
    saveDB();
    res.json({ success: true });
});

app.get('/api/recuerdos', authenticate, (req, res) => {
    const result = db.exec("SELECT * FROM recuerdos ORDER BY created_at DESC");
    if (result.length === 0) return res.json([]);
    
    const columns = result[0].columns;
    const recuerdos = result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
    res.json(recuerdos);
});

initDB().then(() => {
    app.listen(3001, () => {
        console.log('Server running on port 3001');
    });
});
