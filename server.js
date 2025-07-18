// server.js

// 1. Importation des modules nécessaires
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs'); // Module pour la gestion des fichiers (lecture/écriture JSON)
const cors = require('cors'); // Importation du module CORS <--- NOUVEAU

// Charge les variables d'environnement du fichier .env
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000; // Port d'écoute du serveur

// Clé secrète JWT
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('Erreur: JWT_SECRET n\'est pas défini dans le fichier .env !');
    console.error('Veuillez créer un fichier .env à la racine de votre projet avec JWT_SECRET=votre_cle_secrete_ici');
    process.exit(1); // Arrête le processus si la clé n'est pas définie
}

// Chemins vers les fichiers de base de données JSON
const USERS_DB_PATH = path.join(__dirname, 'db', 'users.json');
const POSTS_DB_PATH = path.join(__dirname, 'db', 'posts.json');

// --- Fonctions de lecture/écriture de la "base de données" JSON ---
const readDbFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            // Si le fichier n'existe pas, crée-le avec un tableau vide
            fs.writeFileSync(filePath, '[]', 'utf8');
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erreur de lecture du fichier ${filePath}:`, error);
        return []; // Retourne un tableau vide en cas d'erreur de lecture/parse
    }
};

const writeDbFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Erreur d'écriture dans le fichier ${filePath}:`, error);
    }
};

// Initialisation des données en lisant les fichiers au démarrage
let users = readDbFile(USERS_DB_PATH);
let posts = readDbFile(POSTS_DB_PATH);

// 2. Middleware
const allowedOrigins = [
    'http://localhost:5500', // Si vous testez en local avec Live Server ou similaire
    'http://localhost:3000', // Si votre frontend tourne sur le même port que le backend en local
    'https://ayoma-social-app.vercel.app', // Votre site déployé sur Vercel
    'https://ayoma-social-app-git-main-ayoma-devs-projects.vercel.app', // Si vous avez d'autres branches déployées
    'https://ayoma-social-app-***********.vercel.app' // Pour d'autres déploiements de Vercel (remplacez *** par les caractères réels si vous avez des URL de prévisualisation)
];

app.use(cors({
    origin: function (origin, callback) {
        // Autorise les requêtes sans 'origin' (ex: Postman, requêtes du même domaine)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes HTTP autorisées
    credentials: true // Important si vous utilisez des cookies ou des en-têtes d'autorisation (comme votre JWT)
}));
// Permet à Express de parser les requêtes JSON (pour POST /api/login, /api/register)
app.use(express.json());

// Sert les fichiers statiques (HTML, CSS, JS, images) depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));
// Sert les fichiers uploadés dynamiquement depuis le dossier 'uploads' au même niveau que server.js
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Configuration de Multer pour les uploads de fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Le dossier 'uploads' est à la racine de l'application (Ayoma-App/uploads)
        const uploadPath = path.join(__dirname, 'uploads');
        // Crée le dossier 'uploads' s'il n'existe pas
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Renomme le fichier pour éviter les doublons et conserver l'extension
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Fonctions utilitaires
const generateUniqueId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// 4. Middleware d'authentification JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (token == null) {
        console.warn('Authentication: Token non fourni.');
        return res.status(401).json({ message: 'Accès non autorisé: Token manquant.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Authentication: Token invalide ou expiré.', err.message);
            return res.status(403).json({ message: 'Accès interdit: Token invalide ou expiré.' });
        }
        req.user = user; // Stocke les informations de l'utilisateur décodées du token
        next(); // Passe au middleware/route suivant
    });
};

// 5. Routes API

// Route d'inscription
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Veuillez fournir un nom d\'utilisateur, un email et un mot de passe.' });
    }

    if (users.some(u => u.username === username)) {
        return res.status(409).json({ message: 'Ce nom d\'utilisateur est déjà pris.' });
    }
    if (users.some(u => u.email === email)) {
        return res.status(409).json({ message: 'Cet email est déjà enregistré.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: generateUniqueId('user'),
            username,
            email,
            password: hashedPassword,
            profilePic: '/img/profile.jpg', // Chemin par défaut
            bio: 'Bienvenue sur Ayoma !',
            followers: [], // NOUVEAU: IDs des utilisateurs qui suivent cet utilisateur
            following: [], // NOUVEAU: IDs des utilisateurs que cet utilisateur suit
            postsCount: 0
        };
        users.push(newUser);
        writeDbFile(USERS_DB_PATH, users); // Sauvegarde les utilisateurs
        console.log('Nouvel utilisateur enregistré:', newUser.username);

        // Envoyer le token et les infos utilisateur directement pour auto-connexion
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '1h' });
        const userPublicData = { // Données à envoyer au client (sans le mot de passe)
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            profilePic: newUser.profilePic,
            bio: newUser.bio,
            followers: newUser.followers,
            following: newUser.following,
            postsCount: newUser.postsCount
        };

        res.status(201).json({ message: 'Inscription réussie.', token, user: userPublicData });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
    }
});

