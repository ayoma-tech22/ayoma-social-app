// Exemple pour l'inscription (fichier public/js/inscription.js ou dans script.js)

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form'); // Assurez-vous d'avoir cet ID sur votre formulaire d'inscription
    const messageDiv = document.getElementById('message'); // Pour afficher les messages (succès/erreur)

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Empêche le rechargement de la page

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // C'EST LA LIGNE CRUCIALE
                    },
                    body: JSON.stringify({ username, email, password }), // C'EST LE CORPS DE LA REQUÊTE EN JSON
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = data.message;
                    // Redirection après succès, par exemple vers la page de connexion
                    setTimeout(() => {
                        window.location.href = '// Exemple pour l'inscription (fichier public/js/inscription.js ou dans script.js)

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form'); // Assurez-vous d'avoir cet ID sur votre formulaire d'inscription
    const messageDiv = document.getElementById('message'); // Pour afficher les messages (succès/erreur)

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Empêche le rechargement de la page

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // C'EST LA LIGNE CRUCIALE
                    },
                    body: JSON.stringify({ username, email, password }), // C'EST LE CORPS DE LA REQUÊTE EN JSON
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = data.message;
                    // Redirection après succès, par exemple vers la page de connexion
                    setTimeout(() => {
                        window.location.href = '/connexion.html';
                    }, 2000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.message || 'Erreur lors de l\'inscription.';
                }
            } catch (error) {
                console.error('Erreur réseau ou du serveur:', error);
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Erreur: Impossible de se connecter au serveur.';
            }
        });
    }

    // --- Répétez un schéma similaire pour le formulaire de connexion si il est sur une autre page ---
    const loginForm = document.getElementById('login-form'); // Assurez-vous d'avoir cet ID sur votre formulaire de connexion

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const identifier = document.getElementById('identifier').value; // Ou 'username' ou 'email' selon votre HTML
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // C'EST LA LIGNE CRUCIALE
                    },
                    body: JSON.stringify({ identifier, password }), // C'EST LE CORPS DE LA REQUÊTE EN JSON
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = data.message;
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('email', data.email);
                    localStorage.setItem('profilePic', data.profilePic || '/img/profile.jpg');
                    
                    setTimeout(() => {
                        window.location.href = 'https://ayoma-social-app.vercel.app/fil.html'; // Redirige vers le fil d'actualité
                    }, 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.message || 'Erreur lors de la connexion.';
                }
            } catch (error) {
                console.error('Erreur réseau ou du serveur:', error);
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Erreur: Impossible de se connecter au serveur.';
            }
        });
    }
});
/connexion.html';
                    }, 2000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.message || 'Erreur lors de l\'inscription.';
                }
            } catch (error) {
                console.error('Erreur réseau ou du serveur:', error);
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Erreur: Impossible de se connecter au serveur.';
            }
        });
    }

    // --- Répétez un schéma similaire pour le formulaire de connexion si il est sur une autre page ---
    const loginForm = document.getElementById('login-form'); // Assurez-vous d'avoir cet ID sur votre formulaire de connexion

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const identifier = document.getElementById('identifier').value; // Ou 'username' ou 'email' selon votre HTML
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // C'EST LA LIGNE CRUCIALE
                    },
                    body: JSON.stringify({ identifier, password }), // C'EST LE CORPS DE LA REQUÊTE EN JSON
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = data.message;
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('email', data.email);
                    localStorage.setItem('profilePic', data.profilePic || '/img/profile.jpg');
                    
                    setTimeout(() => {
                        window.location.href = 'https://ayoma-social-app.vercel.app/fil.html'; // Redirige vers le fil d'actualité
                    }, 1000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.message || 'Erreur lors de la connexion.';
                }
            } catch (error) {
                console.error('Erreur réseau ou du serveur:', error);
                messageDiv.className = 'message error';
                messageDiv.textContent = 'Erreur: Impossible de se connecter au serveur.';
            }
        });
    }
});


