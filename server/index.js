import express from 'express';
import cors from 'cors';
import { createClient } from '@libsql/client';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

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

// Configuración de Turso
const db = createClient({
  url: process.env.DATABASE_URL || "file:database.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function initDB() {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
    `);
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            option_type TEXT NOT NULL,
            url TEXT NOT NULL,
            dedicatoria TEXT,
            fecha_invitacion TEXT,
            fecha_cita TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            option_type TEXT NOT NULL,
            url TEXT NOT NULL,
            dedicatoria TEXT,
            fecha_invitacion TEXT,
            fecha_cita TEXT,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS recuerdos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cita_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            foto TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cita_id) REFERENCES citas(id)
        );
    `);
    
    const adminResult = await db.execute({
        sql: "SELECT id FROM users WHERE username = ?",
        args: ['admin']
    });

    if (adminResult.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await db.execute({
            sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            args: ['admin', hashedPassword, 'admin']
        });
        await db.execute({
            sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            args: ['user', hashedPassword, 'user']
        });
    }
}

const SECRET_KEY = process.env.SECRET_KEY || 'couples-game-secret-key-2024';

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

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await db.execute({
            sql: "SELECT * FROM users WHERE username = ?",
            args: [username]
        });
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/options', authenticate, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM options ORDER BY option_type");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/options', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
        const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita } = req.body;
        
        const existing = await db.execute({
            sql: "SELECT id FROM options WHERE option_type = ?",
            args: [option_type]
        });

        if (existing.rows.length > 0) {
            await db.execute({
                sql: `UPDATE options SET url = ?, dedicatoria = ?, fecha_invitacion = ?, fecha_cita = ? WHERE option_type = ?`,
                args: [url, dedicatoria, fecha_invitacion, fecha_cita, option_type]
            });
        } else {
            await db.execute({
                sql: `INSERT INTO options (option_type, url, dedicatoria, fecha_invitacion, fecha_cita) VALUES (?, ?, ?, ?, ?)`,
                args: [option_type, url, dedicatoria, fecha_invitacion, fecha_cita]
            });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/assign-option', authenticate, async (req, res) => {
    try {
        const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita } = req.body;
        await db.execute({
            sql: `INSERT INTO citas (option_type, url, dedicatoria, fecha_invitacion, fecha_cita) VALUES (?, ?, ?, ?, ?)`,
            args: [option_type, url, dedicatoria, fecha_invitacion, fecha_cita]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/citas', authenticate, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM citas ORDER BY assigned_at DESC");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/recuerdos', authenticate, upload.single('foto'), async (req, res) => {
    try {
        const { cita_id, titulo } = req.body;
        const foto = req.file ? `/uploads/${req.file.filename}` : null;
        await db.execute({
            sql: 'INSERT INTO recuerdos (cita_id, titulo, foto) VALUES (?, ?, ?)',
            args: [cita_id, titulo, foto]
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/recuerdos', authenticate, async (req, res) => {
    try {
        const result = await db.execute("SELECT * FROM recuerdos ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

initDB().then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Error al iniciar la base de datos:", err);
});
