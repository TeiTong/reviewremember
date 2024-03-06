// ==UserScript==
// @name         ReviewRemember
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Sauvegarde des avis Amazon
// @author       MegaMan
// @match        https://www.amazon.fr/review/create-review*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amazon.fr
// @updateURL    https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @downloadURL  https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @grant        GM_registerMenuCommand
// ==/UserScript==

window.onload = function() {
    'use strict';

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

    //Suppression footer
    var styleFooter = document.createElement('style');

    styleFooter.textContent = `
#rhf, #rhf-shoveler, .rhf-frame, #navFooter {
  display: none !important;
}
`
    document.head.appendChild(styleFooter);
};
