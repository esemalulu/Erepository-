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
 * Swedish translation (utf8-encoding)
 * By Erik Andersson, Monator Technologies
 * 24 April 2007
 * Changed by Cariad, 29 July 2007
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Laddar...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

        Ext4.Date.dayNames = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];
    }

    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Avbryt",
            yes: "Ja",
            no: "Nej"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: 'kr',
            // Swedish Krone
            dateFormat: 'Y-m-d'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'Detta fält ska innehålla en e-post adress i formatet "användare@domän.se"',
            urlText: 'Detta fält ska innehålla en länk (URL) i formatet "http:/' + '/www.domän.se"',
            alphaText: 'Detta fält får bara innehålla bokstäver och "_"',
            alphanumText: 'Detta fält får bara innehålla bokstäver, nummer och "_"'
        });
    }
});

Ext4.define("Ext4.locale.sv_SE.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.sv_SE.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} markerade rad(er)"
});

Ext4.define("Ext4.locale.sv_SE.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Stäng denna flik"
});

Ext4.define("Ext4.locale.sv_SE.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Värdet i detta fält är inte tillåtet"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.sv_SE.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "Laddar..."
});

Ext4.define("Ext4.locale.sv_SE.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Idag",
    minText: "Detta datum inträffar före det tidigast tillåtna",
    maxText: "Detta datum inträffar efter det senast tillåtna",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Nästa månad (Ctrl + högerpil)',
    prevText: 'Föregående månad (Ctrl + vänsterpil)',
    monthYearText: 'Välj en månad (Ctrl + uppåtpil/neråtpil för att ändra årtal)',
    todayTip: "{0} (mellanslag)",
    format: "Y-m-d",
    startDay: 1
});

Ext4.define("Ext4.locale.sv_SE.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Sida",
    afterPageText: "av {0}",
    firstText: "Första sidan",
    prevText: "Föregående sida",
    nextText: "Nästa sida",
    lastText: "Sista sidan",
    refreshText: "Uppdatera",
    displayMsg: "Visar {0} - {1} av {2}",
    emptyMsg: 'Det finns ingen data att visa'
});

Ext4.define("Ext4.locale.sv_SE.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Minsta tillåtna längd för detta fält är {0}",
    maxLengthText: "Största tillåtna längd för detta fält är {0}",
    blankText: "Detta fält är obligatoriskt",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.sv_SE.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Minsta tillåtna värde för detta fält är {0}",
    maxText: "Största tillåtna värde för detta fält är {0}",
    nanText: "{0} är inte ett tillåtet nummer"
});

Ext4.define("Ext4.locale.sv_SE.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Inaktiverad",
    disabledDatesText: "Inaktiverad",
    minText: "Datumet i detta fält måste inträffa efter {0}",
    maxText: "Datumet i detta fält måste inträffa före {0}",
    invalidText: "{0} är inte ett tillåtet datum - datum ska anges i formatet {1}",
    format: "Y-m-d"
});

Ext4.define("Ext4.locale.sv_SE.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Laddar..."
    });
});

Ext4.define("Ext4.locale.sv_SE.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Sortera stigande",
    sortDescText: "Sortera fallande",
    lockText: "Lås kolumn",
    unlockText: "Lås upp kolumn",
    columnsText: "Kolumner"
});

Ext4.define("Ext4.locale.sv_SE.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Namn",
    valueText: "Värde",
    dateFormat: "Y-m-d"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.sv_SE.Component", {	
    override: "Ext4.Component"
});

