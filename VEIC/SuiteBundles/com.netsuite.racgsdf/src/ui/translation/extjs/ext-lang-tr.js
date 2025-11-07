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
Ext4.onReady(function() {

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.monthNames[month].substring(0, 3);
        };

        Ext4.Date.monthNumbers = {
            "Ocak": 0,
            "Şubat": 1,
            "Mart": 2,
            "Nisan": 3,
            "Mayıs": 4,
            "Haziran": 5,
            "Temmuz": 6,
            "Ağustos": 7,
            "Eylül": 8,
            "Ekim": 9,
            "Kasım": 10,
            "Aralık": 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

        Ext4.Date.shortDayNames = ["Paz", "Pzt", "Sal", "Çrş", "Prş", "Cum", "Cmt"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.shortDayNames[day];
        };
    }

    if (Ext4.util && Ext4.util.Format) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: 'TL',
            // Turkish Lira
            dateFormat: 'd/m/Y'
        });
    }
});

Ext4.define("Ext4.locale.tr.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.tr.grid.Grid", {
    override: "Ext4.grid.Grid",
    ddText: "Seçili satır sayısı : {0}"
});

Ext4.define("Ext4.locale.tr.tab.Tab", {
    override: "Ext4.tab.Tab",
    closeText: "Sekmeyi kapat"
});

Ext4.define("Ext4.locale.tr.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Bu alandaki değer geçersiz"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.tr.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    loadingText: "Yükleniyor ..."
});

Ext4.define("Ext4.locale.tr.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Bugün",
    minText: "Bu tarih izin verilen en küçük tarihten daha önce",
    maxText: "Bu tarih izin verilen en büyük tarihten daha sonra",
    disabledDaysText: "",
    disabledDatesText: "",
    nextText: 'Gelecek Ay (Control+Right)',
    prevText: 'Önceki Ay (Control+Left)',
    monthYearText: 'Bir ay seçiniz (Yılı artırmak/azaltmak için Control+Up/Down)',
    todayTip: "{0} (Boşluk Tuşu - Spacebar)",
    format: "d/m/Y",
    startDay: 1
});

Ext4.define("Ext4.locale.tr.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "*Tamam*",
    cancelText: "İptal"
});

Ext4.define("Ext4.locale.tr.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Sayfa",
    afterPageText: " / {0}",
    firstText: "İlk Sayfa",
    prevText: "Önceki Sayfa",
    nextText: "Sonraki Sayfa",
    lastText: "Son Sayfa",
    refreshText: "Yenile",
    displayMsg: "Gösterilen {0} - {1} / {2}",
    emptyMsg: 'Gösterilebilecek veri yok'
});

Ext4.define("Ext4.locale.tr.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Girilen verinin uzunluğu en az {0} olabilir",
    maxLengthText: "Girilen verinin uzunluğu en fazla {0} olabilir",
    blankText: "Bu alan boş bırakılamaz",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.tr.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "En az {0} girilebilir",
    maxText: "En çok {0} girilebilir",
    nanText: "{0} geçersiz bir sayıdır"
});

Ext4.define("Ext4.locale.tr.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Disabled",
    disabledDatesText: "Disabled",
    minText: "Bu tarih, {0} tarihinden daha sonra olmalıdır",
    maxText: "Bu tarih, {0} tarihinden daha önce olmalıdır",
    invalidText: "{0} geçersiz bir tarihdir - tarih formatı {1} şeklinde olmalıdır",
    format: "d/m/Y",
    altFormats: "d.m.y|d.m.Y|d/m/y|d-m-Y|d-m-y|d.m|d/m|d-m|dm|dmY|dmy|d|Y.m.d|Y-m-d|Y/m/d"
});

Ext4.define("Ext4.locale.tr.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Yükleniyor ..."
    });
});

Ext4.define("Ext4.locale.tr.form.field.VTypes", {
    override: "Ext4.form.field.VTypes",
    emailText: 'Bu alan "user@example.com" şeklinde elektronik posta formatında olmalıdır',
    urlText: 'Bu alan "http://www.example.com" şeklinde URL adres formatında olmalıdır',
    alphaText: 'Bu alan sadece harf ve _ içermeli',
    alphanumText: 'Bu alan sadece harf, sayı ve _ içermeli'
});

Ext4.define("Ext4.locale.tr.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Lütfen bu bağlantı için gerekli URL adresini giriniz:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Kalın(Bold) (Ctrl+B)',
                text: 'Seçili yazıyı kalın yapar.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'İtalik(Italic) (Ctrl+I)',
                text: 'Seçili yazıyı italik yapar.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Alt Ã‡izgi(Underline) (Ctrl+U)',
                text: 'Seçili yazının altını çizer.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Fontu büyült',
                text: 'Yazı fontunu büyütür.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Fontu küçült',
                text: 'Yazı fontunu küçültür.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Arka Plan Rengi',
                text: 'Seçili yazının arka plan rengini değiştir.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Yazı Rengi',
                text: 'Seçili yazının rengini değiştir.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Sola Daya',
                text: 'Yazıyı sola daya.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Ortala',
                text: 'Yazıyı editörde ortala.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Sağa daya',
                text: 'Yazıyı sağa daya.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Noktalı Liste',
                text: 'Noktalı listeye başla.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Numaralı Liste',
                text: 'Numaralı lisyeye başla.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Web Adresi(Hyperlink)',
                text: 'Seçili yazıyı web adresi(hyperlink) yap.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Kaynak kodu Düzenleme',
                text: 'Kaynak kodu düzenleme moduna geç.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.tr.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Artan sırada sırala",
    sortDescText: "Azalan sırada sırala",
    lockText: "Kolonu kilitle",
    unlockText: "Kolon kilidini kaldır",
    columnsText: "Kolonlar"
});

Ext4.define("Ext4.locale.tr.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(Yok)',
    groupByText: 'Bu Alana Göre Grupla',
    showGroupsText: 'Gruplar Halinde Göster'
});

Ext4.define("Ext4.locale.tr.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Ad",
    valueText: "Değer",
    dateFormat: "d/m/Y"
});

Ext4.define("Ext4.locale.tr.window.MessageBox", {
    override: "Ext4.window.MessageBox",
    buttonText: {
        ok: "Tamam",
        cancel: "İptal",
        yes: "Evet",
        no: "Hayır"
    }    
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.tr.Component", {	
    override: "Ext4.Component"
});

