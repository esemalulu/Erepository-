/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 */

/**
 * Copyright (c) 2018 Trajectory Inc.
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
 * @FileName: TJINC_DWVNMR_SS_CreatePO.js
 * @NamingStandard: TJINC_NSJ-2-0-0
 */
define(['N/email', 'N/record', 'N/runtime', 'N/search', 'N/task', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_NS_Library_SS2', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_Lodash'],
    function (email, record, runtime, search, task, tj) {

        function sendMail(s_wo, s_vendor, s_e) {
            var s_cnf = runtime.getCurrentScript().getParameter('custscript_recipients');
            var o_cfg = JSON.parse(s_cnf);

            var s_body = 'Work Order: ' + s_wo + ', Vendor: ' + s_vendor + '\n\n' + s_e;
            try {
                if (Array.isArray(o_cfg.recipients)) {
                    email.send({
                        author: o_cfg.author,
                        recipients: o_cfg.recipients,
                        subject: 'createPO - Error',
                        body: s_body
                    });
                }
            } catch (e) {
                log.error('sendMail', e.message + ' | ' + s_body);
            }
        }

        function createPO(i_vendor, o_vendorItem, a_uom, o_wo) {
            try {
                var i_location = runtime.getCurrentUser().getPreference({ name: 'custscript_tjinc_location' });

                var o_recPO = record.create({ type: record.Type.PURCHASE_ORDER, isDynamic: true });
                o_recPO.setValue({ fieldId: 'entity', value: i_vendor });
                o_recPO.setValue({ fieldId: 'subsidiary', value: o_wo.getValue('subsidiary') });

                var s_employee = o_recPO.getValue('nluser');
                if (s_employee) {
                    var o_dat = search.lookupFields({ type: search.Type.EMPLOYEE, id: s_employee, columns: ['department'] });
                    o_recPO.setValue({ fieldId: 'department', value: o_dat.department[0].value });
                } else {
                    o_recPO.setValue({ fieldId: 'department', value: o_wo.getValue('department') });
                    log.debug('createPO [W] 1', 'Invalid employee (nluser)! ' + s_employee);
                }

                o_recPO.setValue({ fieldId: 'location', value: i_location });
                o_recPO.setValue({ fieldId: 'createdfrom', value: o_wo.id });
                o_recPO.setValue({ fieldId: 'custbody_tjinc_dwvnmr_wo', value: o_wo.id });
                o_recPO.setValue({ fieldId: 'custbody_dwave_justification', value: o_wo.getValue('custbody_dwave_justification') });

                var o_item = _.filter(o_vendorItem, { vendor: i_vendor });
                for (var j = 0; j < o_item.length; j++) {
                    o_recPO.selectNewLine({ sublistId: 'item' });
                    o_recPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: o_item[j].item });
                    o_recPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: i_location });
                    o_recPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'department', value: o_wo.getValue('department') });

                    if (_.indexOf(a_uom, o_item[j].item) === -1) {
                        o_recPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: o_item[j].Value });

                    } else {
                        o_recPO.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Math.ceil(o_item[j].Value) });
                    }
                    o_recPO.commitLine({ sublistId: 'item' });
                }

                // Create the PO and update (link) the WO lines
                var s_idPO = null;
                try {
                    s_idPO = o_recPO.save();

                } catch (ex) {
                    var e = ex;
                    s_idPO = null;

                    if (e !== null) {
                        e = e.toString();
                        log.debug('createPO [W] 2', e);

                        if (e.indexOf('nvalid department reference key 0 for subsidiar') > 0 ||
                            e.indexOf('nvalid employee reference ke') > 0) {
                            b_save = true;

                            var a_column = [];
                            a_column.push(search.createColumn({
                                name: 'internalid',
                                summary: search.Summary.MAX
                            }));
                            ns_search = search.create({
                                type: record.Type.PURCHASE_ORDER,
                                columns: a_column,
                                filters: [['custbody_tjinc_dwvnmr_wo', search.Operator.IS, o_wo.id],
                                    'and', ['entity', search.Operator.IS, i_vendor]]
                            });
                            var o_rMax = ns_search.run().getRange(0, 1);
                            if (o_rMax !== null && o_rMax.length > 0) {
                                s_idPO = o_rMax[0].getValue(a_column[0]);

                            } else {
                                log.debug('createPO [W] 3', 'It seems that the PO was not created');
                                sendMail(o_wo.id, i_vendor, 'It seems that the PO was not created.\n' + e);
                            }

                        } else {
                            e = ex.message;
                            sendMail(o_wo.id, i_vendor, e);
                            log.error('createPO (Department: ' + o_recPO.getValue('department') + ')', e);
                        }
                    }
                }

                log.debug('createPO - In / Out', 'Vendor: ' + i_vendor + ' > Id: ' + s_idPO);
                return s_idPO;

            } catch (ex2) {
                var e2 = ex2.toString();
                sendMail(o_wo.id, i_vendor, e2);
                log.error('createPO', e2);
                return null;
            }
        }

        // Entry point of this schedule script
        function tjincDWVNMR_execute(context) {
            try {
                var j;
                var o_wo;
                var i_qty;
                var s_item;
                var s_type;
                var s_idPO;
                var s_idWO;
                var b_save;
                var i_count;
                var a_vendor;
                var o_recItem;
                var s_povendor;
                var o_vendorItem;
                var i_remainingUsage;

                var a_uom = [];
                var b_processed = true;
                log.debug('tjincDWVNMR_execute', 'In');

                // Select the WOs to be processed
                var ns_search = search.create({
                    type: 'workorder',
                    columns: ['internalid'],
                    filters: [['mainline', 'is', true],
                        'and', ['custbody_tjinc_dwvnmr_create_po', 'is', true],
                        'and', ['custbody_tjinc_dwnmr_po_processed', 'is', false]]
                });
                var o_result = ns_search.run().getRange(0, 1000);

                for (var i = 0; i < o_result.length; i++) {
                    s_idWO = o_result[i].getValue('internalid');
                    o_wo = record.load({ type: record.Type.WORK_ORDER, id: s_idWO, isDynamic: true });

                    i_count = o_wo.getLineCount('item');
                    log.debug('tjincDWVNMR_execute', 'Processing WO ' + s_idWO + ' (' + i_count + ' possible items), subsidiary ' + o_wo.getValue('subsidiary') + ', department ' + o_wo.getValue('department'));
                    if (i_count > 0) {
                        b_save = false;
                        o_vendorItem = [];

                        // Collect the lines (vendors) not processed yet
                        for (j = 0; j < i_count; j++) {
                            o_wo.selectLine({ sublistId: 'item', line: j });
                            s_povendor = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'povendor' });

                            i_qty = 0;
                            s_item = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item' });
                            if (o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemtype' }).toLowerCase() === 'service') {
                                i_qty = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });

                            } else {
                                s_type = tj.getItemRecordType(o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemtype' }));

                                o_recItem = record.load({
                                    type: s_type,
                                    id: s_item
                                });

                                if (o_recItem.getValue('purchaseunit') === o_recItem.getValue('baseunit')) {
                                    i_qty = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered' });

                                } else {
                                    ns_search = search.create({
                                        type: 'unitstype',
                                        columns: ['conversionrate'],
                                        filters: [['internalid', 'is', o_recItem.getValue('unitstype')],
                                            'and', ['pluralname', 'is', o_recItem.getText('purchaseunit')]]
                                    });
                                    var s_r = ns_search.run().getRange(0, 1);
                                    if (s_r.length === 0) {
                                        log.debug('tjincDWVNMR_execute [W]', 'UOM not found ' + s_type + ' ' + s_item + ', Unit: ' + o_recItem.getValue('unitstype') + ' - ' + o_recItem.getText('purchaseunit'));
                                        i_qty = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered' });

                                    } else {
                                        var i_r = s_r[0].getValue('conversionrate');
                                        var i_qty2 = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered' });
                                        i_qty = (1 / i_r) * i_qty2;
                                        if (o_recItem.getValue('custitem_tjinc_dwvmfg_roundupuom')) {
                                            a_uom.push(s_item);
                                        }
                                        // log.debug('tjincDWVNMR_execute', 'Item: ' + s_item + ', Rate: ' + i_r + ', Old QTY: ' + i_qty2 + ' > New QTY: ' + i_qty);
                                    }
                                }
                            }

                            if (i_qty &&
                                !o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvnmr_po' }) &&
                                !_.isNull(s_povendor) && !_.isEmpty(s_povendor)) {
                                o_vendorItem.push({
                                    vendor: s_povendor,
                                    item: s_item,
                                    Value: i_qty
                                });
                            }
                        } // for - vendor lines

                        if (o_vendorItem.length === 0) {
                            log.debug('tjincDWVNMR_execute', 'No POs will be created. - Qty: ' + i_qty + ', Vendor: ' + s_povendor);
                            b_save = true;

                        } else {
                            o_vendorItem = DataGrouper.sum(o_vendorItem, ['vendor', 'item']);
                            a_vendor = _.uniq(_.map(o_vendorItem, 'vendor'));

                            // For each different vendor create a PO
                            for (var k = 0; k < a_vendor.length; k++) {
                                i_remainingUsage = runtime.getCurrentScript().getRemainingUsage();

                                if (i_remainingUsage > 60) {
                                    s_idPO = createPO(a_vendor[k], o_vendorItem, a_uom, o_wo);

                                    if (s_idPO) {
                                        b_save = true;

                                        for (j = 0; j < i_count; j++) {
                                            o_wo.selectLine({ sublistId: 'item', line: j });

                                            i_qty = 0;
                                            if (o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'itemtype' }).toLowerCase() === 'service') {
                                                i_qty = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity' });
                                            } else {
                                                i_qty = o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered' });
                                            }

                                            if (i_qty &&
                                                o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'povendor' }) === a_vendor[k] &&
                                                !o_wo.getCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvnmr_po' })) {

                                                o_wo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'poid', value: s_idPO });
                                                o_wo.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_tjinc_dwvnmr_po', value: s_idPO });
                                                o_wo.commitLine({ sublistId: 'item' });
                                                log.debug('tjincDWVNMR_execute', 'Update WO line: ' + j + ' with PO Id: ' + s_idPO);
                                            }
                                        }
                                        log.debug('tjincDWVNMR_execute', 'PO Id: ' + s_idPO);
                                    }
                                } else {
                                    b_processed = false;
                                    k = a_vendor.length;
                                    i = o_result.length;
                                }
                            } //for
                        }

                        if (b_save) {
                            o_wo.setValue('custbody_tjinc_dwnmr_po_processed', b_processed);
                            o_wo.save();
                            log.debug('tjincDWVNMR_execute', 'Update WO ' + s_idWO);
                        }
                    } // if (i_count > 0)
                } // for
                log.debug('tjincDWVNMR_execute - Out', 'Is it complete?: ' + b_processed);

                if (!b_processed) {
                    // If the units are consumed, the script will be call himself
                    var nso_task = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
                    nso_task.scriptId = 'customscript_tjinc_dwvnr_ss_createpo';
                    nso_task.deploymentId = 'customdeploy_tjinc_dwvnr_ss_createpo';
                    nso_task.submit();
                }

            } catch (e) {
                log.error('tjincDWVNMR_execute', e);
            }
        }
        return {
            execute: tjincDWVNMR_execute
        };
    });