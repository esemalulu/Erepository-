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
 * Czech Translations
 * Translated by Tomáš Korčák (72)
 * 2008/02/08 18:02, Ext-2.0.1
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Prosím čekejte...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

        Ext4.Date.shortMonthNames = {
            "Leden": "Led",
            "Únor": "Úno",
            "Březen": "Bře",
            "Duben": "Dub",
            "Květen": "Kvě",
            "Červen": "Čer",
            "Červenec": "Čvc",
            "Srpen": "Srp",
            "Září": "Zář",
            "Říjen": "Říj",
            "Listopad": "Lis",
            "Prosinec": "Pro"
        };

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.shortMonthNames[Ext4.Date.monthNames[month]];
        };

        Ext4.Date.monthNumbers = {
            "Leden": 0,
            "Únor": 1,
            "Březen": 2,
            "Duben": 3,
            "Květen": 4,
            "Červen": 5,
            "Červenec": 6,
            "Srpen": 7,
            "Září": 8,
            "Říjen": 9,
            "Listopad": 10,
            "Prosinec": 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 3);
        };
    }
    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Storno",
            yes: "Ano",
            no: "Ne"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u004b\u010d',
            // Czech Koruny
            dateFormat: 'd.m.Y'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'V tomto poli může být vyplněna pouze emailová adresa ve formátu "uživatel@doména.cz"',
            urlText: 'V tomto poli může být vyplněna pouze URL (adresa internetové stránky) ve formátu "http:/' + '/www.doména.cz"',
            alphaText: 'Toto pole může obsahovat pouze písmena abecedy a znak _',
            alphanumText: 'Toto pole může obsahovat pouze písmena abecedy, čísla a znak _'
        });
    }
});

Ext4.define("Ext4.locale.cs.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.cs.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} vybraných řádků"
});

Ext4.define("Ext4.locale.cs.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Zavřít záložku"
});

Ext4.define("Ext4.locale.cs.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Hodnota v tomto poli je neplatná"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.cs.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "Prosím čekejte..."
});

Ext4.define("Ext4.locale.cs.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Dnes",
    minText: "Datum nesmí být starší než je minimální",
    maxText: "Datum nesmí být dřívější než je maximální",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Následující měsíc (Control+Right)',
    prevText: 'Předcházející měsíc (Control+Left)',
    monthYearText: 'Zvolte měsíc (ke změně let použijte Control+Up/Down)',
    todayTip: "{0} (Spacebar)",
    format: "d.m.Y",
    startDay: 1
});

Ext4.define("Ext4.locale.cs.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Storno"
});

Ext4.define("Ext4.locale.cs.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Strana",
    afterPageText: "z {0}",
    firstText: "První strana",
    prevText: "Přecházející strana",
    nextText: "Následující strana",
    lastText: "Poslední strana",
    refreshText: "Aktualizovat",
    displayMsg: "Zobrazeno {0} - {1} z celkových {2}",
    emptyMsg: 'Žádné záznamy nebyly nalezeny'
});

Ext4.define("Ext4.locale.cs.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Pole nesmí mít méně {0} znaků",
    maxLengthText: "Pole nesmí být delší než {0} znaků",
    blankText: "This field is required",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.cs.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Hodnota v tomto poli nesmí být menší než {0}",
    maxText: "Hodnota v tomto poli nesmí být větší než {0}",
    nanText: "{0} není platné číslo"
});

Ext4.define("Ext4.locale.cs.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Neaktivní",
    disabledDatesText: "Neaktivní",
    minText: "Datum v tomto poli nesmí být starší než {0}",
    maxText: "Datum v tomto poli nesmí být novější než {0}",
    invalidText: "{0} není platným datem - zkontrolujte zda-li je ve formátu {1}",
    format: "d.m.Y",
    altFormats: "d/m/Y|d-m-y|d-m-Y|d/m|d-m|dm|dmy|dmY|d|Y-m-d"
});

Ext4.define("Ext4.locale.cs.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Prosím čekejte..."
    });
});

Ext4.define("Ext4.locale.cs.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Zadejte URL adresu odkazu:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Tučné (Ctrl+B)',
                text: 'Označí vybraný text tučně.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Kurzíva (Ctrl+I)',
                text: 'Označí vybraný text kurzívou.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Podtržení (Ctrl+U)',
                text: 'Podtrhne vybraný text.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Zvětšit písmo',
                text: 'Zvětší velikost písma.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Zúžit písmo',
                text: 'Zmenší velikost písma.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Barva zvýraznění textu',
                text: 'Označí vybraný text tak, aby vypadal jako označený zvýrazňovačem.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Barva písma',
                text: 'Změní barvu textu.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Zarovnat text vlevo',
                text: 'Zarovná text doleva.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Zarovnat na střed',
                text: 'Zarovná text na střed.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Zarovnat text vpravo',
                text: 'Zarovná text doprava.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Odrážky',
                text: 'Začne seznam s odrážkami.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Číslování',
                text: 'Začne číslovaný seznam.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Internetový odkaz',
                text: 'Z vybraného textu vytvoří internetový odkaz.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Zdrojový kód',
                text: 'Přepne do módu úpravy zdrojového kódu.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.cs.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Řadit vzestupně",
    sortDescText: "Řadit sestupně",
    lockText: "Ukotvit sloupec",
    unlockText: "Uvolnit sloupec",
    columnsText: "Sloupce"
});

Ext4.define("Ext4.locale.cs.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(Žádná data)',
    groupByText: 'Seskupit dle tohoto pole',
    showGroupsText: 'Zobrazit ve skupině'
});

Ext4.define("Ext4.locale.cs.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Název",
    valueText: "Hodnota",
    dateFormat: "j.m.Y"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.cs.Component", {	
    override: "Ext4.Component"
});

