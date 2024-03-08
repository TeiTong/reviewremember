// ==UserScript==
// @name         ReviewRemember
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Outils pour les avis Amazon
// @author       Ashemka et MegaMan
// @match        https://www.amazon.fr/review/create-review*
// @match        https://www.amazon.fr/vine/vine-reviews*
// @match        https://www.amazon.fr/vine/account
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.fr
// @updateURL    https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @downloadURL  https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @grant        GM_registerMenuCommand
// ==/UserScript==

window.onload = function() {
    'use strict';

    const asin = new URLSearchParams(window.location.search).get('asin');

    //Suppression footer
    var styleFooter = document.createElement('style');

    styleFooter.textContent = `
#rhf, #rhf-shoveler, .rhf-frame, #navFooter {
  display: none !important;
}
`
    document.head.appendChild(styleFooter);
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
        const title = document.getElementById('scarface-review-title-label').value;
        const review = document.querySelector('textarea#scarface-review-text-card-title').value;
        localStorage.setItem(`review_template`, JSON.stringify({title, review}));

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
    addButtons();
    //Fonctions pour les couleurs des avis
    // Fonction pour changer la couleur de la barre en fonction du pourcentage
    function changeColor() {
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

    //localStorage.removeItem('enableDateFunction');
    //localStorage.removeItem('enableReviewStatusFunction');
    //localStorage.removeItem('enableColorFunction');
    var enableDateFunction = localStorage.getItem('enableDateFunction');
    var enableReviewStatusFunction = localStorage.getItem('enableReviewStatusFunction');
    var enableColorFunction = localStorage.getItem('enableColorFunction');

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
        GM_registerMenuCommand("Activer le changement de couleur de la barre de progression des aviss", toggleColorFunction);
    }
    //End
    //Ajout du menu
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

};