// Route de connexion
app.post('https://ayoma-social-app.vercel.app/api/login', async (req, res) => {
    const { identifier, password } = req.body; // 'identifier' peut être username ou email

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Veuillez fournir un identifiant et un mot de passe.' });
    }

    const user = users.find(u => u.username === identifier || u.email === identifier);

    if (!user) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mot de passe incorrect.' });
        }

        // Si tout est bon, génère un token JWT
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' }); // Token expire en 1h

        const userPublicData = { // Données à envoyer au client (sans le mot de passe)
            id: user.id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            postsCount: user.postsCount
        };

        console.log('Utilisateur connecté:', user.username);
        res.status(200).json({ message: 'Connexion réussie.', token, user: userPublicData });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
    }
});

// Route de déconnexion (principalement pour nettoyer le token côté client)
app.post('https://ayoma-social-app.vercel.app/api/auth/logout', authenticateToken, (req, res) => {
    console.log(`Utilisateur ${req.user.username} déconnecté.`);
    res.status(200).json({ message: 'Déconnexion réussie.' });
});

// Récupérer le profil de l'utilisateur connecté
app.get('https://ayoma-social-app.vercel.app/api/users/me', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const user = users.find(u => u.id === userId);

    if (!user) {
        console.error('Erreur: Utilisateur du token introuvable dans la DB (users.json).', userId);
        return res.status(404).json({ message: 'Profil utilisateur introuvable.' });
    }

    const userPublicData = { // Retourne les données publiques
        id: user.id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        followers: user.followers, // Inclut les followers
        following: user.following, // Inclut les following
        postsCount: user.postsCount
    };
    res.status(200).json(userPublicData);
});

// Récupérer tous les utilisateurs (pour les suggestions d'amis)
app.get('https://ayoma-social-app.vercel.app/api/users', authenticateToken, (req, res) => {
    // Ne renvoie pas le mot de passe ou d'autres infos sensibles
    const publicUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        profilePic: user.profilePic,
        bio: user.bio,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: user.postsCount
    }));
    res.status(200).json(publicUsers);
});

// Mettre à jour le profil de l'utilisateur (bio et photo)
app.put('https://ayoma-social-app.vercel.app/api/users/me', authenticateToken, upload.single('profilePic'), (req, res) => {
    const userId = req.user.id;
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({ message: 'Profil utilisateur introuvable.' });
    }

    let user = users[userIndex];
    const { bio } = req.body;

    if (bio !== undefined) {
        user.bio = bio;
    }

    if (req.file) {
        user.profilePic = `/uploads/${req.file.filename}`; // Chemin de la nouvelle photo
    }

    users[userIndex] = user; // Met à jour l'objet user dans le tableau
    writeDbFile(USERS_DB_PATH, users); // Sauvegarde les utilisateurs
    console.log(`Profil de ${user.username} mis à jour.`);

    const updatedUserPublicData = { // Retourne les données publiques mises à jour
        id: user.id,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        postsCount: user.postsCount
    };
    res.status(200).json({ message: 'Profil mis à jour avec succès.', user: updatedUserPublicData });
});

