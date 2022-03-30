/**
 * @NApiVersion 2.x
 */

/**
* Copyright (c) 2016 Trajectory Inc.
* 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
* www.trajectoryinc.com
* All Rights Reserved.
*/

/**
* @System: D-Wave
* @Module: DWNMR
* @Version: 1.0.01
* @Company: Trajectory Inc.
* @CreationDate: 20160623
* @RequirementsUrl: https://trajectoryinc.atlassian.net/browse/DWV-1
* @FileName: TJINC_DWVNMR_CS_Main.js
* @NamingStandard: TJINC_NSJ-2-0-0
*/
define(['N/record', 'N/search', 'N/url', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_NS_Library_SS2'],
    function (record, search, url, tj) {
        return {
            // Show the manufacturer popup selection when the edit check is pressed
            tjincDWVNMR_fieldChangedPO: function (context) {
                try {
                    if (context.sublistId === 'item' && (context.fieldId === 'item' || context.fieldId === 'custpage_edit')) {
                        var o_rec = context.currentRecord;
                        var i_line = o_rec.getCurrentSublistIndex({ sublistId: 'item' });
                        var s_item = o_rec.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });

                        if (s_item) {
                            tj.setActiveLog(true);
                            tj.log('tjincDWVNMR_fieldChangedPO', 'In');

                            var s_url = url.resolveScript({
                                scriptId: 'customscript_tjinc_dwvnmr_sl_main',
                                deploymentId: 'customdeploy_tjinc_dwvnmr_sl_main',
                                returnExternalUrl: false
                            });

                            jQuery.get(s_url, { vendor: o_rec.getValue('entity'), sub: o_rec.getValue('subsidiary'), item: s_item, ss: false },
                                function (response) {
                                    jQuery('#iDiv_mainContent').html(response);
                                    jQuery('#iDiv_mainContent').dialog('open');

                                    jQuery('#btnCancel').click(function () {
                                        jQuery('#iDiv_mainContent').dialog('close');
                                    });
                                    jQuery('#btnOk').click(function () {
                                        return tjincDWVNMR_ok(search, o_rec, i_line);
                                    });
                                    jQuery('document').ready(function () {
                                        tjincDWVNMR_initColor();
                                    });
                                }, 'text');
                        }
                    }
                } catch (e) {
                    log.error('tjincDWVNMR_fieldChangedPO', e);
                }
            },

            // HTML container in which the manufacturer popup selection will be run
            tjincDWVNMR_pageInit: function (context) {
                try {
                    if (context.mode === 'create' || context.mode === 'edit') {
                        tj.setActiveLog(true);
                        tj.log('tjincDWVNMR_pageInit', 'In');

                        tj.disableFields({ recordId: context.currentRecord, fieldId: ['custcol_tjinc_dwvpur_manufacturer'], sublistId: 'item' });

                        jQuery('#main_form').prepend('<div id="iDiv_mainContent" style="display:none;">TJINC</div>');
                        jQuery('#iDiv_mainContent').dialog({ autoOpen: false, width: 400, modal: true, position: { my: 'center', at: 'center', of: jQuery('body') } });
                        jQuery('#ui-dialog-title-iDiv_mainContent').html('Vendor Selection');
                    }

                } catch (e) {
                    log.error('ttjincDWVNMR_pageInit', e);
                }
            },

            // Validate the unique key pairs in custom record vendor lead
            tjincDWVNMR_saveRecord: function (context) {
                try {
                    tj.setActiveLog(true);
                    tj.log('tjincDWVNMR_saveRecord', 'In');

                    var b_val = false;
                    var o_rec = context.currentRecord;

                    if (o_rec.getValue('id')) {
                        var o_recOld = record.load({
                            type: 'customrecord_tjinc_dwvpur_vendorlead',
                            id: o_rec.getValue('id')
                        });
                        if (o_rec.getValue('custrecord_tjinc_dwvpur_itemname') !== o_recOld.getValue('custrecord_tjinc_dwvpur_itemname') ||
                            o_rec.getValue('custrecord_tjinc_dwvpur_vendor') !== o_recOld.getValue('custrecord_tjinc_dwvpur_vendor') ||
                            o_rec.getValue('custrecord_tjinc_dwvpur_vensub') !== o_recOld.getValue('custrecord_tjinc_dwvpur_vensub')) {
                            b_val = true;
                        }
                    } else {
                        b_val = true;
                    }

                    if (b_val) {
                        var ns_search = search.create({
                            type: 'customrecord_tjinc_dwvpur_vendorlead',
                            columns: ['internalid'],
                            filters: [['custrecord_tjinc_dwvpur_itemname', 'is', o_rec.getValue('custrecord_tjinc_dwvpur_itemname')],
                                'and', ['custrecord_tjinc_dwvpur_vendor', 'is', o_rec.getValue('custrecord_tjinc_dwvpur_vendor')],
                                'and', ['custrecord_tjinc_dwvpur_vensub', 'is', o_rec.getValue('custrecord_tjinc_dwvpur_vensub')]]
                        });

                        tj.log('tjincDWVNMR_saveRecord', 'Item: ' + o_rec.getValue('custrecord_tjinc_dwvpur_itemname') +
                            ', Vendor: ' + o_rec.getValue('custrecord_tjinc_dwvpur_vendor') +
                            ', Sub: ' + o_rec.getValue('custrecord_tjinc_dwvpur_vensub'));

                        var o_result = ns_search.run().getRange(0, 1);
                    
                      //   talib commented April 21 
                      //   if (o_result.length > 0) {
                     //       alert('Item/Vendor/Subsidiary must be unique');
                     //       return false;
                      //  }
                    }
                    return true;

                } catch (e) {
                    log.error('tjincDWVNMR_saveRecord', e);
                }
            }
        };

        // Change colors of JQuery UI controls to match with the NetSuite account
        function tjincDWVNMR_initColor() {
            jQuery('.ui-widget-header').css('border', 'none');
            jQuery('.ui-widget-header').css('background', jQuery('#ns_navigation').css('background-color'));
            jQuery('.ui-dialog-title').css('color', jQuery('.ns-menuitem.ns-menuitem-selected').css('color'));

            jQuery('#iDiv_mainContent .labelSpanEdit').css('padding-top', '4px');
            jQuery('#iDiv_mainContent button').css('color', tj.getStyle('color', '.rndbuttoninpt'));

            var fontSize = tj.getStyle('font-size', '.fgroup_title');
            if (fontSize !== null) {
                jQuery('#iDiv_mainContent > *').css('font-size', fontSize);
                jQuery('#iDiv_mainContent .labelSpanEdit').css('font-size', fontSize);
            }
        }

        // Close the manufacturer popup selection
        function tjincDWVNMR_ok(search, o_rec, i_line) {
            if (jQuery('#ddlManufa').val()) {
                var o_lf = search.lookupFields({
                    type: 'customrecord_tjinc_dwvpur_venmanufac',
                    id: jQuery('#ddlManufa').val(),
                    columns: ['custrecord_tjinc_dwvpur_manufacturer', 'custrecord_tjinc_dwvpur_mfgpartnumber']
                });

                o_rec.selectLine({ sublistId: 'item', line: i_line });
                o_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_manufacturer', value: o_lf.custrecord_tjinc_dwvpur_manufacturer[0].value });
                o_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_mfgpartno', value: o_lf.custrecord_tjinc_dwvpur_mfgpartnumber });
            }
            jQuery('#iDiv_mainContent').dialog('close');
        }
    });