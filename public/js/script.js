// public/js/script.js

// --- Fonctions utilitaires globales ---
// Elles sont déclarées dans le scope global pour être accessibles par le script intégré dans fil.html

/**
 * Récupère le token d'authentification depuis le localStorage.
 * @returns {string|null} Le token JWT ou null s'il n'existe pas.
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Récupère les données de l'utilisateur actuel depuis le localStorage.
 * @returns {object|null} L'objet utilisateur ou null s'il n'existe pas.
 */
function getCurrentUser() {
    const userString = localStorage.getItem('currentUser');
    return userString ? JSON.parse(userString) : null;
}

/**
 * Affiche un message à l'utilisateur (succès, erreur, info).
 * Le conteneur de message est géré dans le script intégré du HTML.
 * @param {string} message - Le texte du message.
 * @param {string} type - Le type de message ('success', 'error', 'info').
 */
function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}`; // Ajoute la classe pour le style
        messageContainer.style.display = 'block';

        // Cache le message après quelques secondes
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    } else {
        console.warn('Conteneur de message non trouvé. Message:', message, type);
    }
}

/**
 * Formatte une date en "il y a X temps".
 * @param {string} dateString - La date ISO 8601.
 * @returns {string} Le temps écoulé formaté.
 */
function timeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}j`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    return `${years} ans`;
}

// --- Fonctions de gestion des données et de l'interface utilisateur ---

/**
 * Crée l'élément HTML pour une seule publication.
 * @param {object} post - L'objet publication.
 * @returns {HTMLElement} L'élément div représentant la publication.
 */
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.classList.add('post', 'card'); // Ajoute la classe 'card' pour le style
    postDiv.dataset.postId = post.id;

    const currentUserId = getCurrentUser() ? getCurrentUser().id : null;
    const isLiked = post.likes.includes(currentUserId);
    const isAuthor = currentUserId === post.authorId;

    let mediaHtml = '';
    if (post.mediaUrl) {
        const fileExtension = post.mediaUrl.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
            mediaHtml = `<img src="${post.mediaUrl}" alt="Média du post" class="post-media">`;
        } else if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExtension)) {
            mediaHtml = `<video controls class="post-media"><source src="${post.mediaUrl}" type="video/${fileExtension}">Votre navigateur ne supporte pas la vidéo.</video>`;
        }
    }

    // Assurez-vous que post.authorProfilePic et post.authorName existent ou utilisez des valeurs par défaut
    const authorProfilePic = post.authorProfilePic || '/img/profile.jpg';
    const authorName = post.authorName || 'Utilisateur inconnu';

    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${authorProfilePic}" alt="${authorName}" class="profile-pic-medium">
            <div class="post-info">
                <span class="post-author">${authorName}</span>
                ${!isAuthor ? `<button class="follow-button button" data-user-id="${post.authorId}">${getCurrentUser() && getCurrentUser().following.includes(post.authorId) ? 'Suivi(e)' : 'Suivre'}</button>` : ''}
                <span class="post-timestamp">${timeAgo(post.timestamp)}</span>
            </div>
        </div>
        <div class="post-content">
            <p>${post.content || ''}</p>
            ${mediaHtml}
        </div>
        <div class="post-actions">
            <button class="like-button ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                <i class="fa-solid fa-heart"></i> J'aime (<span class="likes-count">${post.likes.length}</span>)
            </button>
            <button class="comment-button" data-post-id="${post.id}">
                <i class="fa-solid fa-comment"></i> Commenter (<span class="comments-count">${post.commentsCount || 0}</span>)
            </button>
            <button class="share-button" data-post-id="${post.id}" data-post-content="${post.content || ''}">
                <i class="fa-solid fa-share-nodes"></i> Partager
            </button>
        </div>

        <div class="comments-section hidden" data-post-id="${post.id}">
            <div class="comments-list">
                </div>
            <div class="add-comment-form">
                <input type="text" class="comment-input" placeholder="Ajouter un commentaire..." data-post-id="${post.id}">
                <button class="send-comment-button" data-post-id="${post.id}"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    return postDiv;
}

/**
 * Charge et affiche les publications du fil d'actualité.
 */
