// ==UserScript==
// @name         ReviewRemember
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Outils pour les avis Amazon
// @author       Ashemka et MegaMan
// @match        https://www.amazon.fr/review/create-review*
// @match        https://www.amazon.fr/reviews/edit-review*
// @match        https://www.amazon.fr/vine/vine-reviews*
// @match        https://www.amazon.fr/vine/account
// @match        https://www.amazon.fr/gp/profile/*
// @match        https://www.amazon.fr/vine/orders*
// @match        https://www.amazon.fr/gp/profile/*
// @match        https://www.amazon.fr/vine/resources
// @icon         https://i.ibb.co/yhNnKdS/RR-ICO-2-1.png
// @updateURL    https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @downloadURL  https://raw.githubusercontent.com/teitong/reviewremember/main/ReviewRemember.user.js
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    var version = GM_info.script.version;

    //Correction du mot sur la page
    document.body.innerHTML = document.body.innerHTML.replace(/Vérifiées/g, 'Vérifiés');

    //On remplace l'image et son lien par notre menu
    function replaceImageUrl() {
        // Sélectionner le lien contenant l'image avec l'attribut alt "vine_logo_title"
        var link = document.querySelector('a > img[alt="vine_logo_title"]') ? document.querySelector('a > img[alt="vine_logo_title"]').parentNode : null;

        // Vérifier si le lien existe
        if (link) {
            // Sélectionner directement l'image à l'intérieur du lien
            var img = link.querySelector('img');
            // Remplacer l'URL de l'image
            img.src = 'https://i.ibb.co/Ph6Bw85/RR2.png';
            // Modifier le comportement du lien pour empêcher le chargement de la page
            link.onclick = function(event) {
                // Empêcher l'action par défaut du lien
                event.preventDefault();
                // Appeler la fonction createConfigPopup
                createConfigPopup();
            };
        }
    }

    replaceImageUrl();

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
        // Extraire les composantes r, g, b de la couleur actuelle
        const rgbaMatch = reviewColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+),\s*(\d*\.?\d+)\)$/);
        let hexColor = "#FFFF00"; // Fallback couleur jaune si la conversion échoue
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0');
            const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0');
            const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0');
            hexColor = `#${r}${g}${b}`;
        }

        // Vérifie si une popup existe déjà et la supprime si c'est le cas
        const existingPopup = document.getElementById('colorPickerPopup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Crée la fenêtre popup
        const popup = document.createElement('div');
        popup.id = "colorPickerPopup";
        popup.style.cssText = `
        position: fixed;
        z-index: 10001;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: white;
        border: 1px solid #ccc;
        box-shadow: 0px 0px 10px #ccc;
    `;
        popup.innerHTML = `
          <h2 id="configPopupHeader">Couleur de surbrillance des nouveaux produits<span id="closeColorPicker" style="float: right; cursor: pointer;">&times;</span></h2>
        <input type="color" id="colorPicker" value="${hexColor}" style="width: 100%;">
        <div class="button-container final-buttons">
            <button class="full-width" id="saveColor">Enregistrer</button>
            <button class="full-width" id="closeColor">Fermer</button>
        </div>
    `;

        document.body.appendChild(popup);

        // Ajoute des écouteurs d'événement pour les boutons
        document.getElementById('saveColor').addEventListener('click', function() {
            const selectedColor = document.getElementById('colorPicker').value;
            // Convertir la couleur hexadécimale en RGBA pour la transparence
            const r = parseInt(selectedColor.substr(1, 2), 16);
            const g = parseInt(selectedColor.substr(3, 2), 16);
            const b = parseInt(selectedColor.substr(5, 2), 16);
            const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

            // Stocker la couleur sélectionnée
            localStorage.setItem('reviewColor', rgbaColor);
            reviewColor = rgbaColor;
            popup.remove();
        });

        document.getElementById('closeColor').addEventListener('click', function() {
            popup.remove();
        });
        document.getElementById('closeColorPicker').addEventListener('click', function() {
            popup.remove();
        });
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

    //Suppression header
    function hideHeader() {
        var styleHeader = document.createElement('style');

        styleHeader.textContent = `
body {
  padding-right: 0px !important;
}

#navbar-main, #nav-main, #skiplink {
  display: none;
}

.amzn-ss-wrap {
  display: none !important;
}
`
        document.head.appendChild(styleHeader);
    }

    //Ajoute les pages en partie haute
    function addPage() {
        // Sélection du contenu HTML du div source
        const sourceElement = document.querySelector('.a-text-center');
        // Vérifier si l'élément source existe
        if (sourceElement) {
            // Maintenant que l'élément source a été mis à jour, copier son contenu HTML
            const sourceContent = sourceElement.outerHTML;
            const currentUrl = window.location.href;
            // Création d'un nouveau div pour le contenu copié
            const newDiv = document.createElement('div');
            newDiv.innerHTML = sourceContent;
            newDiv.style.textAlign = 'center'; // Centrer le contenu

            // Sélection du div cible où le contenu sera affiché
            //const targetDiv = document.querySelector('.vvp-tab-content .vvp-tab-content');
            var targetDiv = false;
            if (currentUrl.includes("vine-reviews")) {
                targetDiv = document.querySelector('.vvp-reviews-table--heading-top');
                targetDiv.parentNode.insertBefore(newDiv, targetDiv);
            } else if (currentUrl.includes("orders")) {
                targetDiv = document.querySelector('.vvp-tab-content .vvp-orders-table--heading-top');
                targetDiv.parentNode.insertBefore(newDiv, targetDiv);
            }

            // Trouver ou créer le conteneur de pagination si nécessaire
            let paginationContainer = sourceElement.querySelector('.a-pagination');
            if (!paginationContainer) {
                paginationContainer = document.createElement('ul');
                paginationContainer.className = 'a-pagination';
                sourceElement.appendChild(paginationContainer);
            }
            //Ajout du bouton "Aller à" en haut et en bas
            if (currentUrl.includes("orders") || currentUrl.includes("vine-reviews")) {
                // Création du bouton "Aller à la page X"
                const gotoButtonUp = document.createElement('li');
                gotoButtonUp.className = 'a-last'; // Utiliser la même classe que le bouton "Suivant" pour le style
                gotoButtonUp.innerHTML = `<a id="goToPageButton">Page X<span class="a-letter-space"></span><span class="a-letter-space"></span></a>`;

                // Ajouter un événement click au bouton "Aller à"
                gotoButtonUp.querySelector('a').addEventListener('click', function() {
                    askPage();
                });

                // Création du bouton "Aller à la page X"
                const gotoButton = document.createElement('li');
                gotoButton.className = 'a-last'; // Utiliser la même classe que le bouton "Suivant" pour le style
                gotoButton.innerHTML = `<a id="goToPageButton">Page X<span class="a-letter-space"></span><span class="a-letter-space"></span></a>`;

                // Ajouter un événement click au bouton "Aller à"
                gotoButton.querySelector('a').addEventListener('click', function() {
                    askPage();
                });
                //On insère Page X en début de page
                newDiv.querySelector('.a-pagination').insertBefore(gotoButtonUp, newDiv.querySelector('.a-last'));
                //On insère en bas de page
                paginationContainer.insertBefore(gotoButton, paginationContainer.querySelector('.a-last'));
            }
        }
    }

    function askPage() {
        const userInput = prompt("Saisir la page où se rendre");
        const pageNumber = parseInt(userInput, 10); // Convertit en nombre en base 10
        if (!isNaN(pageNumber)) { // Vérifie si le résultat est un nombre
            // Obtient l'URL actuelle
            const currentUrl = window.location.href;
            // Crée un objet URL pour faciliter l'analyse des paramètres de l'URL
            const urlObj = new URL(currentUrl);
            var newUrl = "";
            if (window.location.href.includes("vine-reviews")) {
                const reviewType = urlObj.searchParams.get('review-type') || '';
                // Construit la nouvelle URL avec le numéro de page
                newUrl = `https://www.amazon.fr/vine/vine-reviews?page=${pageNumber}&review-type=${reviewType}`;
                // Redirige vers la nouvelle URL
            } else if (window.location.href.includes("orders")) {
                // Construit la nouvelle URL avec le numéro de page et la valeur de 'pn' existante
                newUrl = `https://www.amazon.fr/vine/orders?page=${pageNumber}`;
            }
            console.log(newUrl);
            window.location.href = newUrl;
        } else {
            alert("Veuillez saisir un numéro de page valide.");
        }
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
    var footerEnabled = localStorage.getItem('footerEnabled');
    var headerEnabled = localStorage.getItem('headerEnabled');
    var pageEnabled = localStorage.getItem('pageEnabled');

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

    if (footerEnabled === null) {
        footerEnabled = 'false';
        localStorage.setItem('footerEnabled', footerEnabled);
    }

    if (headerEnabled === null) {
        headerEnabled = 'false';
        localStorage.setItem('headerEnabled', headerEnabled);
    }

    if (pageEnabled === null) {
        pageEnabled = 'true';
        localStorage.setItem('pageEnabled', pageEnabled);
    }

    if (enableDateFunction === 'true') {
        highlightDates();
    }

    if (enableReviewStatusFunction === 'true') {
        highlightReviewStatus();
    }

    if (enableColorFunction === 'true') {
        changeColor();
    }

    if (filterEnabled === 'true') {
        masquerLignesApprouve();
    }

    if (headerEnabled === 'true') {
        hideHeader();
    }
    if (pageEnabled === 'true') {
        addPage();
    }

    if (enableReviewStatusFunction === 'true' || enableDateFunction === 'true') {
        highlightUnavailableStatus();
    }

    if (profilEnabled === 'true') {
        changeProfil();
    }
    //End
    //Ajout du menu
    const styleMenu = document.createElement('style');
    styleMenu.type = 'text/css';
    styleMenu.innerHTML = `
#configPopup, #colorPickerPopup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  width: 500px; /* Ajusté pour mieux s'adapter aux deux colonnes de checkbox */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  cursor: auto;
  border: 2px solid #ccc; /* Ajout d'un contour */
  overflow: auto; /* Ajout de défilement si nécessaire */
  resize: both; /* Permet le redimensionnement horizontal et vertical */
}

#configPopup h2, #configPopup label {
  color: #333;
  margin-bottom: 20px;
}

#configPopup h2, #colorPickerPopup h2 {
  cursor: grab;
  font-size: 1.5em;
  text-align: center;
}

#configPopup label {
  display: flex;
  align-items: center;
}

#configPopup label input[type="checkbox"] {
  margin-right: 10px;
}

#configPopup .button-container,
#configPopup .checkbox-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

#configPopup .button-container button,
#configPopup .checkbox-container label {
  margin-bottom: 10px;
  flex-basis: 48%; /* Ajusté pour uniformiser l'apparence des boutons et des labels */
}

#configPopup button {
  padding: 5px 10px;
  background-color: #f3f3f3;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
}

#configPopup button:not(.full-width), #colorPickerPopup button:not(.full-width) {
  margin-right: 1%;
  margin-left: 1%;
}

#configPopup button.full-width, #colorPickerPopup button.full-width {
  flex-basis: 48%;
  margin-right: 1%;
  margin-left: 1%;
}

#configPopup button:hover {
  background-color: #e8e8e8;
}

#configPopup button:active {
  background-color: #ddd;
}
#configPopup label.disabled {
  color: #ccc;
}

#configPopup label.disabled input[type="checkbox"] {
  cursor: not-allowed;
}
#saveConfig, #closeConfig, #saveColor, #closeColor {
  padding: 8px 15px !important; /* Plus de padding pour un meilleur visuel */
  margin-top !important: 5px;
  border-radius: 5px !important; /* Bordures légèrement arrondies */
  font-weight: bold !important; /* Texte en gras */
  border: none !important; /* Supprime la bordure par défaut */
  color: white !important; /* Texte en blanc */
  cursor: pointer !important;
  transition: background-color 0.3s ease !important; /* Transition pour l'effet au survol */
}

#saveConfig, #saveColor {
  background-color: #4CAF50 !important; /* Vert pour le bouton "Enregistrer" */
}

#closeConfig, #closeColor {
  background-color: #f44336 !important; /* Rouge pour le bouton "Fermer" */
}

#saveConfig:hover, #saveColor:hover {
  background-color: #45a049 !important; /* Assombrit le vert au survol */
}

#closeConfig:hover, #closeColor:hover {
  background-color: #e53935 !important; /* Assombrit le rouge au survol */
}
#saveColor, #closeColor {
  margin-top: 10px; /* Ajoute un espace de 10px au-dessus du second bouton */
  width: 100%; /* Utilise width: 100% pour assurer que le bouton prend toute la largeur */
}
#reviewColor {
  flex-basis: 100% !important; /* Prend la pleine largeur pour forcer à aller sur une nouvelle ligne */
  margin-right: 1% !important; /* Annuler la marge droite si elle est définie ailleurs */
  margin-left: 1% !important; /* Annuler la marge droite si elle est définie ailleurs */
}
`;
    document.head.appendChild(styleMenu);

    // Fonction pour rendre la fenêtre déplaçable
    function dragElement(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "Header")) {
            // si présent, le header est l'endroit où vous pouvez déplacer la DIV:
            document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
        } else {
            // sinon, déplace la DIV de n'importe quel endroit à l'intérieur de la DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // position de la souris au démarrage:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // appelle la fonction chaque fois que le curseur bouge:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calcule la nouvelle position de la souris:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // définit la nouvelle position de l'élément:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // arrête le mouvement quand le bouton de la souris est relâché:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Crée la fenêtre popup de configuration avec la fonction de déplacement
    async function createConfigPopup() {
        if (document.getElementById('configPopup')) {
            return; // Termine la fonction pour éviter de créer une nouvelle popup
        }
        const popup = document.createElement('div');
        popup.id = "configPopup";
        popup.innerHTML = `
    <h2 id="configPopupHeader">Paramètres ReviewRemember v${version}<span id="closePopup" style="float: right; cursor: pointer;">&times;</span></h2>
    <div class="checkbox-container">
      ${createCheckbox('enableDateFunction', 'Surlignage du statut des avis', 'Change la couleur du "Statut du commentaire" dans vos avis "En attente de vérification" en fonction de leur date d\'ancienneté. Entre 0 et 6 jours -> Bleu, 7 à 13 jours -> Vert, 14 à 29 jours -> Orange, plus de 30 jours -> Rouge')}
      ${createCheckbox('enableReviewStatusFunction', 'Surlignage des avis vérifiés', 'Change la couleur du "Statut du commentaire" dans vos avis "Vérifiées" en fonction de leur statut actuel (Approuvé, Non approuvé, etc...)')}
      ${createCheckbox('enableColorFunction', 'Changer la couleur de la barre de progression des avis', 'Change la couleur de la barre de progression des avis sur la page "Compte". Entre 0 et 59% -> Rouge, 60 à 89% -> Orange et supérieur à 90% -> Vert')}
      ${createCheckbox('filterEnabled', 'Cacher les avis approuvés', 'Dans l\'onglet "Vérifiées" de vos avis, si l\'avis  est Approuvé, alors il est caché')}
      ${createCheckbox('headerEnabled', 'Cacher totalement l\'entête de la page', 'Cache le haut de la page Amazon, celle avec la zone de recherche et les menus')}
      ${createCheckbox('pageEnabled', 'Affichage des pages en partie haute', 'En plus des pages de navigation en partie basse, ajoute également la navigation des pages en haut')}
      ${createCheckbox('profilEnabled', 'Mise en avant des avis avec des votes utiles sur les profils Amazon','Surligne de la couleur définie les avis ayant un vote utile ou plus. Il est également mis en début de page. Le surlignage ne fonctionne pas si l\'avis possède des photos')}
      ${createCheckbox('footerEnabled', 'Supprimer le footer sur les profils Amazon (à décocher si les avis ne se chargent pas)', 'Supprime le bas de page sur les pages de profil Amazon, cela permet de charger plus facilement les avis sans descendre tout en bas de la page. Cela ne fonctionne que sur PC, donc à désactiver si vous avez le moindre problème sur cette page')}
       </div>
    ${addActionButtons()}
  `;
        document.body.appendChild(popup);

        document.getElementById('closePopup').addEventListener('click', () => {
            document.getElementById('configPopup').remove();
        });

        // Ajoute des écouteurs pour les nouveaux boutons
        document.getElementById('reviewColor').addEventListener('click', setHighlightColor);
        document.getElementById('exportCSV').addEventListener('click', exportReviewsToCSV);

        document.getElementById('purgeTemplate').addEventListener('click', () => {
            if (confirm("Es-tu sûr de vouloir supprimer le modèle d'avis ?")) {
                deleteTemplate();
                reloadButtons();
            }
        });

        document.getElementById('purgeReview').addEventListener('click', () => {
            if (confirm("Es-tu sûr de vouloir supprimer tous les avis ?")) {
                deleteAllReviews();
                reloadButtons();
            }
        });
        //Import
        document.getElementById('importCSV').addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.style.display = 'none'; // Le rend invisible
        fileInput.accept = '.csv'; // Accepte uniquement les fichiers .csv

        // Ajoute l'élément input au body du document
        document.body.appendChild(fileInput);
        document.getElementById('fileInput').addEventListener('change', function(event) {
            const file = event.target.files[0]; // Obtient le fichier sélectionné
            if (file) {
                readAndImportCSV(file); // Envoie le fichier à la fonction
            }
        });

        dragElement(popup);

        document.getElementById('saveConfig').addEventListener('click', saveConfig);
        document.getElementById('closeConfig').addEventListener('click', () => popup.remove());
    }

    /* function createCheckbox(name, label, disabled = false) {
        // Récupère la valeur depuis localStorage; 'false' est utilisé comme valeur par défaut
        const isChecked = localStorage.getItem(name) === 'true' ? 'checked' : '';
        const isDisabled = disabled ? 'disabled' : '';

        // Construit et retourne le HTML de la checkbox avec les attributs ajustés
        // Note: assure-toi que la valeur 'true' ou 'false' est bien stockée comme chaîne dans localStorage
        return `<label class="${isDisabled ? 'disabled' : ''}"><input type="checkbox" id="${name}" name="${name}" ${isChecked} ${isDisabled}> ${label}</label>`;
    }*/

    function createCheckbox(name, label, explanation = null, disabled = false) {
        const isChecked = localStorage.getItem(name) === 'true' ? 'checked' : '';
        const isDisabled = disabled ? 'disabled' : '';
        // Choisis la couleur ici. Options: 'black', 'white', 'gray'
        const color = 'gray'; // Exemple: change cette valeur pour 'black', 'white', ou une autre couleur CSS valide

        // Génération de l'ID unique pour le span d'aide
        const helpSpanId = `help-span-${name}`;

        // Icône d'aide avec gestionnaire d'événements attaché via addEventListener
        const helpIcon = explanation ? `<span id="${helpSpanId}" style="text-decoration: none; cursor: help; margin-left: 4px; color: ${color}; font-size: 16px;">?</span>` : '';
        const checkboxHtml = `<label class="${isDisabled ? 'disabled' : ''}">
              <input type="checkbox" id="${name}" name="${name}" ${isChecked} ${isDisabled}>
              ${label} ${helpIcon}
          </label>`;

        // Attacher le gestionnaire d'événements après le rendu de l'HTML
        setTimeout(() => {
            const helpSpan = document.getElementById(helpSpanId);
            if (helpSpan) {
                helpSpan.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    alert(explanation); // Ou toute autre logique d'affichage d'explication
                });
            }
        }, 0);

        return checkboxHtml;
    }

    // Sauvegarde la configuration
    async function saveConfig() {
        document.querySelectorAll('#configPopup input[type="checkbox"]').forEach(input => {
            // Stocke la valeur (true ou false) dans localStorage en tant que chaîne de caractères
            localStorage.setItem(input.name, input.checked.toString());
        });
        //alert('Configuration sauvegardée.');
        window.location.reload();
        document.getElementById('configPopup').remove();
    }

    // Ajoute les boutons pour les actions spécifiques qui ne sont pas juste des toggles on/off
    function addActionButtons() {
        return `
<div class="button-container action-buttons">
  <button id="reviewColor">Définir la couleur de surbrillance des avis sur les profils Amazon</button><br>
  <button id="exportCSV">Exporter les avis en CSV</button>
  <button id="importCSV">Importer les avis en CSV</button>
  <button id="purgeTemplate">Supprimer le modèle d'avis</button>
  <button id="purgeReview">Supprimer tous les avis</button>
</div>
<div class="button-container final-buttons">
  <button class="full-width" id="saveConfig">Enregistrer</button>
  <button class="full-width" id="closeConfig">Fermer</button>
</div>
    `;
    }

    // Ajouter la commande de menu "Paramètres"
    GM_registerMenuCommand("Paramètres", createConfigPopup, "p");
    //End

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
    // Suppression du footer uniquement sur les PC (1000 étant la valeur pour "Version pour ordinateur" sur Kiwi à priori
    if (window.innerWidth > 768 && window.innerWidth != 1000 && window.innerWidth != 1100 && window.location.href.startsWith("https://www.amazon.fr/gp/profile/") && footerEnabled === 'true') {
        // Votre code de suppression du footer ici
        var styleFooter = document.createElement('style');
        styleFooter.textContent = `
        #rhf, #rhf-shoveler, .rhf-frame, #navFooter {
            display: none !important;
        }
    `;
        document.head.appendChild(styleFooter);
    }

    //Suppression footer partout sauf sur le profil car configurable
    if (!window.location.href.startsWith("https://www.amazon.fr/gp/profile/")) {
        var supFooter = document.createElement('style');

        supFooter.textContent = `
#rhf, #rhf-shoveler, .rhf-frame, #navFooter {
  display: none !important;
}
`
        document.head.appendChild(supFooter);
    }

    window.addEventListener('load', function () {
        //Active le bouton de téléchargement du rapport
        var element = document.querySelector('.vvp-tax-report-file-type-select-container.download-disabled');
        if (element) {
            element.classList.remove('download-disabled');
        }

        //Ajoute l'heure de l'évaluation
        const timeStampElement = document.getElementById('vvp-eval-end-stamp');
        const timeStamp = timeStampElement ? timeStampElement.textContent : null;

        if (timeStamp) {
            const date = new Date(parseInt(timeStamp));
            const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
            const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
            const formattedDate = date.toLocaleDateString('fr-FR', optionsDate) + ' à ' + date.toLocaleTimeString('fr-FR', optionsTime);

            const dateStringElement = document.getElementById('vvp-evaluation-date-string');
            if (dateStringElement) {
                dateStringElement.innerHTML = `Réévaluation&nbsp;: <strong>${formattedDate}</strong>`;
            }
        }

        //Suppression du bouton pour se désincrire
        var elem = document.getElementById('vvp-opt-out-of-vine-button');
        if (elem) {
            elem.style.display = 'none';
        }
    });
})();
