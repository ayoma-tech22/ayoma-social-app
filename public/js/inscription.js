document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('message');

    // Fonction pour afficher les messages
    const showMessage = (text, isSuccess) => {
        messageDiv.textContent = text;
        messageDiv.className = `message ${isSuccess ? 'success' : 'error'}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    };

    // Gestion de l'inscription
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !email || !password) {
                showMessage('Tous les champs sont obligatoires', false);
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage(data.message || 'Inscription réussie ! Redirection...', true);
                    
                    // Stockage des données utilisateur et redirection
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    setTimeout(() => {
                        window.location.href = '/connexion.html';
                    }, 2000);
                } else {
                    showMessage(data.message || 'Erreur lors de l\'inscription', false);
                }
            } catch (error) {
                console.error('Erreur:', error);
                showMessage('Erreur de connexion au serveur', false);
            }
        });
    }