async function loadFeedPosts() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) {
        console.warn('Conteneur de posts (#posts-container) non trouvé.');
        return;
    }
    postsContainer.innerHTML = '<p class="loading-message">Chargement des publications...</p>';

    const authToken = getAuthToken();
    if (!authToken) {
        postsContainer.innerHTML = '<p class="error-message">Veuillez vous connecter pour voir le fil d\'actualité.</p>';
        return;
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec du chargement des publications.');
        }

        const posts = await response.json();
        postsContainer.innerHTML = ''; // Nettoie le message de chargement

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p class="no-posts">Aucune publication pour le moment.</p>';
        } else {
            posts.forEach(post => {
                postsContainer.appendChild(createPostElement(post));
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des publications:', error);
        postsContainer.innerHTML = `<p class="error-message">Erreur: ${error.message}</p>`;
        showMessage(`Erreur lors du chargement des publications: ${error.message}`, 'error');
    }
}

/**
 * Charge et affiche les posts d'un utilisateur spécifique (pour la page profil).
 * @param {string} userId - L'ID de l'utilisateur dont on veut les posts.
 * @param {string} containerId - L'ID du conteneur HTML où les posts doivent être affichés.
 */
async function loadUserPosts(userId, containerId = 'main-user-posts-container') {
    const userPostsContainer = document.getElementById(containerId);
    if (!userPostsContainer) {
        console.warn(`Conteneur de posts utilisateur (#${containerId}) non trouvé.`);
        return;
    }
    userPostsContainer.innerHTML = '<p class="loading-message">Chargement des posts de l\'utilisateur...</p>';

    const authToken = getAuthToken();
    if (!authToken) {
        userPostsContainer.innerHTML = '<p class="error-message">Veuillez vous connecter pour voir les posts.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/users/${userId}/posts`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec du chargement des posts de l\'utilisateur.');
        }

        const userPosts = await response.json();
        userPostsContainer.innerHTML = '';

        if (userPosts.length === 0) {
            userPostsContainer.innerHTML = '<p class="no-posts">Aucun post pour cet utilisateur.</p>';
        } else {
            userPosts.forEach(post => {
                userPostsContainer.appendChild(createPostElement(post));
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des posts de l\'utilisateur:', error);
        userPostsContainer.innerHTML = `<p class="error-message">Erreur: ${error.message}</p>`;
        showMessage(`Erreur lors du chargement des posts de l\'utilisateur: ${error.message}`, 'error');
    }
}

/**
 * Charge les données de profil de l'utilisateur connecté et les affiche.
 * @param {string} targetLocation - 'sidebar-right' pour le profil compact, 'main' pour la section profil complète.
 */
async function loadUserProfileData(targetLocation = 'main') {
    const authToken = getAuthToken();
    if (!authToken) return;

    try {
        const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec du chargement du profil.');
        }

        const user = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user)); // Met à jour le localStorage

        if (targetLocation === 'sidebar-right') {
            const profilePicElement = document.getElementById('profile-pic'); // Sidebar Feed
            const usernameElement = document.getElementById('username'); // Sidebar Feed
            const bioElement = document.getElementById('bio'); // Sidebar Feed
            const postsCountElement = document.getElementById('posts-count');
            const followersCountElement = document.getElementById('followers-count');
            const followingCountElement = document.getElementById('following-count');

            if (profilePicElement) profilePicElement.src = user.profilePic || '/img/profile.jpg';
            if (usernameElement) usernameElement.textContent = user.username;
            if (bioElement) bioElement.textContent = user.bio || 'Aucune bio.';
            if (postsCountElement) postsCountElement.textContent = user.postsCount || 0;
            if (followersCountElement) followersCountElement.textContent = user.followers.length;
            if (followingCountElement) followingCountElement.textContent = user.following.length;

        } else if (targetLocation === 'main') {
            // Éléments de la section Profil principale
            const mainProfilePic = document.getElementById('main-profile-pic');
            const mainUsername = document.getElementById('main-username');
            const mainBio = document.getElementById('main-bio');
            const mainPostsCount = document.getElementById('main-posts-count');
            const mainFollowersCount = document.getElementById('main-followers-count');
            const mainFollowingCount = document.getElementById('main-following-count');
            const dropdownUsername = document.getElementById('dropdown-username'); // Dans le menu déroulant du header
            const headerProfilePic = document.getElementById('header-profile-pic'); // Photo de profil dans l'en-tête
            const dropdownProfilePic = document.querySelector('.dropdown-profile-pic'); // Photo de profil dans le dropdown

            if (mainProfilePic) mainProfilePic.src = user.profilePic || '/img/profile.jpg';
            if (mainUsername) mainUsername.textContent = user.username;
            if (mainBio) mainBio.textContent = user.bio || 'Aucune bio fournie.';
            if (mainPostsCount) mainPostsCount.textContent = user.postsCount || 0;
            if (mainFollowersCount) mainFollowersCount.textContent = user.followers.length;
            if (mainFollowingCount) mainFollowingCount.textContent = user.following.length;
            if (dropdownUsername) dropdownUsername.textContent = user.username;
            if (headerProfilePic) headerProfilePic.src = user.profilePic || '/img/profile.jpg';
            if (dropdownProfilePic) dropdownProfilePic.src = user.profilePic || '/img/profile.jpg';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
        showMessage(`Erreur profil: ${error.message}`, 'error');
        // Gérer la déconnexion si le token est invalide par exemple
        if (error.message.includes('Token invalide ou expiré')) {
            setTimeout(() => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                window.location.href = '/connexion.html';
            }, 2000);
        }
    }
}


