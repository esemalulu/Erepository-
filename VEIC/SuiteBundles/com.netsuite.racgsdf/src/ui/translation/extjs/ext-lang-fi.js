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

Build date: 2013-05-16 14:36:50 (f9be68accb407158ba2b1be2c226a6ce1f649314)
*/
/**
 * Finnish Translations
 * <tuomas.salo (at) iki.fi>
 * 'ä' should read as lowercase 'a' with two dots on top (&auml;)
 */
Ext4.onReady(function() {

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"];

        Ext4.Date.getShortMonthName = function(month) {
            //return Ext4.Date.monthNames[month].substring(0, 3);
            return (month + 1) + ".";
        };

        Ext4.Date.monthNumbers = {
            Jan: 0,
            Feb: 1,
            Mar: 2,
            Apr: 3,
            May: 4,
            Jun: 5,
            Jul: 6,
            Aug: 7,
            Sep: 8,
            Oct: 9,
            Nov: 10,
            Dec: 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            if (name.match(/^(1?\d)\./)) {
                return -1 + RegExp.$1;
            } else {
                return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
            }
        };

        Ext4.Date.dayNames = ["sunnuntai", "maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 2);
        };
    }

    if (Ext4.util && Ext4.util.Format) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u20ac',
            // Finnish Euro
            dateFormat: 'j.n.Y'
        });
        
        Ext4.util.Format.date = function(v, format) {
            if (!v) return "";
            if (!(v instanceof Date)) v = new Date(Date.parse(v));
            return Ext4.Date.format(v, format || "j.n.Y");
        };
        
    }
});

Ext4.define("Ext4.locale.fi.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.fi.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} rivi(ä) valittu"
});

Ext4.define("Ext4.locale.fi.tab.Tab", {
    override: "Ext4.tab.Tab",
    closeText: "Sulje tämä välilehti"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.fi.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    loadingText: "Ladataan..."
});

Ext4.define("Ext4.locale.fi.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Tänään",
    minText: "Tämä päivämäärä on aikaisempi kuin ensimmäinen sallittu",
    maxText: "Tämä päivämäärä on myöhäisempi kuin viimeinen sallittu",
    disabledDaysText: "",
    disabledDatesText: "",
    nextText: 'Seuraava kuukausi (Control+oikealle)',
    prevText: 'Edellinen kuukausi (Control+vasemmalle)',
    monthYearText: 'Valitse kuukausi (vaihda vuotta painamalla Control+ylös/alas)',
    todayTip: "{0} (välilyönti)",
    format: "j.n.Y",
    startDay: 1 // viikko alkaa maanantaista
});

Ext4.define("Ext4.locale.fi.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Peruuta"
});

Ext4.define("Ext4.locale.fi.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Sivu",
    afterPageText: "/ {0}",
    firstText: "Ensimmäinen sivu",
    prevText: "Edellinen sivu",
    nextText: "Seuraava sivu",
    lastText: "Viimeinen sivu",
    refreshText: "Päivitä",
    displayMsg: "Näytetään {0} - {1} / {2}",
    emptyMsg: 'Ei tietoja'
});

Ext4.define("Ext4.locale.fi.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Tämän kentän arvo ei kelpaa"
});

Ext4.define("Ext4.locale.fi.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Tämän kentän minimipituus on {0}",
    maxLengthText: "Tämän kentän maksimipituus on {0}",
    blankText: "Tämä kenttä on pakollinen",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.fi.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Tämän kentän pienin sallittu arvo on {0}",
    maxText: "Tämän kentän suurin sallittu arvo on {0}",
    nanText: "{0} ei ole numero"
});

Ext4.define("Ext4.locale.fi.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Ei käytössä",
    disabledDatesText: "Ei käytössä",
    minText: "Tämän kentän päivämäärän tulee olla {0} jälkeen",
    maxText: "Tämän kentän päivämäärän tulee olla ennen {0}",
    invalidText: "Päivämäärä {0} ei ole oikeassa muodossa - kirjoita päivämäärä muodossa {1}",
    format: "j.n.Y",
    altFormats: "j.n.|d.m.|mdy|mdY|d|Y-m-d|Y/m/d"
});

Ext4.define("Ext4.locale.fi.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Ladataan..."
    });
});

Ext4.define("Ext4.locale.fi.form.field.VTypes", {
    override: "Ext4.form.field.VTypes",
    emailText: 'Syötä tähän kenttään sähköpostiosoite, esim. "etunimi.sukunimi@osoite.fi"',
    urlText: 'Syötä tähän kenttään URL-osoite, esim. "http:/' + '/www.osoite.fi"',
    alphaText: 'Syötä tähän kenttään vain kirjaimia (a-z, A-Z) ja alaviivoja (_)',
    alphanumText: 'Syötä tähän kenttään vain kirjaimia (a-z, A-Z), numeroita (0-9) ja alaviivoja (_)'
});

Ext4.define("Ext4.locale.fi.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Anna linkin URL-osoite:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Lihavoi (Ctrl+B)',
                text: 'Lihavoi valittu teksti.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Kursivoi (Ctrl+I)',
                text: 'Kursivoi valittu teksti.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Alleviivaa (Ctrl+U)',
                text: 'Alleviivaa valittu teksti.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Suurenna tekstiä',
                text: 'Kasvata tekstin kirjasinkokoa.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Pienennä tekstiä',
                text: 'Pienennä tekstin kirjasinkokoa.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Tekstin korostusväri',
                text: 'Vaihda valitun tekstin taustaväriä.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Tekstin väri',
                text: 'Vaihda valitun tekstin väriä.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Tasaa vasemmalle',
                text: 'Tasaa teksti vasempaan reunaan.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Keskitä',
                text: 'Keskitä teksti.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Tasaa oikealle',
                text: 'Tasaa teksti oikeaan reunaan.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Luettelo',
                text: 'Luo luettelo.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Numeroitu luettelo',
                text: 'Luo numeroitu luettelo.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Linkki',
                text: 'Tee valitusta tekstistä hyperlinkki.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Lähdekoodin muokkaus',
                text: 'Vaihda lähdekoodin muokkausnäkymään.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.fi.form.Basic", {
    override: "Ext4.form.Basic",
    waitTitle: "Odota..."
});

Ext4.define("Ext4.locale.fi.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Järjestä A-Ö",
    sortDescText: "Järjestä Ö-A",
    lockText: "Lukitse sarake",
    unlockText: "Vapauta sarakkeen lukitus",
    columnsText: "Sarakkeet"
});

Ext4.define("Ext4.locale.fi.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(ei mitään)',
    groupByText: 'Ryhmittele tämän kentän mukaan',
    showGroupsText: 'Näytä ryhmissä'
});

Ext4.define("Ext4.locale.fi.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Nimi",
    valueText: "Arvo",
    dateFormat: "j.m.Y"
});

Ext4.define("Ext4.locale.fi.window.MessageBox", {
    override: "Ext4.window.MessageBox",
    buttonText: {
        ok: "OK",
        cancel: "Peruuta",
        yes: "Kyllä",
        no: "Ei"
    }    
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.fi.Component", {	
    override: "Ext4.Component"
});

