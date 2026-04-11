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
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Cloudinary config (reads from env vars)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use Cloudinary if configured, else fall back to local disk
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME) {
  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'juegos-en-casa', allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
  });
  upload = multer({ storage: cloudStorage });
} else {
  // Local fallback for development
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  upload = multer({ storage });
}

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
    await db.execute(`CREATE TABLE IF NOT EXISTS options (id INTEGER PRIMARY KEY AUTOINCREMENT, option_type TEXT NOT NULL, url TEXT NOT NULL, dedicatoria TEXT, fecha_invitacion TEXT, fecha_cita TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    try { await db.execute("ALTER TABLE options ADD COLUMN category TEXT DEFAULT 'General'"); } catch (e) {}
    
    await db.execute(`CREATE TABLE IF NOT EXISTS citas (id INTEGER PRIMARY KEY AUTOINCREMENT, option_type TEXT NOT NULL, url TEXT NOT NULL, dedicatoria TEXT, fecha_invitacion TEXT, fecha_cita TEXT, assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS recuerdos (id INTEGER PRIMARY KEY AUTOINCREMENT, cita_id INTEGER NOT NULL, titulo TEXT NOT NULL, foto TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (cita_id) REFERENCES citas(id));`);
    try { await db.execute("ALTER TABLE recuerdos ADD COLUMN unlock_date TEXT"); } catch (e) {}
    try { await db.execute("ALTER TABLE recuerdos ADD COLUMN lat TEXT"); } catch (e) {}
    try { await db.execute("ALTER TABLE recuerdos ADD COLUMN lng TEXT"); } catch (e) {}

    await db.execute(`CREATE TABLE IF NOT EXISTS trivia (id INTEGER PRIMARY KEY AUTOINCREMENT, pregunta TEXT NOT NULL, opcion_a TEXT NOT NULL, opcion_b TEXT NOT NULL, opcion_c TEXT NOT NULL, correcta TEXT NOT NULL);`);
    try { await db.execute("ALTER TABLE trivia ADD COLUMN is_favorite INTEGER DEFAULT 0"); } catch (e) {}

    await db.execute(`CREATE TABLE IF NOT EXISTS trivia_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT, score INTEGER NOT NULL, max_score INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS spicy_games (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, challenge TEXT NOT NULL, level TEXT NOT NULL);`);
    try { await db.execute("ALTER TABLE spicy_games ADD COLUMN is_favorite INTEGER DEFAULT 0"); } catch (e) {}

    await db.execute(`CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, character TEXT, is_redeemed INTEGER DEFAULT 0, redeemed_at DATETIME);`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS series (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, episodes_seen INTEGER DEFAULT 0, is_finished INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS truth_dare (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, question TEXT NOT NULL, is_favorite INTEGER DEFAULT 0, source TEXT DEFAULT 'local');`);

    await db.execute(`CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL);`);


    const adminResult = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: ['admin'] });
    if (adminResult.rows.length === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        await db.execute({ sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", args: ['admin', hashedPassword, 'admin'] });
        await db.execute({ sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)", args: ['user', hashedPassword, 'user'] });
    }

    // Default Spicy Games
    const spicyResult = await db.execute("SELECT COUNT(*) as count FROM spicy_games");
    if (spicyResult.rows[0].count === 0) {
        const defaultSpicy = [
            ['El Halago', 'Dile a tu pareja 3 cosas que te encantan de su cuerpo.', 'Divertido'],
            ['Beso Cósmico', 'Un beso lento que dure exactamente 20 segundos sin usar las manos.', 'Divertido'],
            ['Ojos Vendados', 'Tápale los ojos a tu pareja y dale a probar algo misterioso.', 'Normal'],
            ['Sin Ropa Superior', 'Ambos deben quitarse una prenda superior.', 'Medio'],
            ['Masaje Especial', 'Masaje en una zona sensible usando solo tus labios.', 'Medio'],
            ['Fantasía Oscura', 'Cuéntale al oído tu fantasía más atrevida.', 'Picante']
        ];
        for (const game of defaultSpicy) await db.execute({ sql: "INSERT INTO spicy_games (title, challenge, level, is_favorite) VALUES (?, ?, ?, 1)", args: game });
    }

    // Default Truth/Dare
    const tdResult = await db.execute("SELECT COUNT(*) as count FROM truth_dare");
    if (tdResult.rows[0].count === 0) {
        const dTD = [
            ['verdad', '¿Cuál ha sido el sueño más raro que has tenido conmigo?'],
            ['verdad', '¿Qué es lo que más te gusta de nuestra relación?'],
            ['reto', 'Hazme reír en 10 segundos o me debes un beso donde yo quiera.'],
            ['reto', 'Deja que lea el último mensaje que le enviaste a tu mejor amigo(a).']
        ];
        for (const t of dTD) await db.execute({ sql: "INSERT INTO truth_dare (type, question, is_favorite, source) VALUES (?, ?, 1, 'local')", args: t });
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
        const result = await db.execute({ sql: "SELECT * FROM users WHERE username = ?", args: [username] });
        if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
        const user = result.rows[0];
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales inválidas' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CITAS & RECUERDOS & OPTIONS ---
app.get('/api/options', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM options ORDER BY option_type")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/options', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin' });
        const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita, category } = req.body;
        const existing = await db.execute({ sql: "SELECT id FROM options WHERE option_type = ?", args: [option_type] });
        if (existing.rows.length > 0) {
            await db.execute({ sql: "UPDATE options SET url = ?, dedicatoria = ?, fecha_invitacion = ?, fecha_cita = ?, category = ? WHERE option_type = ?", args: [url, dedicatoria, fecha_invitacion, fecha_cita, category || 'General', option_type] });
        } else {
            await db.execute({ sql: "INSERT INTO options (option_type, url, dedicatoria, fecha_invitacion, fecha_cita, category) VALUES (?, ?, ?, ?, ?, ?)", args: [option_type, url, dedicatoria, fecha_invitacion, fecha_cita, category || 'General'] });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/options/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM options WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// Manually assign exact option format logic here.
app.post('/api/assign-option', authenticate, async (req, res) => {
    try {
        const { option_type, url, dedicatoria, fecha_invitacion, fecha_cita } = req.body;
        await db.execute({ sql: "INSERT INTO citas (option_type, url, dedicatoria, fecha_invitacion, fecha_cita) VALUES (?, ?, ?, ?, ?)", args: [option_type, url, dedicatoria, fecha_invitacion, fecha_cita] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/citas', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM citas ORDER BY assigned_at DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/citas/:id', authenticate, async (req, res) => {
    try {
        const { dedicatoria, fecha_invitacion, fecha_cita } = req.body;
        await db.execute({ sql: "UPDATE citas SET dedicatoria = ?, fecha_invitacion = ?, fecha_cita = ? WHERE id = ?", args: [dedicatoria, fecha_invitacion, fecha_cita, req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/citas/:id', authenticate, async (req, res) => {
    try {
        await db.execute({ sql: "DELETE FROM recuerdos WHERE cita_id = ?", args: [req.params.id] });
        await db.execute({ sql: "DELETE FROM citas WHERE id = ?", args: [req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/recuerdos', authenticate, upload.single('foto'), async (req, res) => {
    try {
        const { cita_id, titulo, unlock_date, lat, lng } = req.body;
        // Cloudinary returns req.file.path as a full HTTPS URL
        // Local disk returns req.file.filename, we prefix with /uploads/
        let foto = null;
        if (req.file) {
            foto = req.file.path || `/uploads/${req.file.filename}`;
        }
        await db.execute({ sql: 'INSERT INTO recuerdos (cita_id, titulo, foto, unlock_date, lat, lng) VALUES (?, ?, ?, ?, ?, ?)', args: [cita_id, titulo, foto, unlock_date || null, lat || null, lng || null] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/recuerdos', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM recuerdos ORDER BY created_at DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TRIVIA ---
app.get('/api/trivia', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM trivia ORDER BY id")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trivia', authenticate, async (req, res) => {
    try {
        const { pregunta, opcion_a, opcion_b, opcion_c, correcta } = req.body;
        await db.execute({ sql: 'INSERT INTO trivia (pregunta, opcion_a, opcion_b, opcion_c, correcta) VALUES (?, ?, ?, ?, ?)', args: [pregunta, opcion_a, opcion_b, opcion_c, correcta] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/trivia/favorite/:id', authenticate, async (req, res) => {
    try {
        const r = await db.execute({ sql: "SELECT is_favorite FROM trivia WHERE id = ?", args: [req.params.id]});
        const current = r.rows[0].is_favorite;
        await db.execute({ sql: 'UPDATE trivia SET is_favorite = ? WHERE id = ?', args: [current ? 0 : 1, req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/trivia/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM trivia WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/trivia-scores', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM trivia_scores ORDER BY score DESC, created_at DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trivia-scores', authenticate, async (req, res) => {
    try {
        const { score, max_score } = req.body;
        await db.execute({ sql: 'INSERT INTO trivia_scores (user_id, username, score, max_score) VALUES (?, ?, ?, ?)', args: [req.user.id, req.user.username, score, max_score] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SPICY GAMES ---
app.get('/api/spicy-games', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM spicy_games ORDER BY level, id")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/spicy-games', authenticate, async (req, res) => {
    try {
        const { title, challenge, level, is_favorite } = req.body;
        await db.execute({ sql: 'INSERT INTO spicy_games (title, challenge, level, is_favorite) VALUES (?, ?, ?, ?)', args: [title, challenge, level, is_favorite ? 1: 0] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/spicy-games/favorite/:id', authenticate, async (req, res) => {
    try {
        const r = await db.execute({ sql: "SELECT is_favorite FROM spicy_games WHERE id = ?", args: [req.params.id]});
        await db.execute({ sql: 'UPDATE spicy_games SET is_favorite = ? WHERE id = ?', args: [r.rows[0].is_favorite ? 0 : 1, req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/spicy-games/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM spicy_games WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- TRUTH OR DARE ---
app.get('/api/truth-dare', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM truth_dare ORDER BY id DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/truth-dare', authenticate, async (req, res) => {
    try {
        const { type, question, is_favorite } = req.body;
        await db.execute({ sql: 'INSERT INTO truth_dare (type, question, is_favorite, source) VALUES (?, ?, ?, "local")', args: [type, question, is_favorite ? 1:0] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/truth-dare/favorite/:id', authenticate, async (req, res) => {
    try {
        const r = await db.execute({ sql: "SELECT is_favorite FROM truth_dare WHERE id = ?", args: [req.params.id]});
        await db.execute({ sql: 'UPDATE truth_dare SET is_favorite = ? WHERE id = ?', args: [r.rows[0].is_favorite ? 0 : 1, req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/truth-dare/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM truth_dare WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SERIES ---
app.get('/api/series', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM series ORDER BY is_finished ASC, id DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/series', authenticate, async (req, res) => {
    try {
        const { title } = req.body;
        await db.execute({ sql: 'INSERT INTO series (title) VALUES (?)', args: [title] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/series/:id', authenticate, async (req, res) => {
    try {
        const { episodes_seen, is_finished } = req.body;
        await db.execute({ sql: 'UPDATE series SET episodes_seen = ?, is_finished = ? WHERE id = ?', args: [episodes_seen, is_finished, req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/series/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM series WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- COUPONS ---
app.get('/api/coupons', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM coupons ORDER BY is_redeemed ASC, id DESC")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/coupons', authenticate, async (req, res) => {
    try {
        const { title, description, character } = req.body;
        await db.execute({ sql: 'INSERT INTO coupons (title, description, character) VALUES (?, ?, ?)', args: [title, description, character] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/coupons/redeem/:id', authenticate, async (req, res) => {
    try {
        await db.execute({ sql: "UPDATE coupons SET is_redeemed = 1, redeemed_at = CURRENT_TIMESTAMP WHERE id = ?", args: [req.params.id] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/coupons/:id', authenticate, async (req, res) => {
    try { await db.execute({ sql: "DELETE FROM coupons WHERE id = ?", args: [req.params.id] }); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CONFIG & AI ---
app.get('/api/config', authenticate, async (req, res) => {
    try { res.json((await db.execute("SELECT * FROM config")).rows); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/config', authenticate, async (req, res) => {
    try {
        const { key, value } = req.body;
        await db.execute({ sql: 'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', args: [key, value] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/generate-ai', authenticate, async (req, res) => {
    try {
        const { game_type, context_favorites } = req.body;
        // Fetch API key
        const keyRes = await db.execute({ sql: "SELECT value FROM config WHERE key = 'GEMINI_API_KEY'"});
        if (keyRes.rows.length === 0 || !keyRes.rows[0].value) return res.status(400).json({ error: 'Falta configurar API KEY en admin' });
        const API_KEY = keyRes.rows[0].value;

        const prompt = \`Genera UNA SOLA pregunta/reto nueva EXTREMADAMENTE CREATIVA y LOCA para jugar en pareja.
Tipo de juego: \${game_type}.
Inspírate en estas temáticas si sirve: \${context_favorites || 'Cosas atrevidas y graciosas'}.
Devuelve ÚNICAMENTE la cadena de texto de la pregunta (sin asteriscos, sin comillas, sin intro).\`;

        const response = await axios.post(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=\${API_KEY}\`, {
            contents: [{ parts: [{ text: prompt }] }]
        });
        
        let text = response.data.candidates[0].content.parts[0].text.trim();
        res.json({ question: text });
    } catch (e) {
        console.error(e.response?.data || e.message);
        res.status(500).json({ error: 'Error contactando IA' });
    }
});


initDB().then(() => {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => { console.log(\`Server running on port \${PORT}\`); });
}).catch(err => { console.error("Error al iniciar la base de datos:", err); });
