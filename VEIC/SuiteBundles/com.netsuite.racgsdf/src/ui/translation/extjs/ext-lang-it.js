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
 * Italian translation
 * 28 Maggio 2012   updated by Fabio De Paolis (many changes, update to 4.1.0)
 * 21 Dicembre 2007 updated by Federico Grilli
 * 04 Ottobre 2007  updated by eric_void
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Caricamento...</div>';
    }

//    if (exists('Ext4.data.Types')) {
//        Ext4.data.Types.stripRe = /[\$,%]/g;
//    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.monthNames[month].substring(0, 3);
        };

        Ext4.Date.monthNumbers = {
            Gen: 0,
            Feb: 1,
            Mar: 2,
            Apr: 3,
            Mag: 4,
            Giu: 5,
            Lug: 6,
            Ago: 7,
            Set: 8,
            Ott: 9,
            Nov: 10,
            Dic: 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Domenica", "Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi", "Sabato"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 3);
        };

//        Ext4.Date.parseCodes.S.s = "(?:st|nd|rd|th)";
    }

    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Annulla",
            yes: "Si",
            no: "No"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u20ac',  // Euro
            dateFormat: 'd/m/Y'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'Il campo deve essere un indirizzo e-mail nel formato "utente@esempio.com"',
            urlText: 'Il campo deve essere un indirizzo web nel formato "http:/' + '/www.esempio.com"',
            alphaText: 'Il campo deve contenere solo lettere e _',
            alphanumText: 'Il campo deve contenere solo lettere, numeri e _'
        });
    }
});

Ext4.define("Ext4.locale.en.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.en.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} Righe selezionate"
});

Ext4.define("Ext4.locale.de.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Chiudi scheda"
});

Ext4.define("Ext4.locale.en.form.Basic", {
    override: "Ext4.form.Basic",
    waitTitle: "Attendere..."
});

Ext4.define("Ext4.locale.en.form.field.Base", {
    override: "Ext4.form.field.Base",
//        invalidText: "The value in this field is invalid"
    invalidText: "Valore non valido"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.en.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "Caricamento..."
});

Ext4.define("Ext4.locale.en.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Oggi",
    minText: "Data precedente alla data minima",
    maxText: "Data successiva alla data massima",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Mese successivo (Control+Destra)',
    prevText: 'Mese precedente (Control+Sinistra)',
    monthYearText: 'Scegli un mese (Control+Sopra/Sotto per cambiare anno)',
    todayTip: "{0} (Barra spaziatrice)",
    format: "d/m/Y",
    startDay: 1
});

Ext4.define("Ext4.locale.en.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Annulla"
});

Ext4.define("Ext4.locale.en.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Pagina",
    afterPageText: "di {0}",
    firstText: "Prima pagina",
    prevText: "Pagina precedente",
    nextText: "Pagina successiva",
    lastText: "Ultima pagina",
    refreshText: "Aggiorna",
    displayMsg: "Mostrati {0} - {1} di {2}",
    emptyMsg: 'Non ci sono dati da mostrare'
});

Ext4.define("Ext4.locale.en.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "La lunghezza minima \u00E8 {0}",
    maxLengthText: "La lunghezza massima \u00E8 {0}",
    blankText: "Campo obbligatorio",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.en.form.field.Number", {
    override: "Ext4.form.field.Number",
    decimalSeparator: ",",
    decimalPrecision: 2,
    minText: "Il valore minimo \u00E8 {0}",
    maxText: "Il valore massimo \u00E8 {0}",
    nanText: "{0} non \u00E8 un valore numerico valido"
});

Ext4.define("Ext4.locale.en.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Disabilitato",
    disabledDatesText: "Disabilitato",
    minText: "La data deve essere maggiore o uguale a {0}",
    maxText: "La data deve essere minore o uguale a {0}",
    invalidText: "{0} non \u00E8 una data valida. Deve essere nel formato {1}",
    format: "d/m/Y",
//        altFormats: "d/m/Y|d-m-y|d-m-Y|d/m|d-m|dm|dmy|dmY|d|Y-m-d"
    altFormats: "d-m-y|d-m-Y|d/m|d-m|dm|dmy|dmY|d|Y-m-d"
});

Ext4.define("Ext4.locale.en.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Caricamento..."
    });
});

Ext4.define("Ext4.locale.en.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Inserire un URL per il link:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Grassetto (Ctrl+B)',
                text: 'Rende il testo selezionato in grassetto.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Corsivo (Ctrl+I)',
                text: 'Rende il testo selezionato in corsivo.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Sottolinea (Ctrl+U)',
                text: 'Sottolinea il testo selezionato.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Ingrandisci testo',
                text: 'Aumenta la dimensione del carattere.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Rimpicciolisci testo',
                text: 'Diminuisce la dimensione del carattere.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Colore evidenziatore testo',
                text: 'Modifica il colore di sfondo del testo selezionato.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Colore carattere',
                text: 'Modifica il colore del testo selezionato.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Allinea a sinistra',
                text: 'Allinea il testo a sinistra.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Centra',
                text: 'Centra il testo.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Allinea a destra',
                text: 'Allinea il testo a destra.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Elenco puntato',
                text: 'Elenco puntato.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Elenco numerato',
                text: 'Elenco numerato.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Collegamento',
                text: 'Trasforma il testo selezionato in un collegamanto.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Sorgente',
                text: 'Passa alla modalit\u00E0 editing del sorgente.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.en.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Ordinamento crescente",
    sortDescText: "Ordinamento decrescente",
    lockText: "Blocca colonna",
    unlockText: "Sblocca colonna",
    columnsText: "Colonne"
});

Ext4.define("Ext4.locale.en.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(Nessun dato)',
    groupByText: 'Raggruppa per questo campo',
    showGroupsText: 'Mostra nei gruppi'
});

Ext4.define("Ext4.locale.en.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Name",
    valueText: "Value",
    dateFormat: "j/m/Y",
    trueText: "true",
    falseText: "false"
});

Ext4.define("Ext4.locale.en.grid.BooleanColumn", {
    override: "Ext4.grid.BooleanColumn",
    trueText: "vero",
    falseText: "falso",
    undefinedText: '&#160;'
});

Ext4.define("Ext4.locale.en.grid.NumberColumn", {
    override: "Ext4.grid.NumberColumn",
    format: '0.000,00'
});

Ext4.define("Ext4.locale.en.grid.DateColumn", {
    override: "Ext4.grid.DateColumn",
    format: 'd/m/Y'
});

Ext4.define("Ext4.locale.en.form.field.Time", {
    override: "Ext4.form.field.Time",
    minText: "L'Ora deve essere maggiore o uguale a {0}",
    maxText: "L'Ora deve essere mainore o uguale a {0}",
    invalidText: "{0} non \u00E8 un Orario valido",
//        format: "g:i A",
    format: "H:i"
//        altFormats: "g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H"
});

Ext4.define("Ext4.locale.en.form.CheckboxGroup", {
    override: "Ext4.form.CheckboxGroup",
    blankText: "Devi selezionare almeno un elemento nel gruppo"
});

Ext4.define("Ext4.locale.en.form.RadioGroup", {
    override: "Ext4.form.RadioGroup",
    blankText: "Devi selezionare un elemento nel gruppo"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.it.Component", {	
    override: "Ext4.Component"
});