// Suivre/Ne plus suivre un utilisateur
app.post('https://ayoma-social-app.vercel.app/api/users/:id/follow', authenticateToken, (req, res) => {
    const targetUserId = req.params.id; // L'utilisateur à suivre/ne plus suivre
    const currentUserId = req.user.id; // L'utilisateur connecté

    if (targetUserId === currentUserId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous suivre vous-même.' });
    }

    const targetUserIndex = users.findIndex(u => u.id === targetUserId);
    const currentUserIndex = users.findIndex(u => u.id === currentUserId);

    if (targetUserIndex === -1 || currentUserIndex === -1) {
        return res.status(404).json({ message: 'Un des utilisateurs est introuvable.' });
    }

    let targetUser = users[targetUserIndex];
    let currentUser = users[currentUserIndex];

    const isFollowing = currentUser.following.includes(targetUserId);
    let action = '';

    if (isFollowing) {
        // Ne plus suivre
        currentUser.following = currentUser.following.filter(id => id !== targetUserId);
        targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
        action = 'unfollowed';
    } else {
        // Suivre
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);
        action = 'followed';
    }

    users[currentUserIndex] = currentUser;
    users[targetUserIndex] = targetUser;
    writeDbFile(USERS_DB_PATH, users); // Sauvegarde les utilisateurs

    console.log(`${currentUser.username} a ${action} ${targetUser.username}.`);
    res.status(200).json({
        message: `Utilisateur ${action} avec succès.`,
        action: action,
        newFollowersCount: targetUser.followers.length // Utile pour mettre à jour le frontend
    });
});


// Récupérer les publications (fil d'actualité)
app.get('https://ayoma-social-app.vercel.app/api/posts', authenticateToken, (req, res) => {
    // Tri par date de création (du plus récent au plus ancien)
    const sortedPosts = [...posts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(sortedPosts);
});

// Créer une nouvelle publication
app.post('https://ayoma-social-app.vercel.app/api/posts', authenticateToken, upload.single('media'), (req, res) => {
    const { content } = req.body;
    const authorId = req.user.id; // ID de l'utilisateur connecté
    let author = users.find(u => u.id === authorId);

    if (!author) {
        return res.status(404).json({ message: 'Auteur de la publication introuvable.' });
    }

    if (!content && !req.file) {
        return res.status(400).json({ message: 'Le contenu du post ou un média est requis.' });
    }

    const newPost = {
        id: generateUniqueId('post'),
        authorId: author.id,
        authorName: author.username,
        authorProfilePic: author.profilePic,
        content: content || null,
        mediaUrl: req.file ? `/uploads/${req.file.filename}` : null,
        timestamp: new Date().toISOString(),
        likes: [],
        comments: [], // Initialisé pour les nouveaux posts
        commentsCount: 0 // Initialisé pour les nouveaux posts
    };
    posts.unshift(newPost);
    
    author.postsCount++; 
    writeDbFile(POSTS_DB_PATH, posts);

    const userIndex = users.findIndex(u => u.id === author.id);
    if (userIndex !== -1) {
        users[userIndex] = author;
        writeDbFile(USERS_DB_PATH, users);
    }

    console.log(`Nouveau post de ${author.username}:`, newPost.id);
    res.status(201).json({ message: 'Publication créée avec succès.', post: newPost });
});

// Liker une publication
app.post('https://ayoma-social-app.vercel.app/api/posts/:id/like', authenticateToken, (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: 'Publication introuvable.' });
    }

    const userLikedIndex = post.likes.indexOf(userId);
    let liked = false;

    if (userLikedIndex === -1) {
        post.likes.push(userId);
        liked = true;
    } else {
        post.likes.splice(userLikedIndex, 1);
        liked = false;
    }
    writeDbFile(POSTS_DB_PATH, posts);

    console.log(`Post ${postId} liké/unliké par ${req.user.username}. Nouveaux likes: ${post.likes.length}`);
    res.status(200).json({
        message: liked ? 'Publication aimée.' : 'J\'aime retiré.',
        newLikesCount: post.likes.length,
        liked: liked
    });
});

// Route pour ajouter un commentaire à une publication
app.post('https://ayoma-social-app.vercel.app/api/posts/:id/comments', authenticateToken, (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!content) {
        return res.status(400).json({ message: 'Le contenu du commentaire ne peut pas être vide.' });
    }

    const post = posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: 'Publication introuvable.' });
    }

    if (!post.comments) {
        post.comments = []; // Assurez-vous que le tableau existe
    }

    const newComment = {
        id: generateUniqueId('comment'),
        userId: userId,
        username: username,
        content: content,
        timestamp: new Date().toISOString()
    };

    post.comments.push(newComment);
    post.commentsCount = post.comments.length; // Met à jour le nombre de commentaires

    writeDbFile(POSTS_DB_PATH, posts);

    console.log(`Nouveau commentaire sur le post ${postId} par ${username}: "${content.substring(0, 20)}..."`);
    res.status(201).json({ message: 'Commentaire ajouté avec succès.', comment: newComment });
});

