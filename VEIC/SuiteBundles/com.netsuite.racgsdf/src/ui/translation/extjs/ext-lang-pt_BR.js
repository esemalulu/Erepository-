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
 * Portuguese/Brazil Translation by Weber Souza
 * 08 April 2007
 * Updated by Allan Brazute Alves (EthraZa)
 * 06 September 2007
 * Updated by Leonardo Lima
 * 05 March 2008
 * Updated by Juliano Tarini (jtarini)
 * 22 April 2008
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Carregando...</div>';
    }

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.monthNames[month].substring(0, 3);
        };

        Ext4.Date.monthNumbers = {
            Jan: 0,
            Fev: 1,
            Mar: 2,
            Abr: 3,
            Mai: 4,
            Jun: 5,
            Jul: 6,
            Ago: 7,
            Set: 8,
            Out: 9,
            Nov: 10,
            Dez: 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    }

    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Cancelar",
            yes: "Sim",
            no: "Não"
        };
    }

    if (exists('Ext4.util.Format')) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: ',',
            decimalSeparator: '.',
            currencySign: 'R$',
            // Brazilian Real
            dateFormat: 'd/m/Y'
        });
        Ext4.util.Format.brMoney = Ext4.util.Format.currency;
    }

    if (exists('Ext4.form.field.VTypes')) {
        Ext4.apply(Ext4.form.field.VTypes, {
            emailText: 'Este campo deve ser um endereç;o de e-mail válido, no formato "usuario@dominio.com.br"',
            urlText: 'Este campo deve ser uma URL no formato "http:/' + '/www.dominio.com.br"',
            alphaText: 'Este campo deve conter apenas letras e _',
            alphanumText: 'Este campo deve conter apenas letras, números e _'
        });
    }
});

Ext4.define("Ext4.locale.pt_BR.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.pt_BR.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} linha(s) selecionada(s)"
});

Ext4.define("Ext4.locale.pt_BR.TabPanelItem", {
    override: "Ext4.TabPanelItem",
    closeText: "Fechar"
});

Ext4.define("Ext4.locale.pt_BR.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "O valor para este campo é inválido"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.pt_BR.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    msg: "Carregando..."
});

Ext4.define("Ext4.locale.pt_BR.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Hoje",
    minText: "Esta data é anterior a menor data",
    maxText: "Esta data é posterior a maior data",
    disabledDaysText: "",
    disabledDatesText: "",
    monthNames: Ext4.Date.monthNames,
    dayNames: Ext4.Date.dayNames,
    nextText: 'Próximo Mês (Control+Direita)',
    prevText: 'Mês Anterior (Control+Esquerda)',
    monthYearText: 'Escolha um Mês (Control+Cima/Baixo para mover entre os anos)',
    todayTip: "{0} (Espaç;o)",
    format: "d/m/Y",
    startDay: 0
});

Ext4.define("Ext4.locale.pt_BR.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Cancelar"
});

Ext4.define("Ext4.locale.pt_BR.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Página",
    afterPageText: "de {0}",
    firstText: "Primeira Página",
    prevText: "Página Anterior",
    nextText: "Próxima Página",
    lastText: "Última Página",
    refreshText: "Atualizar",
    displayMsg: "<b>{0} à {1} de {2} registro(s)</b>",
    emptyMsg: 'Sem registros para exibir'
});

Ext4.define("Ext4.locale.pt_BR.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "O tamanho mínimo para este campo é {0}",
    maxLengthText: "O tamanho máximo para este campo é {0}",
    blankText: "Este campo é obrigatório.",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.pt_BR.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "O valor mínimo para este campo é {0}",
    maxText: "O valor máximo para este campo é {0}",
    nanText: "{0} não é um número válido"
});

Ext4.define("Ext4.locale.pt_BR.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Desabilitado",
    disabledDatesText: "Desabilitado",
    minText: "A data deste campo deve ser posterior a {0}",
    maxText: "A data deste campo deve ser anterior a {0}",
    invalidText: "{0} não é uma data válida - deve ser informado no formato {1}",
    format: "d/m/Y"
});

Ext4.define("Ext4.locale.pt_BR.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Carregando..."
    });
});

Ext4.define("Ext4.locale.pt_BR.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Por favor, entre com a URL do link:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Negrito (Ctrl+B)',
                text: 'Deixa o texto selecionado em negrito.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Itálico (Ctrl+I)',
                text: 'Deixa o texto selecionado em itálico.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Sublinhado (Ctrl+U)',
                text: 'Sublinha o texto selecionado.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Aumentar Texto',
                text: 'Aumenta o tamanho da fonte.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Diminuir Texto',
                text: 'Diminui o tamanho da fonte.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Cor de Fundo',
                text: 'Muda a cor do fundo do texto selecionado.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Cor da Fonte',
                text: 'Muda a cor do texto selecionado.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Alinhar à Esquerda',
                text: 'Alinha o texto à esquerda.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Centralizar Texto',
                text: 'Centraliza o texto no editor.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Alinhar à Direita',
                text: 'Alinha o texto à direita.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Lista com Marcadores',
                text: 'Inicia uma lista com marcadores.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Lista Numerada',
                text: 'Inicia uma lista numerada.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Link',
                text: 'Transforma o texto selecionado em um link.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Editar Fonte',
                text: 'Troca para o modo de edição de código fonte.',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.pt_BR.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Ordem Ascendente",
    sortDescText: "Ordem Descendente",
    lockText: "Bloquear Coluna",
    unlockText: "Desbloquear Coluna",
    columnsText: "Colunas"
});

Ext4.define("Ext4.locale.pt_BR.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Nome",
    valueText: "Valor",
    dateFormat: "d/m/Y"
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.pt_BR.Component", {	
    override: "Ext4.Component"
});

