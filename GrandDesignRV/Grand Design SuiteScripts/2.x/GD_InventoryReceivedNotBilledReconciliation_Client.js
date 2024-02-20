/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @NAmdConfig ./GD_InventoryReceivedNotBilledReconciliation_Config.json
 */
define(['N/runtime', 'N/url', 'jquery', 'datatables.net', 'fixedheader', 'datatables.net-buttons', 'buttons', 'lzstring'],

function(runtime, url, jquery, datatables, fixedHeader, buttonsDT, buttons, LZString) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(context) {
        window.ss$ = jquery.noConflict(true);
        window.context = context;

        // Export to CSV code inspired by:
        // https://datatables.net/forums/discussion/comment/117061/#Comment_117061
        window.exportTableToCSV = function($table, filename) {
            var initialPage = itemTable.page();
            var pageLength = itemTable.page.len();
            // Set a larger page length temporarily to speed things up
            // If we turn pagination off completely we use too much memory
            itemTable.page.len(500).draw();
            var pages = itemTable.page.info().pages;

            var csv = '"';

            // Loop over pages and build CSV one page at a time
            for (var page = 0; page < pages; page++) {
                // Change pages
                itemTable.page(page).draw('page');

                // Find the parent table
                var $newTable = $table.find('tr:has(td,th)');
                // Filter out the tr that wraps the child table
                var newTable2 = $newTable.filter(function() {
                     return (this.childElementCount != 1);
                });

                var $rows = newTable2;
                // Temporary delimiter characters unlikely to be typed by keyboard
                // This is to avoid accidentally splitting the actual contents
                var tmpColDelim = String.fromCharCode(11); // vertical tab character
                var tmpRowDelim = String.fromCharCode(0); // null character

                var colDelim = (filename.indexOf("xls") != -1) ? '"\t"' : '","';
                var rowDelim = '"\r\n"';

                // Grab text from table into CSV formatted string
                var tempRowArray = [];
                // If we're not on the first page, we don't want to duplicate the
                // header row, so skip the first row
                for (var i = page == 0 ? 0 : 1; i < $rows.length; i++) {
                    var $row = ss$($rows[i]);
                    // TODO I don't think we need the selectors in here anymore
                    var $cols = $row.find('td:not(.hidden),th:not(.hidden)');

                    // Indent the Child Table one cell
                    var rowText = '';
                    if (i != 0 && ss$($cols[0]).text() != 'Detail')
                        rowText = String.fromCharCode(11)

                    rowText += $cols.map(function (j, col) {
                        var $col = ss$(col);
                        var text = $col.text();
                        // Unindent parent rows one cell to hide the Detail column
                        if (text == '' || text == 'Detail')
                            return null;

                        // Escape double quotes
                        return text.replace('"', '""');
                    }).get().join(tmpColDelim);

                    tempRowArray.push(rowText);
                }

                // TODO Could the split/join be replaced by a .replace?
                csv += tempRowArray.join(rowDelim).split(tmpColDelim).join(colDelim) + rowDelim;
            }

            csv += '"';

            download_csv(csv, filename);
            itemTable.page.len(pageLength).draw();
            itemTable.page(initialPage);
        };

        window.download_csv = function (csv, filename) {
            var csvFile;
            var downloadLink;

            // CSV FILE
            csvFile = new Blob([csv], {type: "text/csv"});

            // Download link
            downloadLink = document.createElement("a");

            // File name
            downloadLink.download = filename;

            // We have to create a link to the file
            downloadLink.href = window.URL.createObjectURL(csvFile);

            // Make sure that the link is not displayed
            downloadLink.style.display = "none";

            // Add the link to your DOM
            document.body.appendChild(downloadLink);

            // Click the link
            downloadLink.click();
        }

        ss$(document).ready(function() {
            window.stringify = function(row) {
                console.log(row)
                return JSON.stringify(row);
            };
        });
    }

    function refresh() {
        ss$('#custpage_viewreport').hide();
        ss$('#tdbody_custpage_viewreport').hide();
        ss$('.uir-button-menu-divider').hide();
        var link = url.resolveScript({
            scriptId: 'customscriptgd_invrecvnotbillrec_restlet',
            deploymentId: 'customdeploygd_invrecvnotbillrec_restlet',
        });
        ss$.ajax({
            url: link + "&" + new Date().getTime(),
            data: {
                 custpage_pofromdate : context.currentRecord.getText('custpage_pofromdate'),
                 custpage_postingperiod : context.currentRecord.getValue('custpage_postingperiod'),
                 custpage_showdetail : context.currentRecord.getValue('custpage_showdetail'),
                 custpage_showzero : context.currentRecord.getValue('custpage_showzero'),
            },
            dataType: "text",
            success: function(data) {
                window.itemTable = ss$('#potable').DataTable({
                    dom: 'Bfrtip',
                    pageLength: 25,
                    serverSide: false,
                    data: JSON.parse(LZString.decompressFromUTF16(data)),
                    fixedHeader: { header: true, headerOffset: 90 },
                    columnDefs: [
                        { targets: [0], visible: true, title: ''},
                        { targets: [1], visible: true, title: 'PO #'},
                        { targets: [2], visible: true, title: 'Date'},
                        { targets: [3], visible: true, title: 'Amount'},
                        { targets: [4], visible: true, title: 'Total Receipts'},
                        { targets: [5], visible: true, title: 'Total Bills'},
                        { targets: [6], visible: true, title: 'Total Variance'},
                        { targets: [7], visible: true, title: 'Net $'},
                        { targets: [8], visible: false, title: 'Search Bills'},
                        { targets: [9], visible: false, title: 'Search Receipts'},
                    ],
                    columns: [
                        {
                            "className":      'details-control noselect',
                            "orderable":      false,
                            "data":           null,
                            "defaultContent": '<span class="detailbutton">Detail</span>'
                        },
                        { 'data': 'PO #' },
                        { 'data': 'Date' },
                        { 'data': 'Amount' },
                        { 'data': 'Total Receipts' },
                        { 'data': 'Total Bills' },
                        { 'data': 'Total Variance' },
                        { 'data': 'Net $' },
                        {
                            'data': 'bills',
                            'render': function (data, type, row, meta) {
                                var newData = '';
                                for (var i = 0; i < data.length; i++) {
                                    newData += data[i]['Bill #'] + data[i]['Bill Date'] + data[i]['Bill Period'] + data[i]['Bill $'];
                                }

                                return newData;
                            }
                        },
                        {
                            'data': 'receipts',
                            'render': function (data, type, row, meta) {
                                var newData = '';
                                for (var i = 0; i < data.length; i++) {
                                    newData += data[i]['Receipt #'] + data[i]['Receipt Date'] + data[i]['Receipt Period'] + data[i]['Receipt $'];
                                }

                                return newData;
                            }
                        },
                    ],
                    buttons: [
                        {
                            extend:    'csvHtml5',
                            text:      'Export CSV',
                            titleAttr: 'CSV',
                            className: 'rvs-secondary-button',
                            exportOptions: {
                                columns: ':visible',
                            },
                            action : function( e, dt, button, config ) {
                                exportTableToCSV.apply(this, [ss$('#potable'), 'export.csv']);
                            }
                        }
                    ]
                });
                
                /* Formatting function for row details - modify as you need */
                function format ( d ) {
                    var bills = d.bills.sort(function (a, b) { return parseFloat(a['Bill $']) - parseFloat(b['Bill $']) });
                    var receipts = d.receipts.sort(function (a, b) { return parseFloat(b['Receipt $']) - parseFloat(a['Receipt $']) });

                    var childHTML = '';

                    if (bills.length > 0 && receipts.length > 0) {
                        childHTML += '<table class="childtable" cellpadding="5" cellspacing="0" border="0">' +
                            '<th>Receipt #</th>' +
                            '<th>Receipt Date</th>' +
                            '<th>Receipt Period</th>' +
                            '<th>Receipt Vendor</th>' +
                            '<th>Receipt $</th>' +
                            '<th>Bill #</th>' +
                            '<th>Bill Date</th>' +
                            '<th>Bill Period</th>' +
                            '<th>Bill Vendor</th>' +
                            '<th>Bill $</th>' +
                            '<th>Net $</th>';
                        var count = Math.max.apply(null, [receipts.length, bills.length]);

                        for (var i = 0; i < count; i++) {
                            childHTML +=
                                '<tr>' +
                                    '<td>' + (receipts.length > i ? receipts[i]['Receipt #'] : '') + '</td>' +
                                    '<td>' + (receipts.length > i ? receipts[i]['Receipt Date'].toString() : '') + '</td>' +
                                    '<td>' + (receipts.length > i ? receipts[i]['Receipt Period'] : '') + '</td>' +
                                    '<td>' + (receipts.length > i ? receipts[i]['Receipt Vendor'] : '') + '</td>' +
                                    '<td>' + (receipts.length > i ? receipts[i]['Receipt $'] : '') + '</td>' +
                                    '<td>' + (bills.length > i ? bills[i]['Bill #'] : '') + '</td>' +
                                    '<td>' + (bills.length > i ? bills[i]['Bill Date'].toString() : '') + '</td>' +
                                    '<td>' + (bills.length > i ? bills[i]['Bill Period'] : '') + '</td>' +
                                    '<td>' + (bills.length > i ? bills[i]['Bill Vendor'] : '') + '</td>' +
                                    '<td>' + (bills.length > i ? bills[i]['Bill $'] : '') + '</td>' +
                                    '<td>' + (parseFloat(receipts.length > i ? receipts[i]['Receipt $'] : 0) + parseFloat(bills.length > i ? bills[i]['Bill $'] : 0)).toFixed(2) + '</td>' +
                                '</tr>';
                        }
                        childHTML += '</table>';
                    } else if (bills.length > 0) {
                        childHTML += '<table class="childtable" cellpadding="5" cellspacing="0" border="0">' +
                            '<th>Bill #</th>' +
                            '<th>Bill Date</th>' +
                            '<th>Bill Period</th>' +
                            '<th>Bill Vendor</th>' +
                            '<th>Bill $</th>';
                        for (var i = 0; i < bills.length; i++) {
                            childHTML +=
                                '<tr>' +
                                    '<td>' + bills[i]['Bill #'] + '</td>' +
                                    '<td>' + bills[i]['Bill Date'] + '</td>' +
                                    '<td>' + bills[i]['Bill Period'] + '</td>' +
                                    '<td>' + bills[i]['Bill Vendor'] + '</td>' +
                                    '<td>' + bills[i]['Bill $'] + '</td>' +
                                '</tr>';
                        }
                        childHTML += '</table>';
                    } else if (receipts.length > 0) {
                        childHTML += '<table class="childtable" cellpadding="5" cellspacing="0" border="0">' +
                            '<th>Receipt #</th>' +
                            '<th>Receipt Date</th>' +
                            '<th>Receipt Period</th>' +
                            '<th>Receipt Vendor</th>' +
                            '<th>Receipt $</th>';
                        for (var i = 0; i < receipts.length; i++) {
                            childHTML +=
                                '<tr>' +
                                    '<td>' + receipts[i]['Receipt #'] + '</td>' +
                                    '<td>' + receipts[i]['Receipt Date'] + '</td>' +
                                    '<td>' + receipts[i]['Receipt Period'] + '</td>' +
                                    '<td>' + receipts[i]['Receipt Vendor'] + '</td>' +
                                    '<td>' + receipts[i]['Receipt $'] + '</td>' +
                                '</tr>';
                        }
                        childHTML += '</table>';
                    }

                    return childHTML;
                }
                
                // Add event listener for opening and closing details
                ss$('#potable tbody').on('click', 'td.details-control', function () {
                    var tr = ss$(this).closest('tr');
                    var row = itemTable.row( tr );
                    
                    if ( row.child.isShown() ) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        row.child( format(row.data()) ).show();
                        tr.addClass('shown');
                    }
                } );

                // Handle click on "Expand All" button
                ss$('#expandall').on('click', function(){
                    // Enumerate all rows
                    window.itemTable.rows().every(function(){
                        // If row has details collapsed
                        if(!ss$(this.nodes()[0]).hasClass('shown')){
                            // Open this row
                            this.child( format(this.data()) ).show();
                            ss$(this.node()).addClass('shown');
                        }
                    });
                });

                // Handle click on "Collapse All" button
                ss$('#collapseall').on('click', function(){
                    // Enumerate all rows
                    window.itemTable.rows().every(function(){
                        // If row has details expanded
                        if(ss$(this.nodes()[0]).hasClass('shown')){
                            // Collapse row details
                            this.child.hide();
                            ss$(this.node()).removeClass('shown');
                        }
                    });
                });
            },
            error: function (textStatus, errorThrown) {
                console.log(textStatus)
            }
        });
    };

    function location(location) {
        window.location = location;
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     * @param {string} context.fieldId - Field name
     * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(context) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     * @param {string} context.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(context) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(context) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(context) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     * @param {string} context.fieldId - Field name
     * @param {number} context.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} context.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(context) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(context) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(context) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @param {string} context.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(context) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} context
     * @param {Record} context.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(context) {

    }

    return {
        pageInit: pageInit,
//        fieldChanged: fieldChanged,
//        postSourcing: postSourcing,
//        sublistChanged: sublistChanged,
//        lineInit: lineInit,
//        validateField: validateField,
//        validateLine: validateLine,
//        validateInsert: validateInsert,
//        validateDelete: validateDelete,
//        saveRecord: saveRecord
        refresh: refresh,
        location: location,
    };
    
});
