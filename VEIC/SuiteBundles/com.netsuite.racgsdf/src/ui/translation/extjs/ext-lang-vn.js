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
 * List compiled by mystix on the extjs.com forums.
 * Thank you Mystix!
 * Vietnamese translation
 * By bpmtri
 * 12-April-2007 04:06PM
 */
Ext4.onReady(function() {

    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

        Ext4.Date.dayNames = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
        
        Ext4.Date.monthNumbers = {
            "Tháng 1": 0,
            "Tháng 2": 1,
            "Tháng 3": 2,
            "Tháng 4": 3,
            "Tháng 5": 4,
            "Tháng 6": 5,
            "Tháng 7": 6,
            "Tháng 8": 7,
            "Tháng 9": 8,
            "Tháng 10": 9,
            "Tháng 11": 10,
            "Tháng 12": 11,
        };
        
        Ext4.Date.getShortMonthName = function(month){
            return Ext4.Date.monthNames[month];
        };
        
        Ext4.Date.getMonthNumber = function(name){
            return Ext4.Date.monthNumbers[name];    
        };
        
        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day];
        }
    }

    if (Ext4.util && Ext4.util.Format) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: '\u20ab',
            // Vietnamese Dong
            dateFormat: 'd/m/Y'
        });
    }
});

Ext4.define("Ext4.locale.vn.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.vn.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} dòng được chọn"
});

Ext4.define("Ext4.locale.vn.tab.Tab", {
    override: "Ext4.tab.Tab",
    closeText: "Đóng thẻ này"
});

Ext4.define("Ext4.locale.vn.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Giá trị của ô này không hợp lệ."
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.vn.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    loadingText: "Đang tải..."
});

Ext4.define("Ext4.locale.vn.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Hôm nay",
    minText: "Ngày này nhỏ hơn ngày nhỏ nhất",
    maxText: "Ngày này lớn hơn ngày lớn nhất",
    disabledDaysText: "",
    disabledDatesText: "",
    nextText: 'Tháng sau (Control+Right)',
    prevText: 'Tháng trước (Control+Left)',
    monthYearText: 'Chọn một tháng (Control+Up/Down để thay đổi năm)',
    todayTip: "{0} (Spacebar - Phím trắng)",
    format: "d/m/y"
});

Ext4.define("Ext4.locale.vn.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Trang",
    afterPageText: "of {0}",
    firstText: "Trang đầu",
    prevText: "Trang trước",
    nextText: "Trang sau",
    lastText: "Trang cuối",
    refreshText: "Tải lại",
    displayMsg: "Hiển thị {0} - {1} của {2}",
    emptyMsg: 'Không có dữ liệu để hiển thị'
});

Ext4.define("Ext4.locale.vn.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Chiều dài tối thiểu của ô này là {0}",
    maxLengthText: "Chiều dài tối đa của ô này là {0}",
    blankText: "Ô này cần phải nhập giá trị",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.vn.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Giá trị nhỏ nhất của ô này là {0}",
    maxText: "Giá trị lớn nhất của ô này là  {0}",
    nanText: "{0} hông phải là một số hợp lệ"
});

Ext4.define("Ext4.locale.vn.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Vô hiệu",
    disabledDatesText: "Vô hiệu",
    minText: "Ngày nhập trong ô này phải sau ngày {0}",
    maxText: "Ngày nhập trong ô này phải trước ngày {0}",
    invalidText: "{0} không phải là một ngày hợp lệ - phải có dạng {1}",
    format: "d/m/y"
});

Ext4.define("Ext4.locale.vn.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Đang tải..."
    });
});

Ext4.define("Ext4.locale.vn.form.field.VTypes", {
    override: "Ext4.form.field.VTypes",
    emailText: 'Giá trị của ô này phải là một địa chỉ email có dạng như "ten@abc.com"',
    urlText: 'Giá trị của ô này phải là một địa chỉ web(URL) hợp lệ, có dạng như "http:/' + '/www.example.com"',
    alphaText: 'Ô này chỉ được nhập các kí tự và gạch dưới(_)',
    alphanumText: 'Ô này chỉ được nhập các kí tự, số và gạch dưới(_)'
});

Ext4.define("Ext4.locale.vn.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Tăng dần",
    sortDescText: "Giảm dần",
    lockText: "Khóa cột",
    unlockText: "Bỏ khóa cột",
    columnsText: "Các cột"
});

Ext4.define("Ext4.locale.vn.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Tên",
    valueText: "Giá trị",
    dateFormat: "j/m/Y"
});

Ext4.define("Ext4.locale.vn.window.MessageBox", {
    override: "Ext4.window.MessageBox",
    buttonText: {
        ok: "Đồng ý",
        cancel: "Hủy bỏ",
        yes: "Có",
        no: "Không"
    }    
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.vn.Component", {	
    override: "Ext4.Component"
});