/**
 * Charge et affiche les suggestions d'utilisateurs.
 * @param {string} type - 'sidebar' pour la sidebar du fil, 'full' pour la section Amis.
 */
async function loadSuggestedUsers(type = 'sidebar') {
    let container;
    if (type === 'sidebar') {
        container = document.getElementById('suggested-users-container');
    } else { // type === 'full'
        container = document.getElementById('all-users-list'); // Dans la section "Amis"
    }

    if (!container) {
        console.warn(`Conteneur de suggestions utilisateur (${type}) non trouvé.`);
        return;
    }
    container.innerHTML = '<p class="loading-message">Chargement des suggestions...</p>';

    const authToken = getAuthToken();
    if (!authToken) {
        container.innerHTML = '<p class="error-message">Veuillez vous connecter pour voir les suggestions.</p>';
        return;
    }

    try {
        const response = await fetch('/api/users/suggested', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec du chargement des suggestions.');
        }

        const suggestedUsers = await response.json();
        container.innerHTML = '';

        if (suggestedUsers.length === 0) {
            container.innerHTML = '<p class="no-posts">Aucune suggestion pour le moment.</p>';
        } else {
            suggestedUsers.forEach(user => {
                const userCard = document.createElement('li');
                userCard.classList.add('user-card');
                const isFollowing = getCurrentUser() && getCurrentUser().following.includes(user.id);
                userCard.innerHTML = `
                    <img src="${user.profilePic || '/img/profile.jpg'}" alt="${user.username}" class="profile-pic-small">
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        <span class="user-bio">${user.bio || 'Nouvel utilisateur.'}</span>
                    </div>
                    ${getCurrentUser().id !== user.id ? `<button class="follow-button button ${isFollowing ? 'followed' : ''}" data-user-id="${user.id}">${isFollowing ? 'Suivi(e)' : 'Suivre'}</button>` : ''}
                `;
                container.appendChild(userCard);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des suggestions:', error);
        container.innerHTML = `<p class="error-message">Erreur: ${error.message}</p>`;
        showMessage(`Erreur lors du chargement des suggestions: ${error.message}`, 'error');
    }
}

/**
 * Charge et affiche la liste des utilisateurs que l'utilisateur actuel suit.
 * (Placeholder - à implémenter avec l'API réelle)
 */
async function loadMyFollowingList() {
    const container = document.getElementById('my-following-list'); // Assurez-vous d'avoir cet ID dans la section Amis
    if (!container) {
        console.warn('Conteneur de "mes abonnements" non trouvé.');
        return;
    }
    container.innerHTML = '<p class="loading-message">Chargement de vos abonnements...</p>';

    // Simuler un appel API
    setTimeout(() => {
        const dummyFollowing = [
            { id: 'user4', username: 'AmieUtilisateur1', profilePic: '/img/profile2.jpg', bio: 'Passionné de technologie.' },
            { id: 'user5', username: 'AmiSportif', profilePic: '/img/profile3.jpg', bio: 'Entraînement quotidien.' },
        ];
        container.innerHTML = '';
        if (dummyFollowing.length === 0) {
            container.innerHTML = '<p class="no-posts">Vous ne suivez personne pour le moment.</p>';
        } else {
            dummyFollowing.forEach(user => {
                const userCard = document.createElement('li');
                userCard.classList.add('user-card');
                userCard.innerHTML = `
                    <img src="${user.profilePic || '/img/profile.jpg'}" alt="${user.username}" class="profile-pic-small">
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        <span class="user-bio">${user.bio}</span>
                    </div>
                    <button class="follow-button button followed" data-user-id="${user.id}">Suivi(e)</button>
                `;
                container.appendChild(userCard);
            });
        }
    }, 1000); // Délai pour simuler le chargement
}

/**
 * Charge et affiche les demandes d'amis en attente.
 * (Placeholder - à implémenter avec l'API réelle)
 */
async function loadFriendRequests() {
    const container = document.getElementById('friend-requests-list'); // Assurez-vous d'avoir cet ID
    if (!container) {
        console.warn('Conteneur des demandes d\'amis non trouvé.');
        return;
    }
    container.innerHTML = '<p class="loading-message">Chargement des demandes d\'amis...</p>';

    // Simuler un appel API
    setTimeout(() => {
        const dummyRequests = [
            { id: 'user6', username: 'DemandeDeJulie', profilePic: '/img/profile4.jpg' },
        ];
        container.innerHTML = '';
        if (dummyRequests.length === 0) {
            container.innerHTML = '<p class="no-posts">Aucune demande d\'ami en attente.</p>';
        } else {
            dummyRequests.forEach(user => {
                const requestItem = document.createElement('li');
                requestItem.classList.add('user-card');
                requestItem.innerHTML = `
                    <img src="${user.profilePic || '/img/profile.jpg'}" alt="${user.username}" class="profile-pic-small">
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                    </div>
                    <div class="notification-actions">
                        <button class="button accept-button">Accepter</button>
                        <button class="button secondary-button">Refuser</button>
                    </div>
                `;
                container.appendChild(requestItem);
            });
        }
    }, 1200);
}

/**
 * Charge et affiche les conversations.
 * (Placeholder - à implémenter avec l'API réelle)
 */
async function loadConversations() {
    const container = document.getElementById('conversations-list');
    if (!container) {
        console.warn('Conteneur des conversations non trouvé.');
        return;
    }
    container.innerHTML = '<p class="loading-message">Chargement des conversations...</p>';

    // Simuler un appel API
    setTimeout(() => {
        const dummyConversations = [
            { id: 'conv1', username: 'Alice', profilePic: '/img/profile2.jpg', lastMessage: 'Salut, ça va ?', timestamp: new Date().toISOString() },
            { id: 'conv2', username: 'Bob', profilePic: '/img/profile3.jpg', lastMessage: 'Rendez-vous à 14h.', timestamp: new Date(Date.now() - 3600000).toISOString() },
        ];
        container.innerHTML = '';
        if (dummyConversations.length === 0) {
            container.innerHTML = '<p class="no-posts">Aucune conversation pour le moment.</p>';
        } else {
            dummyConversations.forEach(conv => {
                const convItem = document.createElement('div');
                convItem.classList.add('conversation-item');
                convItem.dataset.userId = conv.id; // Utilisez l'ID de l'utilisateur pour l'exemple
                convItem.innerHTML = `
                    <img src="${conv.profilePic || '/img/profile.jpg'}" alt="${conv.username}" class="profile-pic-small">
                    <div class="conversation-info">
                        <span class="conversation-username">${conv.username}</span>
                        <p class="last-message-preview">${conv.lastMessage}</p>
                    </div>
                `;
                container.appendChild(convItem);
            });
        }
    }, 1000);
}

/**
 * Charge et affiche les notifications.
 * (Placeholder - à implémenter avec l'API réelle)
 */
async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) {
        console.warn('Conteneur des notifications non trouvé.');
        return;
    }
    container.innerHTML = '<p class="loading-message">Chargement des notifications...</p>';

    // Simuler un appel API
    setTimeout(() => {
        const dummyNotifications = [
            { id: 'notif1', type: 'like', user: 'Charlie', profilePic: '/img/profile.jpg', time: new Date().toISOString() },
            { id: 'notif2', type: 'comment', user: 'Diana', profilePic: '/img/profile2.jpg', time: new Date(Date.now() - 7200000).toISOString() },
            { id: 'notif3', type: 'friendRequest', user: 'Eve', profilePic: '/img/profile3.jpg', time: new Date(Date.now() - 86400000).toISOString() },
        ];
        container.innerHTML = '';
        if (dummyNotifications.length === 0) {
            container.innerHTML = '<p class="no-posts">Aucune notification pour le moment.</p>';
        } else {
            dummyNotifications.forEach(notif => {
                const notifItem = document.createElement('li');
                notifItem.classList.add('user-card', 'notification-item');
                let contentHtml = '';
                if (notif.type === 'like') {
                    contentHtml = `<span class="notification-text"><strong>${notif.user}</strong> a aimé votre publication.</span>`;
                } else if (notif.type === 'comment') {
                    contentHtml = `<span class="notification-text"><strong>${notif.user}</strong> a commenté votre publication.</span>`;
                } else if (notif.type === 'friendRequest') {
                    contentHtml = `
                        <span class="notification-text"><strong>${notif.user}</strong> vous a envoyé une demande d'ami.</span>
                        <div class="notification-actions">
                            <button class="button accept-button">Accepter</button>
                            <button class="button secondary-button">Refuser</button>
                        </div>
                    `;
                }
                notifItem.innerHTML = `
                    <img src="${notif.profilePic || '/img/profile.jpg'}" alt="${notif.user}" class="profile-pic-small">
                    <div class="notification-content">
                        ${contentHtml}
                        <span class="notification-time">(${timeAgo(notif.time)})</span>
                    </div>
                `;
                container.appendChild(notifItem);
            });
        }
    }, 1500);
}


/**
 * Pré-remplit le formulaire des paramètres avec les données actuelles de l'utilisateur.
 * (Ce formulaire est maintenant dans fil.html section settings)
 */
async function populateSettingsForm() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showMessage('Veuillez vous connecter pour éditer vos paramètres.', 'error');
        return;
    }

    const usernameSettingInput = document.getElementById('username-setting');
    const bioSettingInput = document.getElementById('bio-setting');

    if (usernameSettingInput) usernameSettingInput.value = currentUser.username || '';
    if (bioSettingInput) bioSettingInput.value = currentUser.bio || '';
    // Pour la photo de profil, il faudrait un input file pour l'upload
    // et une image preview pour l'affichage de la photo actuelle si ce formulaire le gère
}


