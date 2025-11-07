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
 * Russian translation
 * By ZooKeeper (utf-8 encoding)
 * 6 November 2007
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Идет загрузка...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

        Ext4.Date.shortMonthNames = ["Янв", "Февр", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сент", "Окт", "Нояб", "Дек"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.shortMonthNames[month];
        };

        Ext4.Date.monthNumbers = {
            'Янв': 0,
            'Фев': 1,
            'Мар': 2,
            'Апр': 3,
            'Май': 4,
            'Июн': 5,
            'Июл': 6,
            'Авг': 7,
            'Сен': 8,
            'Окт': 9,
            'Ноя': 10,
            'Дек': 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 3);
        };
    }
    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Отмена",
            yes: "Да",
            no: "Нет"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u0440\u0443\u0431',
            // Russian Ruble
            dateFormat: 'd.m.Y'
        });
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'Это поле должно содержать адрес электронной почты в формате "user@example.com"',
            urlText: 'Это поле должно содержать URL в формате "http:/' + '/www.example.com"',
            alphaText: 'Это поле должно содержать только латинские буквы и символ подчеркивания "_"',
            alphanumText: 'Это поле должно содержать только латинские буквы, цифры и символ подчеркивания "_"'
        });
    }
});

Ext4.define("Ext4.locale.ru.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.ru.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} выбранных строк"
});

Ext4.define("Ext4.locale.ru.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Закрыть эту вкладку"
});

Ext4.define("Ext4.locale.ru.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Значение в этом поле неверное"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.ru.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "Загрузка..."
});

Ext4.define("Ext4.locale.ru.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Сегодня",
    minText: "Эта дата раньше минимальной даты",
    maxText: "Эта дата позже максимальной даты",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Следующий месяц (Control+Вправо)',
    prevText: 'Предыдущий месяц (Control+Влево)',
    monthYearText: 'Выбор месяца (Control+Вверх/Вниз для выбора года)',
    todayTip: "{0} (Пробел)",
    format: "d.m.y",
    startDay: 1
});

Ext4.define("Ext4.locale.ru.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Отмена"
});

Ext4.define("Ext4.locale.ru.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Страница",
    afterPageText: "из {0}",
    firstText: "Первая страница",
    prevText: "Предыдущая страница",
    nextText: "Следующая страница",
    lastText: "Последняя страница",
    refreshText: "Обновить",
    displayMsg: "Отображаются записи с {0} по {1}, всего {2}",
    emptyMsg: 'Нет данных для отображения'
});

Ext4.define("Ext4.locale.ru.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Минимальная длина этого поля {0}",
    maxLengthText: "Максимальная длина этого поля {0}",
    blankText: "Это поле обязательно для заполнения",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.ru.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Значение этого поля не может быть меньше {0}",
    maxText: "Значение этого поля не может быть больше {0}",
    nanText: "{0} не является числом",
    negativeText: "Значение не может быть отрицательным"
});

Ext4.define("Ext4.locale.ru.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Не доступно",
    disabledDatesText: "Не доступно",
    minText: "Дата в этом поле должна быть позде {0}",
    maxText: "Дата в этом поле должна быть раньше {0}",
    invalidText: "{0} не является правильной датой - дата должна быть указана в формате {1}",
    format: "d.m.y",
    altFormats: "d.m.y|d/m/Y|d-m-y|d-m-Y|d/m|d-m|dm|dmy|dmY|d|Y-m-d"
});

Ext4.define("Ext4.locale.ru.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Загрузка..."
    });
});

Ext4.define("Ext4.locale.ru.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Пожалуйста введите адрес:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Полужирный (Ctrl+B)',
                text: 'Применение полужирного начертания к выделенному тексту.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Курсив (Ctrl+I)',
                text: 'Применение курсивного начертания к выделенному тексту.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Подчёркнутый (Ctrl+U)',
                text: 'Подчёркивание выделенного текста.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Увеличить размер',
                text: 'Увеличение размера шрифта.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Уменьшить размер',
                text: 'Уменьшение размера шрифта.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Заливка',
                text: 'Изменение цвета фона для выделенного текста или абзаца.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Цвет текста',
                text: 'Измение цвета текста.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Выровнять текст по левому краю',
                text: 'Выровнивание текста по левому краю.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'По центру',
                text: 'Выровнивание текста по центру.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Выровнять текст по правому краю',
                text: 'Выровнивание текста по правому краю.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Маркеры',
                text: 'Начать маркированный список.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Нумерация',
                text: 'Начать нумернованный список.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Вставить гиперссылку',
                text: 'Создание ссылки из выделенного текста.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Исходный код',
                text: 'Переключиться на исходный код.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.ru.form.Basic", {
    override: "Ext4.form.Basic",
    waitTitle: "Пожалуйста подождите..."
});

Ext4.define("Ext4.locale.ru.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Сортировать по возрастанию",
    sortDescText: "Сортировать по убыванию",
    lockText: "Закрепить столбец",
    unlockText: "Снять закрепление столбца",
    columnsText: "Столбцы"
});

Ext4.define("Ext4.locale.ru.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(Пусто)',
    groupByText: 'Группировать по этому полю',
    showGroupsText: 'Отображать по группам'
});

Ext4.define("Ext4.locale.ru.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Название",
    valueText: "Значение",
    dateFormat: "d.m.Y"
});

Ext4.define("Ext4.locale.ru.SplitLayoutRegion", {
    override: "Ext4.SplitLayoutRegion",
    splitTip: "Тяните для изменения размера.",
    collapsibleSplitTip: "Тяните для изменения размера. Двойной щелчок спрячет панель."
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.ru.Component", {	
    override: "Ext4.Component"
});

