// ==UserScript==
// @name         ReviewRemember
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Outils pour les avis Amazon
// @author       Ashemka et MegaMan
// @match        https://www.amazon.fr/review/create-review*
// @match        https://www.amazon.fr/reviews/edit-review*
// @match        https://www.amazon.fr/vine/vine-reviews*
// @match        https://www.amazon.fr/vine/account
// @match        https://www.amazon.fr/gp/profile/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.fr
// @updateURL    https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @downloadURL  https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    //Export des avis
    function exportReviewsToCSV() {
        let csvContent = "\uFEFF"; // BOM pour UTF-8

        // Ajouter l'en-tête du CSV
        csvContent += "ASIN;Titre de l'avis;Contenu de l'avis\n";

        // Itérer sur les éléments de localStorage
        Object.keys(localStorage).forEach(function(key) {
            if (key.startsWith('review_')) {
                const reviewData = JSON.parse(localStorage.getItem(key));
                const asin = key.replace('review_', ''); // Extraire l'ASIN
                const title = reviewData.title.replace(/;/g, ','); // Remplacer les ";" par des ","
                const review = reviewData.review.replace(/\n/g, '\\n');

                // Ajouter la ligne au contenu CSV
                csvContent += `${asin};${title};${review}\n`;
            }
        });

        // Créer un objet Blob avec le contenu CSV en spécifiant le type MIME
        var blob = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
        var url = URL.createObjectURL(blob);

        // Créer un lien pour télécharger le fichier
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "RR_backup.csv");
        document.body.appendChild(link); // Nécessaire pour certains navigateurs

        // Simuler un clic sur le lien pour déclencher le téléchargement
        link.click();

        // Nettoyer en supprimant le lien et en libérant l'objet URL
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    //Import d'un fichier CSV
    // Fonction pour créer et gérer l'input de fichier
    function triggerFileInput() {
        // Créer le bouton qui va réellement ouvrir le dialogue de fichier
        const fileInputButton = document.createElement('button');
        fileInputButton.textContent = 'Importer les avis depuis un CSV';
        fileInputButton.style.position = 'fixed'; // Ou 'absolute' si nécessaire
        fileInputButton.style.left = '50%';
        fileInputButton.style.top = '50%';
        fileInputButton.style.transform = 'translate(-50%, -50%)';
        fileInputButton.style.zIndex = '1000';
        fileInputButton.style.backgroundColor = reviewColor;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                readAndImportCSV(file);
                document.body.removeChild(fileInputButton); // Enlever le bouton après sélection
                document.body.removeChild(fileInput);
            }
        };

        document.body.appendChild(fileInputButton);
        document.body.appendChild(fileInput);

        fileInputButton.onclick = () => fileInput.click(); // Déclencheur de l'input
        alert("Pour importer, merci de cliquer sur le bouton apparu au milieu de la page");
    }


    function readAndImportCSV(file) {
        const reader = new FileReader();

        reader.onload = function(event) {
            const csv = event.target.result;
            const lines = csv.split('\n');

            for (let i = 1; i < lines.length; i++) {
                if (lines[i]) {
                    const columns = lines[i].split(';');
                    if (columns.length >= 3) {
                        const asin = columns[0].trim();
                        const title = columns[1].trim();
                        const review = columns[2].trim().replace(/\\n/g, '\n'); // Remplacer \\n par de vrais retours à la ligne

                        localStorage.setItem(`review_${asin}`, JSON.stringify({title, review}));
                    }
                }
            }

            alert('Importation terminée.');
        };

        reader.readAsText(file, 'UTF-8');
    }

    //Trie des avis sur profil
    function marquerCarteCommeTraitee(carte) {
        carte.dataset.traitee = 'true';
    }

    // Fonction pour classer les cartes traitées par ordre décroissant de leur valeur
    function classerCartesTraitees() {
        // Sélectionne uniquement les cartes marquées comme traitées
        const cartesTraitees = Array.from(document.querySelectorAll('.your-content-card-wrapper.your-content-card-desktop[data-traitee="true"]'));

        // Trie les cartes en fonction de leur valeur numérique de manière croissante
        cartesTraitees.sort((a, b) => extraireValeur(a) - extraireValeur(b));

        // Réorganise les cartes dans leur conteneur parent selon le nouvel ordre croissant
        cartesTraitees.forEach(carte => {
            document.querySelector('.your-content-tab-container').prepend(carte);
        });
    }

    // Extrait la valeur numérique d'une carte, retourne 0 si non applicable
    function extraireValeur(carte) {
        const valeurElement = carte.querySelector('.a-size-base.a-color-primary.a-text-bold');
        return valeurElement ? parseInt(valeurElement.innerText.trim(), 10) : 0;
    }

    // Fonction principale de réorganisation des cartes
    function reorganiserCartes() {
        // Sélectionne uniquement les cartes pas encore traitées
        const cartes = Array.from(document.querySelectorAll('.your-content-card-wrapper.your-content-card-desktop:not([data-traitee="true"])'));

        // Filtre les cartes avec une valeur numérique strictement supérieure à 0
        const cartesAvecValeur = cartes.filter(carte => extraireValeur(carte) > 0);

        if (cartesAvecValeur.length > 0) {
            // Trie les cartes en fonction de leur valeur numérique de manière décroissante
            cartesAvecValeur.sort((a, b) => extraireValeur(b) - extraireValeur(a));

            // Préfixe les cartes triées au début de leur conteneur parent
            cartesAvecValeur.forEach(carte => {
                marquerCarteCommeTraitee(carte);
                carte.style.backgroundColor = reviewColor; // Optionnel: mise en évidence des cartes
                document.querySelector('.your-content-tab-container').prepend(carte);
            });
            classerCartesTraitees();
        }

    }

    function changeProfil() {
        // Configuration de l'observer pour réagir aux modifications du DOM
        const observer = new MutationObserver((mutations) => {
            let mutationsAvecAjouts = mutations.some(mutation => mutation.addedNodes.length > 0);

            if (mutationsAvecAjouts) {
                reorganiserCartes();
            }
        });

        // Observe le document pour les changements
        observer.observe(document.body, { childList: true, subtree: true });

        // Exécution initiale au cas où des cartes seraient déjà présentes
        reorganiserCartes();
        //Fin tri profil
    }

    function setHighlightColor() {
        // Demander à l'utilisateur de choisir une couleur
        const userInput = prompt("Veuillez saisir la couleur de surbrillance, soit par son nom, soit par sa valeur hexadécimale (exemple : Jaune (#FFFF00), Bleu (#0096FF), Rouge (#FF0000), Vert (#96FF96), etc..)", "").toLowerCase();

        // Correspondance des noms de couleurs à leurs codes hexadécimaux
        const colorMap = {
            jaune: "#FFFF00",
            bleu: "#0096FF",
            rouge: "#FF0000",
            vert: "#96FF96",
            orange: "#FF9600",
            violet: "#9600FF",
            rose: "#FF00FF"
        };

        // Vérifier si l'entrée de l'utilisateur correspond à une couleur prédéfinie
        const userColor = colorMap[userInput] || userInput;

        // Vérifier si la couleur est une couleur hexadécimale valide (avec ou sans #)
        const isValidHex = /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/.test(userColor);

        if (isValidHex) {
            // Supprimer le '#' si présent et normaliser la saisie en format 6 caractères
            let normalizedHex = userColor.replace('#', '');
            if (normalizedHex.length === 3) {
                normalizedHex = normalizedHex.split('').map(char => char + char).join('');
            }
            // Stocker la couleur convertie
            localStorage.setItem('reviewColor', userColor);
            alert("La couleur de surbrillance a été mise à jour à " + userInput);
        } else {
            // Utiliser couleur de fallback si saisie invalide
            localStorage.setItem('reviewColor', '#FFFF00');
            alert("La saisie n'est pas une couleur valide. La couleur de surbrillance a été réinitialisée à Jaune.");
        }
    }


    const asin = new URLSearchParams(window.location.search).get('asin');

    // Définition des styles pour les boutons
    const styles = `
        .custom-button {
            padding: 0 10px 0 11px;
            font-size: 13px;
            line-height: 29px;
            vertical-align: middle;
            cursor: pointer;
        }
        .custom-button-container {
            margin-right: 10px; /* Ajoute un espace après les boutons et avant le bouton 'Envoyer' */
        }
        .template-button {
            background-color: #FFA500; /* Couleur orange pour les boutons liés au modèle */
            border-color: #FFA500;
        }
        .template-button:hover {
            background-color: #cc8400;
        }
    `;

    // Crée une balise de style et ajoute les styles définis ci-dessus
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Fonction pour obtenir l'ASIN du produit à partir de l'URL
    function getASIN() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('asin');
    }

    // Fonction pour ajouter les boutons à la page
    function addButtons() {
        const submitButtonArea = document.querySelector('.ryp__submit-button-card__card-frame');
        if (submitButtonArea) {
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.alignItems = 'center';
            buttonsContainer.className = 'custom-button-container';

            addButton('Sauvegarder un modèle', saveTemplate, buttonsContainer, 'template-button');

            // Vérifie si un modèle d'avis générique a été sauvegardé avant d'ajouter le bouton d'utilisation
            if (localStorage.getItem('review_template')) {
                addButton('Utiliser le modèle', useTemplate, buttonsContainer, 'template-button');
            }

            addButton('Sauvegarder', saveReview, buttonsContainer);

            // Vérifie si un avis a été sauvegardé pour cet ASIN avant d'ajouter le bouton de restauration
            if (localStorage.getItem(`review_${asin}`)) {
                addButton('Restaurer', restoreReview, buttonsContainer);
            }

            submitButtonArea.prepend(buttonsContainer);
        }
    }

    // Ajoute un seul bouton au conteneur spécifié avec une classe optionnelle pour le style
    function addButton(text, onClickFunction, container, className = '') {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'a-button a-button-normal a-button-primary custom-button ' + className;
        button.addEventListener('click', function() {
            onClickFunction.call(this); // Utilise call pour définir 'this' dans saveReview
        });
        container.appendChild(button);
    }

    // Fonction pour sauvegarder l'avis
    function saveReview() {
        const title = document.getElementById('scarface-review-title-label').value;
        const review = document.querySelector('textarea#scarface-review-text-card-title').value;
        const asin = getASIN();
        localStorage.setItem(`review_${asin}`, JSON.stringify({title, review}));

        // Récupère le bouton de sauvegarde
        const saveButton = this; // 'this' fait référence au bouton qui a déclenché l'événement
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Enregistré !';
        //saveButton.disabled = true; // Désactive le bouton pour éviter les doubles clics
        //saveButton.style.backgroundColor = '#FCD200'; // Gris

        // Réinitialise le bouton après 3 secondes
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.disabled = false; // Réactive le bouton
            saveButton.style.backgroundColor = ''; // Réinitialise le style (ou mettez ici la couleur d'origine si nécessaire)
            reloadButtons(); // Optionnel : actualise les boutons si nécessaire
        }, 2000);
    }

    // Fonction pour recharger les boutons
    function reloadButtons() {
        // Supprime les boutons existants
        document.querySelectorAll('.custom-button-container').forEach(container => container.remove());
        // Ajoute les boutons à nouveau
        addButtons();
    }

    // Fonction pour restaurer un avis
    function restoreReview() {
        const asin = getASIN();
        const savedReview = JSON.parse(localStorage.getItem(`review_${asin}`));
        if (savedReview) {
            document.getElementById('scarface-review-title-label').value = savedReview.title;
            document.querySelector('textarea#scarface-review-text-card-title').value = savedReview.review;
            //alert('Avis restauré !');
        } else {
            alert('Aucun avis sauvegardé pour ce produit.');
        }
    }

    // Fonction pour sauvegarder un modèle d'avis générique
    function saveTemplate() {
        // Demande confirmation avant de sauvegarder
        if (confirm("Voulez-vous sauvegarder ce modèle d'avis ?")) {
            const title = document.getElementById('scarface-review-title-label').value;
            const review = document.querySelector('textarea#scarface-review-text-card-title').value;
            localStorage.setItem(`review_template`, JSON.stringify({title, review}));

            // Récupère le bouton de sauvegarde
            const saveButton = this; // 'this' fait référence au bouton qui a déclenché l'événement
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Enregistré !';

            // Réinitialise le bouton après 3 secondes
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.disabled = false; // Réactive le bouton
                saveButton.style.backgroundColor = ''; // Réinitialise le style (ou mettez ici la couleur d'origine si nécessaire)
                reloadButtons(); // Optionnel : actualise les boutons si nécessaire
            }, 2000);
        } else {
            // L'utilisateur a choisi de ne pas sauvegarder le modèle
            console.log('La sauvegarde du modèle a été annulée.');
        }
    }

    // Fonction pour utiliser le modèle d'avis générique
    function useTemplate() {
        const savedTemplate = JSON.parse(localStorage.getItem(`review_template`));
        if (savedTemplate) {
            document.getElementById('scarface-review-title-label').value = savedTemplate.title;
            document.querySelector('textarea#scarface-review-text-card-title').value = savedTemplate.review;
        } else {
            alert('Aucun modèle d\'avis générique sauvegardé.');
        }
    }

    //Supprimer le modèle
    function deleteTemplate() {
        localStorage.removeItem('review_template');
    }

    //Supprimer les avis
    function deleteAllReviews() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('review_')) {
                localStorage.removeItem(key);
            }
        });
    }

    //Fonctions pour les couleurs des avis
    // Fonction pour changer la couleur de la barre en fonction du pourcentage
    function changeColor() {
        if (document.URL === "https://www.amazon.fr/vine/account") {
            var progressBar = document.querySelector('#vvp-perc-reviewed-metric-display .animated-progress span');
            var progressValue = parseFloat(progressBar.getAttribute('data-progress'));

            var color = '';
            var width = progressBar.style.width;
            if (progressValue < 60) {
                color = 'red';
            } else if (progressValue >= 60 && progressValue < 90) {
                color = 'orange';
            } else {
                color = '#32cd32';
            }

            progressBar.style.backgroundColor = color;
            progressBar.style.width = width;
        }
    }

    // Fonction pour formater une date en format 'DD/MM/YYYY'
    function formatDate(date) {
        var day = date.getDate().toString().padStart(2, '0');
        var month = (1 + date.getMonth()).toString().padStart(2, '0');
        var year = date.getFullYear();

        return day + '/' + month + '/' + year;
    }

    // Fonction pour calculer la différence en jours entre deux dates
    function dateDiffInDays(date1, date2) {
        const diffInTime = date2.getTime() - date1.getTime();
        return Math.floor(diffInTime / (1000 * 3600 * 24));
    }

    //Style pour "Pas encore examiné"
    var styleReview = document.createElement('style');
    styleReview.textContent = `
        .pending-review-blue {
    font-weight: bold;
    color: #0000FF !important;
}
        .pending-review-green {
    font-weight: bold;
    color: #008000 !important;
}
        .pending-review-orange {
    font-weight: bold;
    color: #FFA500 !important;
}
        .pending-review-red {
    font-weight: bold;
    color: #FF0000 !important;
}
    `;
    document.head.appendChild(styleReview);
    // Fonction pour mettre en surbrillance les dates en fonction de leur âge
    function highlightDates() {
        if (window.location.href.includes('review-type=completed') || window.location.href.includes('orders')) {
            return; // Ne rien faire si l'URL contient "review-type=completed" ou "orders"
        }

        var tdElements = document.querySelectorAll('.vvp-reviews-table--text-col');
        var currentDate = new Date();

        tdElements.forEach(function(td, index, array) {
            var timestamp = parseInt(td.getAttribute('data-order-timestamp'));
            if (td.hasAttribute('data-order-timestamp')) {
                var nextTd = array[index + 1];
                // Vérifier si le timestamp est en millisecondes et le convertir en secondes si nécessaire
                if (timestamp > 1000000000000) {
                    timestamp /= 1000; // Conversion en secondes
                }

                var date = new Date(timestamp * 1000); // Convertir le timestamp en millisecondes avant de créer l'objet Date

                var daysDifference = dateDiffInDays(date, currentDate);

                var formattedDate = formatDate(date);

                //var style = '';
                //var color = '';
                if (daysDifference < 7) {
                    //color = '#0000FF'; // bleu
                    nextTd.classList.add('pending-review-blue');
                } else if (daysDifference >= 7 && daysDifference < 14) {
                    //color = '#008000'; // vert
                    nextTd.classList.add('pending-review-green');
                } else if (daysDifference >= 14 && daysDifference < 30) {
                    //color = '#FFA500'; // orange
                    nextTd.classList.add('pending-review-orange');
                } else {
                    //color = '#FF0000'; // rouge
                    nextTd.classList.add('pending-review-red');
                }

                // Ajouter la couleur et le style gras au texte de la date
                //style = 'font-weight: bold; color: ' + color + ';';
                //td.innerHTML = '<font style="' + style + '">' + formattedDate + '</font>';
            }
        });
    }

    // Fonction pour mettre en surbrillance le statut de la revue
    function highlightReviewStatus() {
        var enableReviewStatusFunction = localStorage.getItem('enableReviewStatusFunction');

        if (enableReviewStatusFunction === 'true') {
            var tdElements = document.querySelectorAll('td.vvp-reviews-table--text-col');

            tdElements.forEach(function(td) {
                var reviewStatus = td.innerText.trim();
                var style = '';

                switch (reviewStatus) {
                    case 'En attente d\'approbation':
                        style += 'font-weight: bold; color: #FFA500;'; // orange
                        break;
                    case 'Approuvé':
                        style += 'font-weight: bold; color: #008000;'; // vert
                        break;
                    case 'Non approuvé':
                        style += 'font-weight: bold; color: #FF0000;'; // rouge
                        break;
                    case 'Vous avez commenté cet article':
                        style += 'font-weight: bold; color: #0000FF;'; // bleu
                        break;
                    default:
                        style += 'color: inherit;'; // utiliser la couleur par défaut
                }

                // Appliquer le style au texte de la revue
                td.style = style;
            });
        }
    }

    // Fonction pour mettre en surbrillance le statut "Cet article n'est plus disponible"
    function highlightUnavailableStatus() {
        var divElements = document.querySelectorAll('div.vvp-subtitle-color');

        divElements.forEach(function(div) {
            var subtitle = div.innerText.trim();

            if (subtitle === "Cet article n'est plus disponible") {
                div.style.fontWeight = 'bold';
                div.style.color = '#FF0000'; // rouge
            }
        });
    }

    // Fonction pour masquer les lignes de tableau contenant le mot-clé "Approuvé" et afficher les autres lignes
    function masquerLignesApprouve() {
        var lignes = document.querySelectorAll('.vvp-reviews-table--row');
        lignes.forEach(function(ligne) {
            var cellulesStatut = ligne.querySelectorAll('.vvp-reviews-table--text-col');
            var contientApprouve = false;
            cellulesStatut.forEach(function(celluleStatut) {
                var texteStatut = celluleStatut.innerText.trim().toLowerCase();
                if (texteStatut.includes('approuvé') && texteStatut !== 'non approuvé') {
                    contientApprouve = true;
                }
            });
            if (contientApprouve) {
                ligne.style.display = 'none';
            } else {
                ligne.style.display = ''; // Afficher la ligne si elle ne contient pas "Approuvé"
            }
        });
    }

    // Fonction pour activer ou désactiver la fonction de date
    function toggleDateFunction() {
        var enableDateFunction = localStorage.getItem('enableDateFunction');

        if (enableDateFunction === 'true') {
            localStorage.setItem('enableDateFunction', 'false');
        } else {
            localStorage.setItem('enableDateFunction', 'true');
        }
        location.reload();
    }

    // Fonction pour activer ou désactiver la fonction de statuts des commentaires
    function toggleReviewStatusFunction() {
        var enableReviewStatusFunction = localStorage.getItem('enableReviewStatusFunction');

        if (enableReviewStatusFunction === 'true') {
            localStorage.setItem('enableReviewStatusFunction', 'false');
        } else {
            localStorage.setItem('enableReviewStatusFunction', 'true');
        }
        location.reload();
    }

    // Fonction pour activer ou désactiver la coloration de la barre de progression
    function toggleColorFunction() {
        var enableColorFunction = localStorage.getItem('enableColorFunction');

        if (enableColorFunction === 'true') {
            localStorage.setItem('enableColorFunction', 'false');
        } else {
            localStorage.setItem('enableColorFunction', 'true');
        }
        location.reload();
    }

    // Fonction pour activer ou désactiver le filtrage des avis approuvés
    function toggleFilter() {
        var filterEnabled = localStorage.getItem('filterEnabled');
        if (filterEnabled === 'true') {
            localStorage.setItem('filterEnabled', 'false');
        } else {
            localStorage.setItem('filterEnabled', 'true');
        }
        location.reload();
    }

    //Fonction pour activer ou désactiver la gestion des profils amazon
    function toggleProfil() {
        var profilEnabled = localStorage.getItem('profilEnabled');
        if (profilEnabled === 'true') {
            localStorage.setItem('profilEnabled', 'false');
        } else {
            localStorage.setItem('profilEnabled', 'true');
        }
        location.reload();
    }

    //localStorage.removeItem('enableDateFunction');
    //localStorage.removeItem('enableReviewStatusFunction');
    //localStorage.removeItem('enableColorFunction');
    var enableDateFunction = localStorage.getItem('enableDateFunction');
    var enableReviewStatusFunction = localStorage.getItem('enableReviewStatusFunction');
    var enableColorFunction = localStorage.getItem('enableColorFunction');
    var reviewColor = localStorage.getItem('reviewColor');
    var filterEnabled = localStorage.getItem('filterEnabled');
    var profilEnabled = localStorage.getItem('profilEnabled');

    // Initialiser à true si la clé n'existe pas dans le stockage local
    if (enableDateFunction === null) {
        enableDateFunction = 'true';
        localStorage.setItem('enableDateFunction', enableDateFunction);
    }

    if (enableReviewStatusFunction === null) {
        enableReviewStatusFunction = 'true';
        localStorage.setItem('enableReviewStatusFunction', enableReviewStatusFunction);
    }

    if (enableColorFunction === null) {
        enableColorFunction = 'true';
        localStorage.setItem('enableColorFunction', enableColorFunction);
    }

    if (reviewColor === null) {
        reviewColor = '#FFFF00';
        localStorage.setItem('reviewColor', reviewColor);
    }

    if (filterEnabled === null) {
        filterEnabled = 'true';
        localStorage.setItem('filterEnabled', filterEnabled);
    }

    if (profilEnabled === null) {
        profilEnabled = 'true';
        localStorage.setItem('profilEnabled', profilEnabled);
    }

    if (enableDateFunction === 'true') {
        highlightDates();
        GM_registerMenuCommand("Désactiver le surlignage du statut des avis", toggleDateFunction);
    } else {
        GM_registerMenuCommand("Activer le surlignage du statut des avis", toggleDateFunction);
    }

    if (enableReviewStatusFunction === 'true') {
        highlightReviewStatus();
        GM_registerMenuCommand("Désactiver le surlignage des avis vérifiés", toggleReviewStatusFunction);
    } else {
        GM_registerMenuCommand("Activer le surlignage des avis vérifiés", toggleReviewStatusFunction);
    }

    if (enableColorFunction === 'true') {
        changeColor();
        GM_registerMenuCommand("Désactiver le changement de couleur de la barre de progression des avis", toggleColorFunction);
    } else {
        GM_registerMenuCommand("Activer le changement de couleur de la barre de progression des avis", toggleColorFunction);
    }

    if (filterEnabled === 'true') {
        masquerLignesApprouve();
        GM_registerMenuCommand("Ne pas cacher les avis approuvés", toggleFilter);
    } else {
        GM_registerMenuCommand("Cacher les avis approuvés", toggleFilter);
    }
    if (enableReviewStatusFunction === 'true' || enableDateFunction === 'true') {
        highlightUnavailableStatus();
    }
    //End
    //Ajout du menu
    if (profilEnabled === 'true') {
        changeProfil();
        GM_registerMenuCommand("Désactiver l'amélioration du profil Amazon (surbrillance, scroll infini, ...)", toggleProfil);
    } else {
        GM_registerMenuCommand("Activer l'amélioration du profil Amazon (surbrillance, scroll infini, ...)", toggleProfil);
    }
    GM_registerMenuCommand("Définir la couleur de surbrillance des avis sur la page de profil", function() {
        setHighlightColor();
    }, "s");

    // Ajout d'une commande pour Tampermonkey
    GM_registerMenuCommand("Exporter les avis en CSV", exportReviewsToCSV, "e");
    GM_registerMenuCommand("Importer les avis depuis un CSV", triggerFileInput, "i");
    GM_registerMenuCommand("Supprimer le modèle d'avis", function() {
        deleteTemplate();
        reloadButtons();
        alert("Modèle d'avis supprimé.");
    }, "m");

    GM_registerMenuCommand("Supprimer tous les avis", function() {
        deleteAllReviews();
        reloadButtons();
        alert("Tous les avis ont été supprimés.");
    }, "a");

    let buttonsAdded = false; // Suivre si les boutons ont été ajoutés

    function tryToAddButtons() {
        if (buttonsAdded) return; // Arrêtez si les boutons ont déjà été ajoutés

        const submitButtonArea = document.querySelector('.ryp__submit-button-card__card-frame');
        if (submitButtonArea) {
            addButtons();
            buttonsAdded = true; // Marquer que les boutons ont été ajoutés
            //Agrandir la zone pour le texte de l'avis
            const textarea = document.getElementById('scarface-review-text-card-title');
            if (textarea) {
                textarea.style.height = '300px'; // Définit la hauteur à 300px
            }
        } else {
            setTimeout(tryToAddButtons, 100); // Réessayer après un demi-seconde
        }
    }

    tryToAddButtons();

    //Suppression footer
    if (!window.location.href.startsWith("https://www.amazon.fr/gp/profile/") || profilEnabled === 'true') {
        var styleFooter = document.createElement('style');

        styleFooter.textContent = `
#rhf, #rhf-shoveler, .rhf-frame, #navFooter {
  display: none !important;
}
`
        document.head.appendChild(styleFooter);
    }

})();
