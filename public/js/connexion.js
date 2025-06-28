// public/js/connexion.js

document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du formulaire et du div de message
    const loginForm = document.getElementById('loginForm');
    const identifierInput = document.getElementById('identifier'); // Input pour l'email ou le nom d'utilisateur
    const passwordInput = document.getElementById('password');
    const messageDiv = document.getElementById('message'); // Div pour afficher les messages d'erreur/succès

    // --- Vérification de l'état de connexion avant d'afficher le formulaire ---
    // Si un token d'authentification existe déjà, l'utilisateur est probablement déjà connecté.
    // Dans ce cas, on le redirige directement vers la page principale (/fil.html)
    const existingToken = localStorage.getItem('authToken');
    if (existingToken) {
        console.log("connexion.js: Token existant détecté. Redirection vers /fil.html.");
        window.location.href = '/fil.html';
        return; // Arrête l'exécution du script pour éviter de montrer le formulaire de connexion
    }

    // --- Gestion de la soumission du formulaire de connexion ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Empêche le rechargement par défaut de la page

            const identifier = identifierInput.value.trim(); // Récupère et nettoie l'identifiant
            const password = passwordInput.value.trim();     // Récupère et nettoie le mot de passe

            // Validation simple côté client : s'assurer que les champs ne sont pas vides
            if (!identifier || !password) {
                showMessage('Veuillez remplir tous les champs pour vous connecter.', 'error');
                return; // Arrête l'exécution si la validation échoue
            }

            // Désactive le bouton de soumission pour éviter les envois multiples
            const submitButton = loginForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Connexion...'; // Indique que la connexion est en cours
            }

            try {
                // Envoi des données d'authentification au serveur via une requête POST
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' // Indique que le corps de la requête est du JSON
                    },
                    body: JSON.stringify({ identifier, password }) // Convertit les données en chaîne JSON
                });

                const data = await response.json(); // Parse la réponse JSON du serveur

                if (response.ok) { // Si la réponse HTTP est dans la plage 2xx (succès)
                    // Stocke le token JWT reçu du serveur
                    localStorage.setItem('authToken', data.token);

                    // --- Communication clé avec script.js : Stockage des infos utilisateur ---
                    // Le serveur DOIT renvoyer un objet 'user' contenant les infos de l'utilisateur connecté
                    if (data.user) {
                        localStorage.setItem('currentUser', JSON.stringify(data.user));
                        console.log("connexion.js: Informations utilisateur stockées:", data.user.username);
                    } else {
                        console.warn("connexion.js: Le serveur n'a pas renvoyé d'informations 'user' lors de la connexion.");
                    }

                    showMessage('Connexion réussie ! Redirection...', 'success');

                    // --- Logique de redirection intelligente ---
                    // Tente de rediriger l'utilisateur vers la page d'où il venait (si sauvegardée)
                    const redirectTo = localStorage.getItem('redirectAfterLogin');
                    if (redirectTo) {
                        localStorage.removeItem('redirectAfterLogin'); // Supprime l'URL sauvegardée après utilisation
                        window.location.href = redirectTo; // Redirige vers l'URL sauvegardée
                    } else {
                        // Si aucune URL n'a été sauvegardée, redirige par défaut vers le fil d'actualité
                        window.location.href = '/fil.html';
                    }

                } else { // Si la réponse HTTP indique une erreur (ex: 401 Unauthorized)
                    // Affiche le message d'erreur renvoyé par le serveur ou un message générique
                    const errorMessage = data.message || 'Identifiants invalides ou erreur de connexion.';
                    showMessage(errorMessage, 'error');
                    console.error('Erreur de connexion du serveur:', data);
                }
            } catch (error) {
                // Gère les erreurs réseau ou les problèmes avant la réponse du serveur (ex: serveur injoignable)
                console.error('Erreur réseau ou problème côté client lors de la connexion:', error);
                showMessage('Impossible de se connecter au serveur. Veuillez vérifier votre connexion.', 'error');
            } finally {
                // Réactive le bouton de soumission quelle que soit l'issue
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Se connecter';
                }
            }
        });
    }

    /**
     * Affiche un message à l'utilisateur dans le messageDiv.
     * @param {string} message Le texte du message à afficher.
     * @param {'success'|'error'|'info'} type Le type de message pour le style CSS.
     */
    function showMessage(message, type = 'info') {
        if (!messageDiv) {
            console.error("showMessage: L'élément 'messageDiv' est introuvable. Impossible d'afficher le message.");
            return;
        }
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`; // Ajoute les classes CSS pour le style
        messageDiv.classList.remove('hidden'); // Rend le message visible (assumant une classe 'hidden' par défaut)

        // Cache le message automatiquement après 5 secondes
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }
});