// --- GESTION DES LIKES, COMMENTAIRES ET PARTAGES (Délégation d'événements) ---
// Ces listeners sont attachés au document et captureront les événements
// même sur les éléments créés dynamiquement (posts).

document.addEventListener('click', async (event) => {
    const authToken = getAuthToken();
    const currentUser = getCurrentUser();

    // Redirection si l'utilisateur n'est pas authentifié pour les actions protégées
    if (!authToken && !event.target.classList.contains('nav-button')) { // Permet la navigation même déconnecté
        showMessage('Vous devez être connecté pour effectuer cette action.', 'info');
        // Optionnel: rediriger vers la page de connexion
        // localStorage.setItem('redirectAfterLogin', window.location.href);
        // window.location.href = '/connexion.html';
        return;
    }

    // Gère les clics sur les boutons "J'aime"
    if (event.target.closest('.like-button')) { // Utilise closest pour s'assurer que le clic est sur le bouton ou son icône/span
        const button = event.target.closest('.like-button');
        const postId = button.dataset.postId;
        const likesCountSpan = button.querySelector('.likes-count');

        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Échec de l\'opération "J\'aime".');
            }

            const result = await response.json();
            if (likesCountSpan) likesCountSpan.textContent = result.newLikesCount;
            if (result.liked) {
                button.classList.add('liked');
                showMessage('Publication aimée !', 'success');
            } else {
                button.classList.remove('liked');
                showMessage('J\'aime retiré.', 'info');
            }
        } catch (error) {
            console.error('Erreur like/unlike:', error);
            showMessage(`Erreur: ${error.message}`, 'error');
        }
    }

    // Gère les clics sur le bouton "Commenter (X)" pour afficher/masquer la section
    if (event.target.closest('.comment-button')) {
        const button = event.target.closest('.comment-button');
        const postId = button.dataset.postId;
        const commentsSection = document.querySelector(`.comments-section[data-post-id="${postId}"]`);
        if (commentsSection) {
            commentsSection.classList.toggle('hidden'); // Bascule la visibilité
            if (!commentsSection.classList.contains('hidden')) {
                loadCommentsForPost(postId); // Si la section est maintenant visible, charge les commentaires
            }
        }
    }

    // Gère le clic sur le bouton "Envoyer" d'un commentaire
    if (event.target.closest('.send-comment-button')) {
        const button = event.target.closest('.send-comment-button');
        const postId = button.dataset.postId;
        const commentInput = document.querySelector(`.comments-section[data-post-id="${postId}"] .comment-input`);
        if (commentInput) {
            addCommentToPost(postId, commentInput.value);
        }
    }

    // Gère le clic sur le bouton "Partager"
    if (event.target.closest('.share-button')) {
        const button = event.target.closest('.share-button');
        const postId = button.dataset.postId;
        const postContent = button.dataset.postContent;
        sharePost(postId, postContent);
    }

    // Gère le clic sur le bouton "Suivre"
    if (event.target.closest('.follow-button')) {
        const button = event.target.closest('.follow-button');
        const targetUserId = button.dataset.userId;
        await toggleFollowUser(targetUserId, button);
    }

    // Gérer les boutons Accepter/Refuser demande d'amis (dans la section Notifications/Amis)
    if (event.target.classList.contains('accept-button')) {
        showMessage('Demande d\'ami acceptée (logique à implémenter) !', 'success');
        event.target.closest('.notification-item, .user-card').remove(); // Supprime l'élément
        // Appelez votre API pour accepter la demande
    }
    if (event.target.classList.contains('secondary-button') && event.target.textContent.includes('Refuser')) {
        showMessage('Demande d\'ami refusée (logique à implémenter) !', 'info');
        event.target.closest('.notification-item, .user-card').remove(); // Supprime l'élément
        // Appelez votre API pour refuser la demande
    }
});


