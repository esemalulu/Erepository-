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
 * Pedoman translasi:
 * http://id.wikisource.org/wiki/Panduan_Pembakuan_Istilah,_Pelaksanaan_Instruksi_Presiden_Nomor_2_Tahun_2001_Tentang_Penggunaan_Komputer_Dengan_Aplikasi_Komputer_Berbahasa_Indonesia
 * Original source: http://vlsm.org/etc/baku-0.txt
 * by Farid GS
 * farid [at] pulen.net
 * 10:13 04 Desember 2007
 * Indonesian Translations
 */
Ext4.onReady(function() {
    var cm = Ext4.ClassManager,
        exists = Ext4.Function.bind(cm.get, cm);

    if (Ext4.Updater) {
        Ext4.Updater.defaults.indicatorText = '<div class="loading-indicator">Pemuatan...</div>';
    }
    
    if (Ext4.Date) {
        Ext4.Date.monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        Ext4.Date.getShortMonthName = function(month) {
            return Ext4.Date.monthNames[month].substring(0, 3);
        };

        Ext4.Date.monthNumbers = {
            Jan: 0,
            Feb: 1,
            Mar: 2,
            Apr: 3,
            Mei: 4,
            Jun: 5,
            Jul: 6,
            Agu: 7,
            Sep: 8,
            Okt: 9,
            Nov: 10,
            Des: 11
        };

        Ext4.Date.getMonthNumber = function(name) {
            return Ext4.Date.monthNumbers[name.substring(0, 1).toUpperCase() + name.substring(1, 3).toLowerCase()];
        };

        Ext4.Date.dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

        Ext4.Date.getShortDayName = function(day) {
            return Ext4.Date.dayNames[day].substring(0, 3);
        };
    }
    if (Ext4.MessageBox) {
        Ext4.MessageBox.buttonText = {
            ok: "OK",
            cancel: "Batal",
            yes: "Ya",
            no: "Tidak"
        };
    }

    if (Ext4.util && Ext4.util.Format) {
        Ext4.apply(Ext4.util.Format, {
            thousandSeparator: '.',
            decimalSeparator: ',',
            currencySign: 'Rp',
            // Indonesian Rupiah
            dateFormat: 'd/m/Y'
        });
    }
    
});

Ext4.define("Ext4.locale.id.view.View", {
    override: "Ext4.view.View",
    emptyText: ""
});

Ext4.define("Ext4.locale.id.grid.plugin.DragDrop", {
    override: "Ext4.grid.plugin.DragDrop",
    dragText: "{0} baris terpilih"
});

Ext4.define("Ext4.locale.id.tab.Tab", {
    override: "Ext4.tab.Tab",
    closeText: "Tutup tab ini"
});

Ext4.define("Ext4.locale.id.form.field.Base", {
    override: "Ext4.form.field.Base",
    invalidText: "Isian belum benar"
});

// changing the msg text below will affect the LoadMask
Ext4.define("Ext4.locale.id.view.AbstractView", {
    override: "Ext4.view.AbstractView",
    loadingText: "Pemuatan..."
});

Ext4.define("Ext4.locale.id.picker.Date", {
    override: "Ext4.picker.Date",
    todayText: "Hari ini",
    minText: "Tanggal ini sebelum batas tanggal minimal",
    maxText: "Tanggal ini setelah batas tanggal maksimal",
    disabledDaysText: "",
    disabledDatesText: "",
    nextText: 'Bulan Berikut (Kontrol+Kanan)',
    prevText: 'Bulan Sebelum (Kontrol+Kiri)',
    monthYearText: 'Pilih bulan (Kontrol+Atas/Bawah untuk pindah tahun)',
    todayTip: "{0} (Spacebar)",
    format: "d/m/y",
    startDay: 1
});

Ext4.define("Ext4.locale.id.picker.Month", {
    override: "Ext4.picker.Month",
    okText: "&#160;OK&#160;",
    cancelText: "Batal"
});

Ext4.define("Ext4.locale.id.toolbar.Paging", {
    override: "Ext4.PagingToolbar",
    beforePageText: "Hal",
    afterPageText: "dari {0}",
    firstText: "Hal. Pertama",
    prevText: "Hal. Sebelum",
    nextText: "Hal. Berikut",
    lastText: "Hal. Akhir",
    refreshText: "Segarkan",
    displayMsg: "Menampilkan {0} - {1} dari {2}",
    emptyMsg: 'Data tidak ditemukan'
});

Ext4.define("Ext4.locale.id.form.field.Text", {
    override: "Ext4.form.field.Text",
    minLengthText: "Panjang minimal untuk field ini adalah {0}",
    maxLengthText: "Panjang maksimal untuk field ini adalah {0}",
    blankText: "Field ini wajib diisi",
    regexText: "",
    emptyText: null
});