// Route pour récupérer les commentaires d'une publication
app.get('https://ayoma-social-app.vercel.app/ap/posts/:id/comments', authenticateToken, (req, res) => {
    const postId = req.params.id;
    const post = posts.find(p => p.id === postId);

    if (!post) {
        return res.status(404).json({ message: 'Publication introuvable.' });
    }

    const sortedComments = (post.comments || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.status(200).json(sortedComments);
});

// Récupérer les publications d'un utilisateur spécifique
app.get('https://ayoma-social-app.vercel.app/api/users/:id/posts', authenticateToken, (req, res) => {
    const userId = req.params.id;
    const userPosts = posts.filter(p => p.authorId === userId)
                           .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(userPosts);
});

// Route par défaut: redirige vers la page de connexion
app.get('/', (req, res) => {
    res.redirect('https://ayoma-social-app.vercel.app/connexion.html');
});

// Route catch-all pour les pages non trouvées
app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});


// Remplacez cette partie :
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

// Par ceci :
if (require.main === module) {
  // Mode standalone (pour tests locaux)
  app.listen(PORT, () => console.log(`Local: http://localhost:${PORT}`));
} else {
  // Mode Serverless (pour Vercel)
  module.exports = app;
}

    // Simulation de quelques données initiales SEULEMENT si les fichiers sont vides
    if (users.length === 0) {
        bcrypt.hash('password123', 10).then(hashedPwd => {
            const user1 = {
                id: generateUniqueId('user'),
                username: 'ayomauser',
                email: 'ayoma@example.com',
                password: hashedPwd,
                profilePic: '/img/profile.jpg',
                bio: 'Je suis Ayoma, un utilisateur test.',
                followers: [], // Initialisation des followers
                following: [], // Initialisation des following
                postsCount: 0
            };
            const user2 = {
                id: generateUniqueId('user'),
                username: 'testuser',
                email: 'test@example.com',
                password: hashedPwd,
                profilePic: 'https://via.placeholder.com/150/007bff/FFFFFF?text=Test', // Image de placeholder différente
                bio: 'Bonjour ! Découvrez mon profil.',
                followers: [],
                following: [],
                postsCount: 0
            };
            users.push(user1, user2);
            // Simuler que user1 suit user2 et vice-versa pour les données initiales
            user1.following.push(user2.id);
            user2.followers.push(user1.id);
            user2.following.push(user1.id); // user2 suit aussi user1
            user1.followers.push(user2.id); // user1 est suivi par user2

            writeDbFile(USERS_DB_PATH, users);

            // Posts initiaux avec commentaires et compteurs
            posts.push({
                id: generateUniqueId('post'),
                authorId: user1.id,
                authorName: user1.username,
                authorProfilePic: user1.profilePic,
                content: "Salut la communauté Ayoma ! C'est mon premier post ici. J'espère que vous allez bien.",
                mediaUrl: null,
                timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Il y a 1 heure
                likes: [user2.id],
                comments: [{
                    id: generateUniqueId('comment'),
                    userId: user2.id,
                    username: user2.username,
                    content: "Super Ayoma ! Content de te voir ici !",
                    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString()
                }],
                commentsCount: 1
            });
            posts.push({
                id: generateUniqueId('post'),
                authorId: user2.id,
                authorName: user2.username,
                authorProfilePic: user2.profilePic,
                content: "J'adore cette plateforme ! Tellement facile de partager des pensées. #Ayoma",
                mediaUrl: 'https://via.placeholder.com/400x200/007bff/FFFFFF?text=Image+Cool',
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Il y a 30 minutes
                likes: [user1.id],
                comments: [],
                commentsCount: 0
            });
            posts.push({
                id: generateUniqueId('post'),
                authorId: user1.id,
                authorName: user1.username,
                authorProfilePic: user1.profilePic,
                content: "Nouvelle journée, nouvelles opportunités !",
                mediaUrl: null,
                timestamp: new Date().toISOString(), // Maintenant
                likes: [],
                comments: [],
                commentsCount: 0
            });
            writeDbFile(POSTS_DB_PATH, posts);
        });
    }
});


