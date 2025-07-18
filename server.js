// server.js
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('Erreur: JWT_SECRET non défini dans .env');
    process.exit(1);
}

// Chemins des fichiers DB
const USERS_DB_PATH = path.join(__dirname, 'db', 'users.json');
const POSTS_DB_PATH = path.join(__dirname, 'db', 'posts.json');

// Helpers
const readDbFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]', 'utf8');
            return [];
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Erreur lecture ${filePath}:`, error);
        return [];
    }
};

const writeDbFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Erreur écriture ${filePath}:`, error);
    }
};

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://ayoma-social-app.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuration Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Utilitaires
const generateUniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Token manquant' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token invalide' });
        req.user = user;
        next();
    });
};

// Initialisation des données
let users = readDbFile(USERS_DB_PATH);
let posts = readDbFile(POSTS_DB_PATH);

// Routes
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    if (users.some(u => u.username === username)) {
        return res.status(409).json({ message: 'Nom d\'utilisateur existant' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: generateUniqueId('user'),
            username,
            email,
            password: hashedPassword,
            profilePic: '/img/profile.jpg',
            bio: '',
            followers: [],
            following: [],
            postsCount: 0
        };

        users.push(newUser);
        writeDbFile(USERS_DB_PATH, users);

        const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET, { expiresIn: '1h' });
        const { password: _, ...userData } = newUser;

        res.status(201).json({ message: 'Inscription réussie', token, user: userData });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

app.post('/api/login', async (req, res) => {
    const { identifier, password } = req.body;
    const user = users.find(u => u.username === identifier || u.email === identifier);

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    try {
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Mot de passe incorrect' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        const { password: _, ...userData } = user;

        res.json({ message: 'Connexion réussie', token, user: userData });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ... (autres routes à conserver avec le même pattern) ...

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Erreur interne du serveur' });
});

// Export pour Vercel
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
} else {
    module.exports = app;
}