Ext4.define("Ext4.locale.id.form.field.Number", {
    override: "Ext4.form.field.Number",
    minText: "Nilai minimal untuk field ini adalah {0}",
    maxText: "Nilai maksimal untuk field ini adalah {0}",
    nanText: "{0} bukan angka"
});

Ext4.define("Ext4.locale.id.form.field.Date", {
    override: "Ext4.form.field.Date",
    disabledDaysText: "Disfungsi",
    disabledDatesText: "Disfungsi",
    minText: "Tanggal dalam field ini harus setelah {0}",
    maxText: "Tanggal dalam field ini harus sebelum {0}",
    invalidText: "{0} tanggal salah - Harus dalam format {1}",
    format: "d/m/y",
    //altFormats        : "m/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d"
    altFormats: "d/m/Y|d-m-y|d-m-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d"
});

Ext4.define("Ext4.locale.id.form.field.ComboBox", {
    override: "Ext4.form.field.ComboBox",
    valueNotFoundText: undefined
}, function() {
    Ext4.apply(Ext4.form.field.ComboBox.prototype.defaultListConfig, {
        loadingText: "Pemuatan..."
    });
});

Ext4.define("Ext4.locale.id.form.field.VTypes", {
    override: "Ext4.form.field.VTypes",
    emailText: 'Field ini harus dalam format email seperti "user@example.com"',
    urlText: 'Field ini harus dalam format URL seperti "http:/' + '/www.example.com"',
    alphaText: 'Field ini harus terdiri dari huruf dan _',
    alphanumText: 'Field ini haris terdiri dari huruf, angka dan _'
});

Ext4.define("Ext4.locale.id.form.field.HtmlEditor", {
    override: "Ext4.form.field.HtmlEditor",
    createLinkText: 'Silakan masukkan URL untuk tautan:'
}, function() {
    Ext4.apply(Ext4.form.field.HtmlEditor.prototype, {
        buttonTips: {
            bold: {
                title: 'Tebal (Ctrl+B)',
                text: 'Buat tebal teks terpilih',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            italic: {
                title: 'Miring (CTRL+I)',
                text: 'Buat miring teks terpilih',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            underline: {
                title: 'Garisbawah (CTRl+U)',
                text: 'Garisbawahi teks terpilih',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            increasefontsize: {
                title: 'Perbesar teks',
                text: 'Perbesar ukuran fonta',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            decreasefontsize: {
                title: 'Perkecil teks',
                text: 'Perkecil ukuran fonta',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            backcolor: {
                title: 'Sorot Warna Teks',
                text: 'Ubah warna latar teks terpilih',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            forecolor: {
                title: 'Warna Fonta',
                text: 'Ubah warna teks terpilih',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyleft: {
                title: 'Rata Kiri',
                text: 'Ratakan teks ke kiri',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifycenter: {
                title: 'Rata Tengah',
                text: 'Ratakan teks ke tengah editor',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            justifyright: {
                title: 'Rata Kanan',
                text: 'Ratakan teks ke kanan',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertunorderedlist: {
                title: 'Daftar Bulet',
                text: 'Membuat daftar berbasis bulet',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            insertorderedlist: {
                title: 'Daftar Angka',
                text: 'Membuat daftar berbasis angka',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            createlink: {
                title: 'Hipertaut',
                text: 'Buat teks terpilih sebagai Hipertaut',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            },
            sourceedit: {
                title: 'Edit Kode Sumber',
                text: 'Pindah dalam mode kode sumber',
                cls: Ext4.baseCSSPrefix + 'html-editor-tip'
            }
        }
    });
});

Ext4.define("Ext4.locale.id.grid.header.Container", {
    override: "Ext4.grid.header.Container",
    sortAscText: "Urut Naik",
    sortDescText: "Urut Turun",
    lockText: "Kancing Kolom",
    unlockText: "Lepas Kunci Kolom",
    columnsText: "Kolom"
});

Ext4.define("Ext4.locale.id.grid.GroupingFeature", {
    override: "Ext4.grid.GroupingFeature",
    emptyGroupText: '(Kosong)',
    groupByText: 'Kelompokkan Berdasar Field Ini',
    showGroupsText: 'Tampil Dalam Kelompok'
});

Ext4.define("Ext4.locale.id.grid.PropertyColumnModel", {
    override: "Ext4.grid.PropertyColumnModel",
    nameText: "Nama",
    valueText: "Nilai",
    dateFormat: "d/m/Y"
});

Ext4.define("Ext4.locale.id.window.MessageBox", {
    override: "Ext4.window.MessageBox",
    buttonText: {
        ok: "OK",
        cancel: "Batal",
        yes: "Ya",
        no: "Tidak"
    }    
});

// This is needed until we can refactor all of the locales into individual files
Ext4.define("Ext4.locale.id.Component", {	
    override: "Ext4.Component"
});