// --- GESTION DES COMMENTAIRES ---

/**
 * Crée l'élément HTML pour un seul commentaire.
 * @param {object} comment - L'objet commentaire.
 * @returns {HTMLElement} L'élément div représentant le commentaire.
 */
function createCommentElement(comment) {
    const commentDiv = document.createElement('div');
    commentDiv.classList.add('comment-item');
    // Assurez-vous que comment.username existe ou utilisez une valeur par défaut
    const commentAuthorName = comment.username || 'Utilisateur';

    commentDiv.innerHTML = `
        <span class="comment-username">${commentAuthorName}</span>:
        <span class="comment-content">${comment.content}</span>
        <span class="comment-timestamp">${timeAgo(comment.timestamp)}</span>
    `;
    return commentDiv;
}

/**
 * Charge et affiche les commentaires pour un post donné.
 * @param {string} postId - L'ID de la publication.
 */
async function loadCommentsForPost(postId) {
    const commentsList = document.querySelector(`.comments-section[data-post-id="${postId}"] .comments-list`);
    if (!commentsList) return;

    commentsList.innerHTML = '<p class="loading-message">Chargement des commentaires...</p>';

    const authToken = getAuthToken();
    if (!authToken) {
        commentsList.innerHTML = '<p class="error-message">Connectez-vous pour voir les commentaires.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec du chargement des commentaires.');
        }

        const comments = await response.json();
        commentsList.innerHTML = ''; // Nettoie le message de chargement

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">Aucun commentaire pour le moment.</p>';
        } else {
            comments.forEach(comment => {
                commentsList.appendChild(createCommentElement(comment));
            });
        }
        console.log(`Commentaires chargés pour le post ${postId}.`);

    } catch (error) {
        console.error('Erreur lors du chargement des commentaires:', error);
        commentsList.innerHTML = `<p class="error-message">Erreur: ${error.message}</p>`;
        showMessage(`Erreur lors du chargement des commentaires: ${error.message}`, 'error');
    }
}

