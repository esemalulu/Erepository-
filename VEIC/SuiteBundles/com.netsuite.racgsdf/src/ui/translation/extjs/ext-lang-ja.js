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
 * Japanese translation
 * By tyama
 * 04-08-2007, 05:49 AM
 *
 * update based on English Translations by Condor (8 Aug 2008)
 * By sakuro (30 Aug 2008)
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm),
        parseCodes;

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">読み込み中...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

        Ext4.Date.getShortMonthName = function(month) {
            return "" + (month + 1);
        };

        Ext4.Date.monthNumbers = {
            "1": 0,
            "2": 1,
            "3": 2,
            "4": 3,
            "5": 4,
            "6": 5,
            "7": 6,
            "8": 7,
            "9": 8,
            "10": 9,
            "11": 10,
            "12": 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, name.length - 1)];
            // or simply parseInt(name.substring(0, name.length - 1)) - 1
        };

        Ext4.Date.dayNames = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 1); // just remove "曜日" suffix
        };

        Ext4.Date.formatCodes.a = "(this.getHours() < 12 ? '午前' : '午後')";
        Ext4.Date.formatCodes.A = "(this.getHours() < 12 ? '午前' : '午後')"; // no case difference
        
        parseCodes = {
            g: 1,
            c: "if (/(午前)/i.test(results[{0}])) {\n"
                + "if (!h || h == 12) { h = 0; }\n"
                + "} else { if (!h || h < 12) { h = (h || 0) + 12; }}",
            s: "(午前|午後)",
            calcAtEnd: true
        };

        Ext4.Date.parseCodes.a = Ext4.Date.parseCodes.A = parseCodes;
    }

    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "キャンセル",
            yes: "はい",
            no: "いいえ"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: ',',
            decimalSeparator: '.',
            currencySign: '\u00a5',
            // Japanese Yen
            dateFormat: 'Y/m/d'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'メールアドレスを"user@example.com"の形式で入力してください。',
            urlText: 'URLを"http:/' + '/www.example.com"の形式で入力してください。',
            alphaText: '半角英字と"_"のみです。',
            alphanumText: '半角英数と"_"のみです。'
        });
    }
});

Ext4.define("Ext4.locale.ja.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.ja.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} 行選択"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.ja.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "読み込み中..."
});

Ext4.define("Ext4.locale.ja.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "今日",
    minText: "選択した日付は最小値以下です。",
    maxText: "選択した日付は最大値以上です。",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: '次月へ (コントロール+右)',
    prevText: '前月へ (コントロール+左)',
    monthYearText: '月選択 (コントロール+上/下で年移動)',
    todayTip: "{0} (スペースキー)",
    format: "Y/m/d",
    startDay: 0,
    ariaTitle: '{0}',
    ariaTitleDateFormat: 'Y\u5e74m\u6708d\u65e5',
    longDayFormat: 'Y\u5e74m\u6708d\u65e5',
    monthYearFormat: 'Y\u5e74m\u6708'
});

Ext4.define("Ext4.locale.ja.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "キャンセル"
});

Ext4.define("Ext4.locale.ja.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "ページ",
    afterPageText: "/ {0}",
    firstText: "最初のページ",
    prevText: "前のページ",
    nextText: "次のページ",
    lastText: "最後のページ",
    refreshText: "更新",
    displayMsg: "{2} 件中 {0} - {1} を表示",
    emptyMsg: '表示するデータがありません。'
});

Ext4.define("Ext4.locale.ja.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "フィールドの値が不正です。"
});

Ext4.define("Ext4.locale.ja.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "このフィールドの最小値は {0} です。",
    maxLengthText: "このフィールドの最大値は {0} です。",
    blankText: "必須項目です。",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.ja.form.field.Number", {
    override: "Ext4.form.field.Number",
    decimalSeparator: ".",
    decimalPrecision: 2,
    minText: "このフィールドの最小値は {0} です。",
    maxText: "このフィールドの最大値は {0} です。",
    nanText: "{0} は数値ではありません。"
});

Ext4.define("Ext4.locale.ja.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "無効",
    disabledDatesText: "無効",
    minText: "このフィールドの日付は、 {0} 以降の日付に設定してください。",
    maxText: "このフィールドの日付は、 {0} 以前の日付に設定してください。",
    invalidText: "{0} は間違った日付入力です。 - 入力形式は「{1}」です。",
    format: "Y/m/d",
    altFormats: "y/m/d|m/d/y|m/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d"
});

Ext4.define("Ext4.locale.ja.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "読み込み中..."
    });
});

Ext4.define("Ext4.locale.ja.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'リンクのURLを入力してください:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: '太字 (コントロール+B)',
                text: '選択テキストを太字にします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: '斜体 (コントロール+I)',
                text: '選択テキストを斜体にします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: '下線 (コントロール+U)',
                text: '選択テキストに下線を引きます。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: '文字を大きく',
                text: 'フォントサイズを大きくします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: '文字を小さく',
                text: 'フォントサイズを小さくします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: '文字のハイライト',
                text: '選択テキストの背景色を変更します。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: '文字の色',
                text: '選択テキストの色を変更します。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: '左揃え',
                text: 'テキストを左揃えにします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: '中央揃え',
                text: 'テキストを中央揃えにします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: '右揃え',
                text: 'テキストを右揃えにします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: '番号なし箇条書き',
                text: '番号なし箇条書きを開始します。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: '番号付き箇条書き',
                text: '番号付き箇条書きを開始します。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'ハイパーリンク',
                text: '選択テキストをハイパーリンクにします。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'ソース編集',
                text: 'ソース編集モードに切り替えます。',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.ja.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "昇順",
    sortDescText: "降順",
    columnsText: "カラム"
});

Ext4.define("Ext4.locale.ja.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(なし)',
    groupByText: 'このカラムでグルーピング',
    showGroupsText: 'グルーピング'
});

Ext4.define("Ext4.locale.ja.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "名称",
    valueText: "値",
    dateFormat: "Y/m/d"
});

Ext4.define("Ext4.locale.ja.form.field.Time", {
    override: "Ext4.form.field.Time",
    minText: "このフィールドの時刻は、 {0} 以降の時刻に設定してください。",
    maxText: "このフィールドの時刻は、 {0} 以前の時刻に設定してください。",
    invalidText: "{0} は間違った時刻入力です。",
    format: "g:i A",
    altFormats: "g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H"
});

Ext4.define("Ext4.locale.ja.form.CheckboxGroup", {
    override: "Ext4.form.CheckboxGroup",
    blankText: "このグループから最低１つのアイテムを選択しなければなりません。"
});

Ext4.define("Ext4.locale.ja.form.RadioGroup", {
    override: "Ext4.form.RadioGroup",
    blankText: "このグループから１つのアイテムを選択しなければなりません。"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.ja.Component", {	
    override: "Ext4.Component"
});

