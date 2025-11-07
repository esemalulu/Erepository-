/*
This file is part of Ext JS 4.2

Copyright (c) 2011-2013 Sencha Inc

Contact:  http://www.sencha.com/contact

Commercial Usage
Licensees holding valid commercial licenses may use this file in accordance with the Commercial
Software License Agreement provided with the Software or, alternatively, in accordance with the
terms contained in a written agreement between you and Sencha.

If you are unsure which license is appropriate for your use, please contact the sales department
at http://www.sencha.com/contact.

Build date: 2013-03-11 22:33:40 (aed16176e68b5e8aa1433452b12805c0ad913836)
*/
/**
 * France (Canadian) translation
 * By BernardChhun
 * 04-08-2007, 03:07 AM
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">En cours de chargement...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.shortMonthNames = ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.shortMonthNames[month];
        };

        Ext4.Date.monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

        Ext4.Date.monthNumbers = {
            "Janvier": 0,
            "Janv": 0,
            "Février": 1,
            "Févr": 1,
            "Mars": 2,
            "Mars": 2,
            "Avril": 3,
            "Avr": 3,
            "Mai": 4,
            "Juin": 5,
            "Juillet": 6,
            "Juil": 6, 
            "Août": 7,
            "Septembre": 8,
            "Sept": 8,
            "Octobre": 9,
            "Oct": 9,
            "Novembre": 10,
            "Nov": 10,
            "Décembre": 11,
            "Déc": 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[Ext4.util.Format.capitalize(name)];
        };

        Ext4.Date.dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 3);
        };
    }
    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Annuler",
            yes: "Oui",
            no: "Non"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '$',
            // Canadian Dollar
            dateFormat: 'd/m/Y'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'Ce champ doit contenir un courriel et doit être sous ce format: "usager@example.com"',
            urlText: 'Ce champ doit contenir une URL sous le format suivant: "http:/' + '/www.example.com"',
            alphaText: 'Ce champ ne peut contenir que des lettres et le caractère souligné (_)',
            alphanumText: 'Ce champ ne peut contenir que des caractères alphanumériques ainsi que le caractère souligné (_)'
        });
    }
});

Ext4.define("Ext4.locale.fr_CA.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.fr_CA.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} ligne(s) sélectionné(s)"
});

Ext4.define("Ext4.locale.fr_CA.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Fermer cette onglet"
});

Ext4.define("Ext4.locale.fr_CA.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "La valeur de ce champ est invalide"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.fr_CA.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "En cours de chargement..."
});

Ext4.define("Ext4.locale.fr_CA.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Aujourd'hui",
    minText: "Cette date est plus petite que la date minimum",
    maxText: "Cette date est plus grande que la date maximum",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Prochain mois (CTRL+Fléche droite)',
    prevText: 'Mois précédent (CTRL+Fléche gauche)',
    monthYearText: 'Choissisez un mois (CTRL+Fléche haut ou bas pour changer d\'année.)',
    todayTip: "{0} (Barre d'espace)",
    format: "d/m/y"
});

Ext4.define("Ext4.locale.fr_CA.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Page",
    afterPageText: "de {0}",
    firstText: "Première page",
    prevText: "Page précédente",
    nextText: "Prochaine page",
    lastText: "Dernière page",
    refreshText: "Recharger la page",
    displayMsg: "Page courante {0} - {1} de {2}",
    emptyMsg: 'Aucune donnée à afficher'
});

Ext4.define("Ext4.locale.fr_CA.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "La longueur minimum de ce champ est de {0} caractères",
    maxLengthText: "La longueur maximum de ce champ est de {0} caractères",
    blankText: "Ce champ est obligatoire",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.fr_CA.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "La valeur minimum de ce champ doit être de {0}",
    maxText: "La valeur maximum de ce champ doit être de {0}",
    nanText: "{0} n'est pas un nombre valide"
});

Ext4.define("Ext4.locale.fr_CA.form.field.File", { 
    override: "Ext4.form.field.File", 
    buttonText: "Parcourir..." 
});

Ext4.define("Ext4.locale.fr_CA.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Désactivé",
    disabledDatesText: "Désactivé",
    minText: "La date de ce champ doit être avant le {0}",
    maxText: "La date de ce champ doit être après le {0}",
    invalidText: "{0} n'est pas une date valide - il doit être au format suivant: {1}",
    format: "d/m/y"
});

Ext4.define("Ext4.locale.fr_CA.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "En cours de chargement..."
    });
});

Ext4.define("Ext4.locale.fr_CA.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Tri ascendant",
    sortDescText: "Tri descendant",
    lockText: "Verrouillé la colonne",
    unlockText: "Déverrouillé la colonne",
    columnsText: "Colonnes"
});

Ext4.define("Ext4.locale.fr_CA.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Propriété",
    valueText: "Valeur",
    dateFormat: "d/m/Y"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.fr_CA.Component", {	
    override: "Ext4.Component"
});