/**
 * Ajoute un nouveau commentaire à une publication.
 * @param {string} postId - L'ID de la publication.
 * @param {string} content - Le contenu du commentaire.
 */
async function addCommentToPost(postId, content) {
    const commentInput = document.querySelector(`.comments-section[data-post-id="${postId}"] .comment-input`);
    const commentsCountSpan = document.querySelector(`.comment-button[data-post-id="${postId}"] .comments-count`);

    if (!content.trim()) {
        showMessage('Le commentaire ne peut pas être vide.', 'error');
        return;
    }

    const authToken = getAuthToken();
    if (!authToken) {
        showMessage('Vous devez être connecté pour commenter.', 'info');
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec de l\'ajout du commentaire.');
        }

        const result = await response.json();
        const commentsList = document.querySelector(`.comments-section[data-post-id="${postId}"] .comments-list`);
        // Supprime le message "Aucun commentaire" si c'est le premier
        if (commentsList.querySelector('.no-comments')) {
            commentsList.innerHTML = '';
        }
        commentsList.appendChild(createCommentElement(result.comment));
        commentInput.value = ''; // Vide le champ de saisie

        if (commentsCountSpan) {
            let currentCount = parseInt(commentsCountSpan.textContent);
            commentsCountSpan.textContent = currentCount + 1;
        }

        showMessage('Commentaire ajouté !', 'success');
        console.log(`Commentaire ajouté au post ${postId}.`);

    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        showMessage(`Erreur lors de l'ajout du commentaire: ${error.message}`, 'error');
    }
}

// --- GESTION DU PARTAGE ---

/**
 * Partage une publication via l'API Web Share ou copie le lien.
 * @param {string} postId - L'ID de la publication.
 * @param {string} postContent - Le contenu textuel du post.
 */
async function sharePost(postId, postContent) {
    const currentShareUrl = `${window.location.origin}/fil.html#feed`; // Partage l'URL actuelle du fil avec ancre vers le feed

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Publication Ayoma',
                text: postContent.substring(0, 150) + (postContent.length > 150 ? '...' : ''),
                url: currentShareUrl
            });
            showMessage('Publication partagée avec succès !', 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Partage annulé.');
            } else {
                console.error('Erreur de partage:', error);
                showMessage(`Erreur de partage: ${error.message}`, 'error');
            }
        }
    } else {
        // Fallback pour les navigateurs ne supportant pas l'API de partage
        try {
            // Utilise document.execCommand pour une meilleure compatibilité dans les iframes
            const textarea = document.createElement('textarea');
            textarea.value = currentShareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showMessage('Lien du fil d\'actualité copié !', 'info');
        } catch (err) {
            console.error('Échec de la copie du lien:', err);
            showMessage('Votre navigateur ne supporte pas le partage. Copiez le lien manuellement: ' + currentShareUrl, 'info');
        }
    }
}

// --- GESTION DU SUIVI ---

/**
 * Gère l'action de suivre/ne plus suivre un utilisateur.
 * @param {string} targetUserId - L'ID de l'utilisateur à suivre/ne plus suivre.
 * @param {HTMLElement} button - Le bouton "Suivre/Suivi(e)".
 */
