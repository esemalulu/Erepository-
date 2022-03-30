/**
 * @NApiVersion 2.x
 */

/**
 * Copyright (c) 2019 Trajectory Inc.
 * 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: D-Wave
 * @Module: DWVNMR
 * @Version: 1.0.4
 * @Company: Trajectory Inc.
 * @CreationDate: 20160628
 * @FileName: TJINC_DWVNMR_UE_Main.js
 * @NamingStandard: TJINC_NSJ-2-0-0
 */
define(['N/format', 'N/https', 'N/record', 'N/runtime', 'N/search', 'N/url', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_moment.js', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_NS_Library_SS2', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_Lodash'], function (format, https, record, runtime, search, url, moment, tj) {
    var DWVNMR_UE = {
        version: '1.0.4'
        //css: '/core/media/media.nl?id=12484&c=1227068&h=56c3a3aacf9f65387258&_xt=.css', //jQuery UI v1.12.1
        //ujs: '/core/media/media.nl?id=12482&c=1227068&h=d4f6eac32778d06f610d&_xt=.js'
    };

    var a__leapPrd = [
        { 'id': '28028', 'term': 4,'credits':'', 'billing': '29' },
        { 'id': '28128', 'term': 4, 'credits':'600000000', 'billing': '29' },  // SB Leap0110  10
      	{ 'id': '28129', 'term': 4, 'credits':'1800000000','billing': '29' },  // SB Leap0210 30
        { 'id': '28131', 'term': 4, 'credits':'5400000000', 'billing': '29' }, // SB Leap0310 90
        
        //production variables
        { 'id': '29025', 'term': 4, 'credits':'600000000', 'billing': '29' },  // PD Leap0110  10
      	{ 'id': '29026', 'term': 4, 'credits':'1800000000','billing': '29' },  // PD Leap0210 30
        { 'id': '29027', 'term': 4, 'credits':'5400000000', 'billing': '29' }, // PD Leap0310 90
      
      
      
      
        { 'id': '28029', 'term': 4, 'credits':'', 'billing': '29' },
        { 'id': '28030', 'term': 4, 'credits':'', 'billing': '29' },
        { 'id': '28032', 'term': 4, 'credits':'', 'billing': '29' },
        { 'id': '28030', 'term': 12,'credits':'', 'billing': '34' },
        { 'id': '28031', 'term': 24,'credits':'', 'billing': '45' }];
    // var a__leapSbx = [
    //     { 'id': '27776', 'term': 4, 'billing': '16' },
    //     { 'id': '27777', 'term': 12, 'billing': '17' },
    //     { 'id': '27778', 'term': 24, 'billing': '18' }];
    var a__leapSbx = a__leapPrd;

    var o__cnfPrd = {
        'department': '41',  // Sales and Marketing : Sales
        'location': '10',    // D-Wave Systems (USA) : Palo Alto
        'schedule': '130',   // Prorate Leap
        'region' : '1'  // North America. note this is hard coded and will need to be chanegd once we go international. 
    };
    // var o__cnfSbx = {
    //     'department': '41',  // Sales and Marketing : Sales
    //     'location': '10',    // D-Wave Systems (USA) : Palo Alto
    //     'schedule': '137'    // Prorate Leap
    // };
    var o__cnfSbx = o__cnfPrd;

    var o__sqs = { 'pending': '1', 'success': '2', 'failed': '3' };
    var o__qubist = { 'active': '1', 'paymentIssue': '2', 'pending': '4' };

    return {
        // When a PO is created, the system with load the manufacturer's information
        tjincDWVNMR_afterSubmitPO: function (context) {
            try {
                var a_manufa = [];
                var a_vendorm = [];
                var s_id = context.newRecord.getValue('id');

                if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.SPECIALORDER) {
                    log.debug('tjincDWVNMR_afterSubmitPO - In / Out', 'Id: ' + s_id + ', Action: ' + context.type);
                    return;
                }

                var o_recPO = record.load({ type: 'purchaseorder', id: s_id });
                var s_vendor = o_recPO.getValue('entity');
	 			var createDate  = o_recPO.getValue({fieldId: 'trandate'});

                log.debug('tjincDWVNMR_afterSubmitPO - In', 'Ver: ' + DWVNMR_UE.version + ', PO: ' + s_id + '  with vendor: ' + s_vendor);

                var a_filters = [search.createFilter({
                    name: 'custrecord_tjinc_dwvpur_vendor',
                    operator: search.Operator.IS,
                    values: s_vendor
                }), search.createFilter({
                    name: 'custrecord_tjinc_dwvpur_vensub',
                    operator: search.Operator.IS,
                    values: o_recPO.getValue('subsidiary')
                })];

                var ns_search = search.create({
                    type: 'customrecord_tjinc_dwvpur_vendorlead',
                    columns: ['internalid', 'custrecord_tjinc_dwvpur_itemname', 'custrecord_tjinc_dwvpur_leadtime'],
                    filters: a_filters
                });

                var b_save = false;
                var o_result = ns_search.run().getRange(0, 1000);

                if (o_result.length === 0) {
                    log.error('tjincDWVNMR_afterSubmitPO', 'No vendors found');

                } else {
                    var i;
                    var i_lk;
                    var s_item;
                    var s_manufa;
                    var s_vendorm;
                    var a_filterV = [];
                    var a_filter1 = [];
                    var a_filter2 = [];

                    for (i = 0; i < o_result.length; i++) {
                        a_vendorm.push({
                            id: o_result[i].getValue('internalid'),
                            item: o_result[i].getValue('custrecord_tjinc_dwvpur_itemname'),
                            lead: o_result[i].getValue('custrecord_tjinc_dwvpur_leadtime')
                        });
                    }

                    var a_id = (_.map(a_vendorm, 'id'));
                    log.debug('tjincDWVNMR_afterSubmitPO - VendorsM', a_id);

                    ns_search = search.create({
                        type: 'customrecord_tjinc_dwvpur_venmanufac',
                        columns: ['custrecord_tjinc_dwvpur_parent', 'custrecord_tjinc_dwvpur_manufacturer', 'custrecord_tjinc_dwvpur_defaultmanufac', 'custrecord_tjinc_dwvpur_mfgpartnumber'],
                        filters: ['custrecord_tjinc_dwvpur_parent', search.Operator.ANYOF, a_id]
                    });

                    o_result = ns_search.run().getRange(0, 1000);
                    for (i = 0; i < o_result.length; i++) {
                        a_manufa.push({
                            vendor: o_result[i].getValue('custrecord_tjinc_dwvpur_parent'),
                            part: o_result[i].getValue('custrecord_tjinc_dwvpur_mfgpartnumber'),
                            manufa: o_result[i].getValue('custrecord_tjinc_dwvpur_manufacturer'),
                            default: o_result[i].getValue('custrecord_tjinc_dwvpur_defaultmanufac')
                        });
                    }

                    for (var j = 0, lj = o_recPO.getLineCount('item'); j < lj; j++) {
                        s_item = o_recPO.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                        a_filterV = _.filter(a_vendorm, { item: s_item });

                        if (a_filterV.length > 0) {
                            s_vendorm = a_filterV[0].id;
                            a_filter1 = _.filter(a_manufa, { vendor: s_vendorm });
                            i_lk = a_filter1.length;

                            if (i_lk === 0) {
                                log.debug('tjincDWVNMR_afterSubmitPO', 'No manufacturers for vendorM ' + s_vendorm + ' with item ' + s_item);

                            } else {
                                s_part = '';
                                s_manufa = '';

                                for (var k = 0; k < i_lk; k++) {
                                    s_part = a_filter1[k].part;
                                    s_manufa = a_filter1[k].manufa;
                                    if (a_filter1[k].default) {
                                        k = i_lk;
                                    }
                                }
                                if (s_manufa) {
                                    log.debug('tjincDWVNMR_afterSubmitPO', 'Manufactorer ' + s_manufa);
                                    if (o_recPO.getSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_manufacturer', line: j })) {
                                        a_filter2 = _.filter(a_filter1, { manufa: o_recPO.getSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_manufacturer', line: j }) });
                                    } else {
                                        a_filter2 = _.filter(a_filter1, { manufa: s_manufa });
                                    }
                                }

                                if (a_filter2.length > 0) {
                                    o_recPO.setSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_manufacturer', line: j, value: a_filter2[0].manufa });
                                    o_recPO.setSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_mfgpartno', line: j, value: a_filter2[0].part });
                                }
                            }
                            o_recPO.setSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvpur_needbydate', line: j, value: tj.addBusinessDays(new Date(createDate), a_filterV[0].lead) });
                            b_save = true;
                        }
                    } // for
                }
                if (b_save) {
                    var i_location = runtime.getCurrentUser().getPreference({ name: 'custscript_tjinc_location' });
                    o_recPO.setValue({ fieldId: 'location', value: i_location });

                    o_recPO.save({ enableSourcing: false, ignoreMandatoryFields: true });
                }
                log.debug('tjincDWVNMR_afterSubmitPO Out', 'Successful update? ' + b_save);

            } catch (e) {
                log.error('tjincDWVNMR_afterSubmitPO', e);
            }
        },

        tjincDWVNMR_afterSubmitWO: function (context) {
            try {
                if (context.type === 'create' || context.type === 'edit') {
                    var b_toFix = false;
                    var o_newRec = context.newRecord;

                    if (context.type === 'create') {
                        b_toFix = true;

                    } else { // edit
                        if (!context.oldRecord.getValue('expandassembly') && o_newRec.getValue('expandassembly')) {
                            b_toFix = true;
                        }
                    }

                    if (b_toFix) {
                        var o_rec = record.load({ type: 'workorder', id: o_newRec.getValue('id') });
                        if (fixPoVendor(o_rec)) {
                            o_rec.save();
                        }
                    }
                    log.debug('tjincDWVNMR_afterSubmitWO  - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type);
                }
            } catch (e) {
                log.error('tjincDWVNMR_afterSubmitWO', e);
            }
        },

        // Validate in the custom record only one record will be default for the same parent
        tjincDWVNMR_afterSubmitVLTM: function (b_active, context) {
            try {
                if (context.type === context.UserEventType.DELETE) {
                    return;
                }
                log.debug('tjincDWVNMR_afterSubmitVLTM In', 'Ver: ' + DWVNMR_UE.version);

                var nsr_vltm = context.newRecord;
                if (nsr_vltm.getValue('custrecord_tjinc_dwvpur_defaultmanufac')) {
                    var ns_search = search.create({
                        type: 'customrecord_tjinc_dwvpur_venmanufac',
                        columns: ['internalid', 'custrecord_tjinc_dwvpur_parent'],
                        filters: [['custrecord_tjinc_dwvpur_parent', search.Operator.IS, nsr_vltm.getValue('custrecord_tjinc_dwvpur_parent')],
                            'and', ['custrecord_tjinc_dwvpur_defaultmanufac', search.Operator.IS, true]]
                    });
                    var o_result = ns_search.run().getRange(0, 1000);
                    for (var i = 0; i < o_result.length; i++) {
                        if (nsr_vltm.getValue('id') !== o_result[i].getValue('internalid')) {
                            record.submitFields({
                                type: 'customrecord_tjinc_dwvpur_venmanufac',
                                id: o_result[i].getValue('internalid'), values: { 'custrecord_tjinc_dwvpur_defaultmanufac': false }
                            });
                        }
                    }
                }
                log.debug('tjincDWVNMR_afterSubmitVLTM Out');

            } catch (e) {
                log.error('tjincDWVNMR_afterSubmitVLTM', e);
            }
        },
        // Transform WebServices Customer to Prospect
        tjincDWVMR_afterSubmitPROS: function (b_active, context) {
            try {
                if (context.type === 'create' && runtime.executionContext === runtime.ContextType.WEBSERVICES) {
                    var nsr_customer = record.load({
                        type: 'CUSTOMER',
                        id: context.newRecord.id,
                        isDynamic: true
                    });
                    nsr_customer.setValue({ fieldId: 'entitystatus', value: '12' });
                    nsr_customer.setValue({ fieldId: 'stage', value: 'PROSPECT' });
                    nsr_customer.save({
                        enableSourcing: false, ignoreMandatoryFields: true
                    });
                    log.debug('tjincDWVMR_afterSubmitPROS - In / Out', 'Ver: ' + DWVNMR_UE.version);
                }
            } catch (e) {
                log.error('tjincDWVMR_afterSubmitPROS', e);
            }
        },

        // Add a check box to allow edit the manufacturer
        tjincDWVNMR_beforeLoadPO: function (context) {
            try {
                if (context.type === 'create' || context.type === 'edit') {
                    var nsr_form = context.form;
                    var nsr_sublist = nsr_form.getSublist({
                        id: 'item'
                    });

                    nsr_sublist.addField({
                        id: 'custpage_edit',
                        type: 'checkbox',
                        label: 'Edit'
                    });

                    // var nso_field = nsr_form.addField({ id: 'custpage_html', type: 'inlinehtml', label: '.' });
                    // var s_html = '<link rel="stylesheet" type="text/css" href="' + DWVNMR_UE.css + '">' +
                    //     '<script type="text/javascript" src="' + DWVNMR_UE.ujs + '"></script>';
                    // nso_field.defaultValue = s_html;

                    log.debug('tjincDWVNMR_beforeLoadPO - In / Out', 'Ver: ' + DWVNMR_UE.version);
                }
            } catch (e) {
                log.error('tjincDWVNMR_beforeLoadPO', e);
            }
        },

        // Create the Button to create PO and link its client script code
        tjincDWVNMR_beforeLoadWO: function (context) {
            try {
                if (context.type === 'view' || context.type === 'copy') {
                    var o_rec = context.newRecord;

                    if (context.type === 'view') {
                        if (o_rec.getValue('status') === 'Released' && !o_rec.getValue('custbody_tjinc_dwnmr_po_processed')) {
                            var nsr_form = context.form;
                            nsr_form.addButton({ id: 'custpage_bpo', label: 'Create PO for Back Orders', functionName: 'bpo_click' });
                            nsr_form.clientScriptModulePath = './TJINC_DWVNMR_CS.js';
                        }

                    } else { // copy
                        o_rec.setValue('custbody_tjinc_dwvnmr_create_po', false);
                        o_rec.setValue('custbody_tjinc_dwnmr_po_processed', false);
                        for (var j = 0, i_count = o_rec.getLineCount('item'); j < i_count; j++) {
                            o_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvnmr_po', line: j, value: '' });
                        }
                    }
                    log.debug('tjincDWVNMR_beforeLoadWO - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type);
                }
            } catch (e) {
                log.error('tjincDWVNMR_beforeLoadPWO', e);
            }
        },

        // Add the extended (custom) information for each vendor - item pair.
        tjincDWVNMR_beforeLoadItem: function (b_active, context) {
            try {
                log.debug('tjincDWVNMR_beforeLoadItem In', 'Ver: ' + DWVNMR_UE.version);

                var o_rec = context.newRecord;
                var i_count = o_rec.getLineCount('itemvendor');
                var s_id = o_rec.getValue('id');

                var ns_search = search.create({
                    type: 'customrecord_tjinc_dwvpur_vendorlead',
                    columns: ['internalid', 'custrecord_tjinc_dwvpur_leadtime', 'custrecord_tjinc_dwvpur_moq', 'custrecord_tjinc_dwvpur_vendor', 'custrecord_tjinc_dwvpur_vensub'],
                    filters: ['custrecord_tjinc_dwvpur_itemname', search.Operator.IS, s_id]
                });

                var i;
                var a_array = [];
                var o_result = ns_search.run().getRange(0, 1000);
                for (i = 0; i < o_result.length; i++) {
                    a_array.push({
                        id: o_result[i].getValue('internalid'),
                        moq: o_result[i].getValue('custrecord_tjinc_dwvpur_moq'),
                        vendor: o_result[i].getValue('custrecord_tjinc_dwvpur_vendor'),
                        leadtime: o_result[i].getValue('custrecord_tjinc_dwvpur_leadtime'),
                        subsidiary: o_result[i].getValue('custrecord_tjinc_dwvpur_vensub')
                    });
                }

                var nsr_form = context.form;
                var nsr_sublist = nsr_form.getSublist({
                    id: 'itemvendor'
                });

                if (a_array.length > 0) {
                    var s_sep;
                    var a_filter;
                    var s_vendor;
                    var s_manufa;
                    var s_manufa2;
                    var s_default;
                    var s_subsidiary;
                    var a_array2 = [];

                    if (context.type === 'view') {
                        // INI - Creation of custom columns
                        nsr_sublist.addField({
                            id: 'custpage_moq',
                            type: 'text',
                            label: 'MOQ'
                        });
                        nsr_sublist.addField({
                            id: 'custpage_leadtime',
                            type: 'text',
                            label: 'Lead Time'
                        });
                        nsr_sublist.addField({
                            id: 'custpage_manufacturer',
                            type: 'text',
                            label: 'Manufacturer'
                        });
                        nsr_sublist.addField({
                            id: 'custpage_mfgpartnumber',
                            type: 'text',
                            label: 'Manufacturer Part Number'
                        });
                        nsr_sublist.addField({
                            id: 'custpage_default',
                            type: 'text',
                            label: 'Preferred manufacturer'
                        });
                        nsr_sublist.addField({
                            id: 'custpage_vendorleadtime',
                            type: 'select',
                            label: 'VLT link',
                            source: 'customrecord_tjinc_dwvpur_vendorlead'
                        });
                        // END - Creation of custom columns

                        ns_search = search.create({
                            type: 'customrecord_tjinc_dwvpur_venmanufac',
                            columns: ['custrecord_tjinc_dwvpur_parent', 'custrecord_tjinc_dwvpur_manufacturer', 'custrecord_tjinc_dwvpur_mfgpartnumber', 'custrecord_tjinc_dwvpur_defaultmanufac'],
                            filters: ['custrecord_tjinc_dwvpur_parent', search.Operator.ANYOF, _.map(a_array, 'id')]
                        });

                        o_result = ns_search.run().getRange(0, 1000);

                        for (i = 0; i < o_result.length; i++) {
                            a_array2.push({
                                parent: o_result[i].getValue('custrecord_tjinc_dwvpur_parent'),
                                text: o_result[i].getText('custrecord_tjinc_dwvpur_manufacturer'),
                                text2: o_result[i].getValue('custrecord_tjinc_dwvpur_mfgpartnumber'),
                                b_default: o_result[i].getValue('custrecord_tjinc_dwvpur_defaultmanufac')
                            });
                        }
                    }

                    for (var j = 0; j < i_count; j++) {
                        s_vendor = o_rec.getSublistValue({ sublistId: 'itemvendor', fieldId: 'vendor', line: j });
                        s_subsidiary = o_rec.getSublistValue({ sublistId: 'itemvendor', fieldId: 'subsidiary', line: j });
                        a_filter = _.filter(a_array, { vendor: s_vendor, subsidiary: s_subsidiary });

                        if (a_filter.length > 0) {
                            o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_vendorleadtime', line: j, value: a_filter[0].id });

                            if (context.type === 'view') {
                                o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_moq', line: j, value: a_filter[0].moq });
                                o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_leadtime', line: j, value: a_filter[0].leadtime });

                                if (a_array2.length > 0) {
                                    s_sep = '';
                                    s_manufa = '';
                                    s_manufa2 = '';
                                    s_default = '';
                                    a_filter = _.filter(a_array2, { parent: a_filter[0].id });
                                    for (i = 0; i < a_filter.length; i++) {
                                        s_manufa2 += s_sep + a_filter[i].text2;
                                        s_manufa += s_sep + a_filter[i].text;
                                        if (a_filter[i].b_default) {
                                            s_default += s_sep + 'Yes';
                                        } else {
                                            s_default += s_sep + 'No';
                                        }
                                        s_sep = '<br>';
                                    }
                                    o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_manufacturer', line: j, value: s_manufa });
                                    o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_mfgpartnumber', line: j, value: s_manufa2 });
                                    o_rec.setSublistValue({ sublistId: 'itemvendor', fieldId: 'custpage_default', line: j, value: s_default });
                                }
                            }
                        }
                    }
                } // if (a_array.length > 0)

                //DWV-2
                var o_colQtyCtd = search.createColumn({ name: 'quantitycommitted', summary: 'SUM' });
                ns_search = search.create({
                    type: 'workorder',
                    columns: [o_colQtyCtd],
                    filters: [['mainline', 'is', false],
                        'and', ['item', search.Operator.IS, s_id]]
                });
                o_result = ns_search.run().getRange(0, 1);
                var i_qtyCtd = Number(o_result[0].getValue(o_colQtyCtd));

                if (i_qtyCtd !== o_rec.getValue('custitem_tjinc_dwvaut_woqty')) {
                    record.submitFields({
                        type: o_rec.type,
                        id: s_id, values: { 'custitem_tjinc_dwvaut_woqty': i_qtyCtd }
                    });
                    o_rec.setValue({ fieldId: 'custitem_tjinc_dwvaut_woqty', value: i_qtyCtd });
                    log.debug('tjincDWVNMR_beforeLoadItem', 'Type: ' + o_rec.type + ', Id: ' + s_id + ', Qty: ' + i_qtyCtd);
                }
                log.debug('tjincDWVNMR_beforeLoadItem Out');

            } catch (e) {
                log.error('tjincDWVNMR_beforeLoadItem', e);
            }
        },

        tjincDWVNMR_afterSubmitCS: function (context) {
            try {
                if (runtime.executionContext === 'USERINTERFACE' && context.type === 'create') {
                    var o_values = {};
                    var o_rec = context.newRecord;
                    var soId = o_rec.getValue('createdfrom');

                    if (soId && o_rec.getLineCount('item') === 1) {
                        var a_leap = (tj.isProduction(runtime)) ? a__leapPrd : a__leapSbx;
                        var o_leap = _.find(a_leap, { 'id': o_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 }) });

                        if (o_leap !== undefined) {
                            o_values.custbody_tjinc_qubist_status = o__qubist.active;

                            record.submitFields({
                                type: record.Type.SALES_ORDER, id: soId, values: o_values,
                                options: { enableSourcing: false, ignoreMandatoryFields: true }
                            });

                            log.debug('tjincDWVNMR_afterSubmitCS - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type + ', SO: ' + soId);
                        }
                    }
                }
            } catch (e) {
                log.error('tjincDWVNMR_afterSubmitCS', e);
            }
        },

        tjincDWVNMR_beforSubmitCS: function (context) {
            try {
                if (runtime.executionContext === 'USERINTERFACE' && context.type === 'create') {
                    var o_rec = context.newRecord;
                    var soId = o_rec.getValue('createdfrom');

                    if (soId && o_rec.getLineCount('item') === 1) {
                        var a_leap = (tj.isProduction(runtime)) ? a__leapPrd : a__leapSbx;
                        var o_leap = _.find(a_leap, { 'id': o_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 }) });

                        if (o_leap !== undefined) {
                            var a_filter = [];
                            a_filter.push(search.createFilter({ name: 'internalid', operator: search.Operator.IS, values: soId }));
                            a_filter.push(search.createFilter({ name: 'mainline', operator: search.Operator.IS, values: false }));
                            a_filter.push(search.createFilter({ name: 'item', operator: search.Operator.ANYOF, values: _.map(a_leap, 'id') }));

                            var o_result = tj.searchAll({ 'search': search.create({ type: 'transaction', columns: ['quantity'], filters: a_filter }), total: 1 });
                            var i_qty = o_result[0].getValue('quantity');
                            o_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_print_qty', line: 0, value: i_qty });

                            log.debug('tjincDWVNMR_beforSubmitCS - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type + ', SO: ' + soId + ', QTY: ' + i_qty);
                        }
                    }
                }
            } catch (e) {
                log.error('tjincDWVNMR_beforSubmitCS', e);
            }
        },

        tjincDWVNMR_afterSubmitSO: function (context) {
            try {
                if (runtime.executionContext === runtime.ContextType.WEBSTORE && context.type === 'create') {
                    var o_rec = context.newRecord;
                    var d_start = o_rec.getValue('startdate');

                    if (d_start && o_rec.getLineCount('item') === 1) {
                        var a_leap = (tj.isProduction(runtime)) ? a__leapPrd : a__leapSbx;
                        var o_leap = _.find(a_leap, { 'id': o_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 }) });

                        if (o_leap !== undefined) {
                            var s_url = url.resolveScript({
                                scriptId: 'customscript_tjinc_dwvnmr_sl_create_cs',
                                deploymentId: 'customdeploy_tjinc_dwvnmr_sl_create_cs',
                                returnExternalUrl: true
                            });
                            var o_param = {
                                'id': o_rec.id,
                                'start': moment(d_start).format('YYYYMMDD'),
                                'qty': o_rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0 })
                            };
                            https.post({ url: s_url, body: o_param });

                            log.debug('tjincDWVNMR_afterSubmitSO - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type);
                        }
                    }
                }
            } catch (e) {
                log.error('tjincDWVNMR_afterSubmitSO', e);
            }
        },

        tjincDWVNMR_beforSubmitSO: function (context) {
            try {
                if (context.type === 'create') {
                    var o_rec = context.newRecord;

                    if (o_rec.getLineCount('item') === 1) {
                        var a_leap = (tj.isProduction(runtime)) ? a__leapPrd : a__leapSbx;
                        var o_leap = _.find(a_leap, { 'id': o_rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: 0 }) });

                        if (o_leap !== undefined) {
                            var o_cnf = (tj.isProduction(runtime)) ? o__cnfPrd : o__cnfSbx;

                            var s_ctx = runtime.executionContext;
                            if (s_ctx === runtime.ContextType.WEBSTORE) {
                                var d_start = o_rec.getValue({ fieldId: 'startdate' });
                                var d_end = moment(d_start).add({ month: o_leap.term }).subtract({ day: 1 }).toDate();
                                var s_end = tj.date2str(format, d_end);

                                o_rec.setValue({ fieldId: 'enddate', value: d_end });
                                o_rec.setValue({ fieldId: 'location', value: o_cnf.location });
                                o_rec.setValue({ fieldId: 'department', value: o_cnf.department });
                                o_rec.setValue({ fieldId: 'custbody_renewal_terms', value: 1 });
                                o_rec.setValue({ fieldId: 'revreconrevcommitment', value: true });
                                o_rec.setValue({ fieldId: 'billingschedule', value: o_leap.billing });
                                o_rec.setValue({ fieldId: 'custbody_tran_term_in_months', value: o_leap.term });
                                o_rec.setValue({ fieldId: 'cseg_region', value: o_cnf.region});

                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'revrecschedule', line: 0, value: o_cnf.schedule });
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_swe_contract_end_date', line: 0, value: s_end });
                                var i_tmp = Number(o_rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: 0 }));
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_list_rate', line: 0, value: i_tmp });
                                i_tmp = i_tmp * o_leap.term;
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'rate', line: 0, value: i_tmp });
                                var i_qty = o_rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: 0 });
                                i_tmp = i_tmp * Number(i_qty);
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'amount', line: 0, value: i_tmp });

                                var d_date = o_rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swe_contract_start_date', line: 0 });
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'revrecstartdate', line: 0, value: d_date });
                                d_date = o_rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_swe_contract_end_date', line: 0 });
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'revrecenddate', line: 0, value: d_date });
                              
                              
                               //added by talib - add credit info Nov 4, 2019
                               
                               // var c_credit = o_rec.getSublistValue({ sublistId: 'item', fieldId: 'custitem_dw_credits', line: 0 });
                                o_rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dw_credits', line: 0, value: o_leap.credits });
                               

                                i_tmp = Number(o_rec.getValue({ fieldId: 'taxtotal' }));
                                i_tmp = i_tmp * o_leap.term;
                                o_rec.setValue({ fieldId: 'taxamountoverride', value: i_tmp });
                                o_rec.setValue({ fieldId: 'taxtotal', value: i_tmp });
                                o_rec.setValue({ fieldId: 'tobeemailed', value: false });

                            } else if (s_ctx === 'USERINTERFACE' || s_ctx === 'SCHEDULED') {
                                o_rec.setValue({ fieldId: 'location', value: o_cnf.location });
                                o_rec.setValue({ fieldId: 'department', value: o_cnf.department });

                                o_rec.setValue({ fieldId: 'custbody_tjinc_sqs_flag', value: o__sqs.pending });
                                o_rec.setValue({ fieldId: 'custbody_tjinc_qubist_status', value: o__qubist.pending });
                            }

                            log.debug('tjincDWVNMR_beforSubmitSO - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type + ', Term: ' + o_leap.term + ', Ctx: ' + s_ctx);
                        }
                    }
                }
            } catch (e) {
                log.error('tjincDWVNMR_beforSubmitSO', e);
            }
        },

        tjincDWVNMR_beforSubmitWO: function (context) {
            try {
                if (context.type === 'create' || context.type === 'edit') {
                    var b_toFix = false;
                    var o_newRec = context.newRecord;

                    if (context.type === 'create') {
                        b_toFix = true;

                    } else { // edit
                        if (!context.oldRecord.getValue('expandassembly') && o_newRec.getValue('expandassembly')) {
                            b_toFix = true;
                        }
                    }

                    if (b_toFix) {
                        fixPoVendor(o_newRec);
                    }
                    log.debug('tjincDWVNMR_beforSubmitWO - In / Out', 'Ver: ' + DWVNMR_UE.version + ', Action: ' + context.type);
                }
            } catch (e) {
                log.error('tjincDWVNMR_beforSubmitWO', e);
            }
        }
    };

    function fixPoVendor(o_wo) {
        var i = 0;
        var i_qty;
        var i_line;
        var s_item;
        var o_item;
        var s_type;
        var o_recItem;
        var s_povendor;
        var a_item = [];
        var i_count = o_wo.getLineCount('item');
        var o_script = runtime.getCurrentScript();

        for (var j = 0; j < i_count; j++) {
            s_povendor = o_wo.getSublistValue({ sublistId: 'item', fieldId: 'povendor', line: j });

            if (_.isEmpty(s_povendor)) {
                s_item = o_wo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                o_item = _.filter(a_item, { item: s_item });

                if (o_item.length === 1) {
                    s_povendor = o_item[0].vendor;

                } else {
                    if (o_script.getRemainingUsage() > 0) {
                        s_type = tj.getItemRecordType(o_wo.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: j }));
                        o_recItem = record.load({ type: s_type, id: s_item });
                        i_line = tj.getIndex(o_recItem, 'itemvendor', 'preferredvendor', true);

                        if (i_line === -1) {
                            s_povendor = null;
                        } else {
                            s_povendor = o_recItem.getSublistValue({ sublistId: 'itemvendor', fieldId: 'vendor', line: i_line });
                        }
                        a_item.push({ item: s_item, vendor: s_povendor });

                    } else {
                        s_povendor = null;
                    }
                }

                if (s_povendor !== null) {
                    i++;
                    o_wo.setSublistValue({ sublistId: 'item', fieldId: 'povendor', line: j, value: s_povendor });
                    i_qty = o_wo.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: j });
                    o_wo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: j, value: i_qty.toFixed(5) });
                }
            }
        }
        log.debug('fixPoVendor', '# records: ' + i);
        return (i > 0);
    }
});