async function toggleFollowUser(targetUserId, button) {
    const authToken = getAuthToken();
    let currentUser = getCurrentUser(); // Récupère la dernière version
    if (!authToken || !currentUser) {
        showMessage('Veuillez vous connecter pour suivre des utilisateurs.', 'info');
        return;
    }

    if (currentUser.id === targetUserId) {
        showMessage('Vous ne pouvez pas vous suivre vous-même.', 'info');
        return;
    }

    try {
        const response = await fetch(`/api/users/${targetUserId}/follow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Échec de l\'opération de suivi.');
        }

        const result = await response.json();
        if (result.action === 'followed') {
            button.textContent = 'Suivi(e)';
            button.classList.add('followed');
            currentUser.following.push(targetUserId); // Met à jour localement
            showMessage(`Vous suivez désormais ${button.closest('.post-info, .user-card').querySelector('.username, .post-author').textContent}.`, 'success');
        } else {
            button.textContent = 'Suivre';
            button.classList.remove('followed');
            currentUser.following = currentUser.following.filter(id => id !== targetUserId); // Met à jour localement
            showMessage(`Vous ne suivez plus ${button.closest('.post-info, .user-card').querySelector('.username, .post-author').textContent}.`, 'info');
        }
        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Sauvegarde la mise à jour locale
        // Si la section "Amis" est visible, la recharger pourrait être pertinent ici.
        if (document.getElementById('friends').classList.contains('active')) {
            loadMyFollowingList();
            loadSuggestedUsers('full');
        }
    } catch (error) {
        console.error('Erreur follow/unfollow:', error);
        showMessage(`Erreur: ${error.message}`, 'error');
    }
}


// --- GESTION DES ÉVÉNEMENTS DOM AU CHARGEMENT DE LA PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    // Aucune redirection ici, c'est géré par le script intégré du HTML au chargement.

    // --- GESTION DU FORMULAIRE DE PUBLICATION ---
    const postForm = document.getElementById('post-form');
    const mediaFileInput = document.getElementById('media-file');
    const mediaPreview = document.getElementById('media-preview');
    const selectedMediaName = document.getElementById('selected-media-name');

    // Prévisualisation du média lors de la sélection
    if (mediaFileInput && mediaPreview && selectedMediaName) {
        mediaFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                selectedMediaName.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Supprime l'ancien élément preview et recrée le bon type (img ou video)
                    const oldPreview = document.getElementById('media-preview');
                    if (oldPreview) oldPreview.remove();

                    let newPreviewElement;
                    if (file.type.startsWith('video/')) {
                        newPreviewElement = document.createElement('video');
                        newPreviewElement.setAttribute('controls', '');
                        newPreviewElement.setAttribute('autoplay', ''); // Optionnel: lecture auto
                        newPreviewElement.setAttribute('loop', ''); // Optionnel: lecture en boucle
                    } else {
                        newPreviewElement = document.createElement('img');
                    }
                    newPreviewElement.id = 'media-preview';
                    newPreviewElement.classList.add('media-preview');
                    newPreviewElement.src = e.target.result;
                    newPreviewElement.alt = "Aperçu média";
                    newPreviewElement.classList.remove('hidden');

                    const mediaUploadDiv = mediaFileInput.closest('.media-upload');
                    if (mediaUploadDiv) {
                        // Insère le nouvel élément avant le span du nom de fichier
                        mediaUploadDiv.insertBefore(newPreviewElement, selectedMediaName);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                selectedMediaName.textContent = 'Aucun fichier sélectionné';
                const currentMediaPreview = document.getElementById('media-preview');
                if (currentMediaPreview) currentMediaPreview.classList.add('hidden'); // Cache l'image/vidéo
            }
        });
    }

    // Gestion de la soumission de post
    if (postForm) {
        postForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const content = document.getElementById('post-content').value;
            const mediaFile = document.getElementById('media-file').files[0];

            if (!content.trim() && !mediaFile) {
                showMessage('Veuillez écrire quelque chose ou ajouter un média.', 'info');
                return;
            }

            const formData = new FormData();
            formData.append('content', content);
            if (mediaFile) {
                formData.append('media', mediaFile);
            }

            const authToken = getAuthToken();
            if (!authToken) {
                showMessage('Vous devez être connecté pour publier.', 'info');
                return;
            }

            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData // FormData est automatiquement géré pour multipart/form-data
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Échec de la création du post.');
                }

                const result = await response.json();
                showMessage('Post créé avec succès !', 'success');
                document.getElementById('post-content').value = '';
                if (mediaFileInput) mediaFileInput.value = ''; // Réinitialiser le champ de fichier
                if (mediaPreview) {
                    // Cacher l'aperçu existant
                    mediaPreview.classList.add('hidden');
                    // Optionnel: Réinitialiser src ou remplacer l'élément
                    const currentMediaPreview = document.getElementById('media-preview');
                    if (currentMediaPreview) {
                        currentMediaPreview.outerHTML = `<img id="media-preview" src="" alt="Aperçu média" class="media-preview hidden">`;
                    }
                }
                if (selectedMediaName) selectedMediaName.textContent = 'Aucun fichier sélectionné';

                loadFeedPosts(); // Recharge le fil d'actualité pour afficher le nouveau post
                loadUserProfileData('main'); // Met à jour le compteur de posts dans la section profil
                loadUserProfileData('sidebar-right'); // Met à jour le compteur de posts dans la sidebar du feed
            } catch (error) {
                console.error('Erreur lors de la création du post:', error);
                showMessage(`Erreur: ${error.message}`, 'error');
            }
        });
    }

    // --- GESTION DU FORMULAIRE D'ÉDITION DE PROFIL (dans la section Paramètres) ---
    const generalSettingsForm = document.getElementById('general-settings-form');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username-setting').value;
            const bio = document.getElementById('bio-setting').value;
            // Pour l'instant, pas de gestion de photo de profil ici, c'est dans edit-profile.html si séparé.

            const payload = { username, bio };
            const authToken = getAuthToken();
            if (!authToken) {
                showMessage('Vous devez être connecté pour mettre à jour votre profil.', 'info');
                return;
            }

            try {
                const response = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Échec de la mise à jour du profil.');
                }

                const result = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(result.user)); // Met à jour le currentUser
                showMessage('Paramètres du profil mis à jour avec succès !', 'success');
                // Recharger les données partout où elles sont affichées
                loadUserProfileData('main');
                loadUserProfileData('sidebar-right');

            } catch (error) {
                console.error('Erreur lors de la mise à jour des paramètres du profil:', error);
                showMessage(`Erreur: ${error.message}`, 'error');
            }
        });
    }

    // --- GESTION DU BOUTON "Éditer le profil" ---
    // Les deux boutons d'édition pointent vers la page edit-profile.html
    const editProfileBtnSidebar = document.getElementById('edit-profile-btn-sidebar');
    const editProfileBtnMain = document.getElementById('edit-profile-btn-main');

    const handleEditProfileClick = () => {
        window.location.href = '/edit-profile.html';
    };

    if (editProfileBtnSidebar) {
        editProfileBtnSidebar.addEventListener('click', handleEditProfileClick);
    }
    if (editProfileBtnMain) {
        editProfileBtnMain.addEventListener('click', handleEditProfileClick);
    }
});


/**
 * Popule le formulaire d'édition de profil (pour edit-profile.html séparé).
 * Note: Cette fonction est prévue pour être appelée si edit-profile.html est une page distincte.
 * Si vous intégrez tout dans fil.html, cette fonction sera réutilisée ou sa logique déplacée.
 */
async function populateEditProfileForm() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        showMessage('Veuillez vous connecter pour éditer votre profil.', 'error');
        window.location.href = '/connexion.html'; // Redirige si pas connecté
        return;
    }

    const editUsernameInput = document.getElementById('edit-username');
    const editBioInput = document.getElementById('edit-bio');
    const editProfilePicPreview = document.getElementById('edit-profile-pic-preview'); // Pour prévisualisation photo

    if (editUsernameInput) editUsernameInput.value = currentUser.username || '';
    if (editBioInput) editBioInput.value = currentUser.bio || '';
    if (editProfilePicPreview) editProfilePicPreview.src = currentUser.profilePic || '/img/profile.jpg';

    // Ajoute un écouteur pour la soumission du formulaire d'édition (si cette logique n'est pas déjà ailleurs)
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const bio = document.getElementById('edit-bio').value;
            const profilePicFile = document.getElementById('edit-profile-pic').files[0];

            const formData = new FormData();
            formData.append('bio', bio);
            // formData.append('username', document.getElementById('edit-username').value); // Si le nom d'utilisateur est éditable
            if (profilePicFile) {
                formData.append('profilePic', profilePicFile);
            }

            const authToken = getAuthToken();
            if (!authToken) {
                showMessage('Vous devez être connecté pour mettre à jour votre profil.', 'info');
                return;
            }

            try {
                const response = await fetch('/api/users/me', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Échec de la mise à jour du profil.');
                }

                const result = await response.json();
                localStorage.setItem('currentUser', JSON.stringify(result.user));
                showMessage('Profil mis à jour avec succès !', 'success');
                // Rediriger ou rafraîchir la page (retour à fil.html#profile)
                window.location.href = '/fil.html#profile';
            } catch (error) {
                console.error('Erreur lors de la mise à jour du profil:', error);
                showMessage(`Erreur: ${error.message}`, 'error');
            }
        });
    }
}
