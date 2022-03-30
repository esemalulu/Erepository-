/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
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
* @Version: 1.0.2
* @Company: Trajectory Inc.
* @CreationDate: 20160623
* @RequirementsUrl: https://trajectoryinc.atlassian.net/browse/DWV-1
* @FileName: TJINC_DWVNMR_SL_Main.js
* @NamingStandard: TJINC_NSJ-2-0-0
*/
define(['N/record', 'N/search', 'N/task', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_NS_Library_SS2', '/SuiteScripts/trajectoryinc.com/TJINC_COMMON/TJINC_Lodash'],
    function (record, search, task, tj) {

        // Execute a search and return the records in a HTML option array
        function tjincDWVNMR_getOption(nso_colEntity, nso_colDefault, nso_filter, b_Id) {
            var s_id;
            var s_name;
            var s_selected;
            var a_array = [];
            var s_dllResult = "";

            var nso_colId = search.createColumn({
                name: 'internalid',
            });

            var ns_search = search.create({
                type: 'customrecord_tjinc_dwvpur_venmanufac',
                columns: [nso_colId, nso_colEntity, nso_colDefault],
                filters: nso_filter
            });

            var o_result = ns_search.run().getRange(0, 1000);
            if (o_result.length > 0) {
                for (var i = 0; i < o_result.length; i++) {
                    s_id = b_Id ? o_result[i].getValue(nso_colId) : o_result[i].getValue(nso_colEntity);
                    s_name = o_result[i].getText(nso_colEntity);

                    if (o_result[i].getValue(nso_colDefault)) {
                        s_selected = s_id;
                    }
                    a_array.push({ id: s_id, name: s_name });
                }
                a_array = JSON.parse('[' + _.uniq(_.map(a_array, function (x) { return JSON.stringify(x); })) + ']');

                for (var j = 0; j < a_array.length; j++) {
                    if (a_array[j].id === s_selected) {
                        s_dllResult += "<option selected value='" + a_array[j].id + "'>" + a_array[j].name + "</option>";
                    } else {
                        s_dllResult += "<option value='" + a_array[j].id + "'>" + a_array[j].name + "</option>";
                    }
                }
            }
            return { key: s_selected, data: s_dllResult };
        }

        // Entry point of this Suitelet
        function tjincDWVNMR_onRequest(context) {
            try {
                var s_html;
                tj.setActiveLog(true);

                if (context.request.method === 'GET') {
                    var isTrueSet = (context.request.parameters.ss === 'true');

                    if (isTrueSet) {
                        tj.log('tjincDWVNMR_onRequest - In / Out', 'SS: ' + isTrueSet);

                        record.submitFields({
                            type: record.Type.WORK_ORDER,
                            id: context.request.parameters.id, values: { 'custbody_tjinc_dwvnmr_create_po': true }
                        });

                        // Execute the schedule script for create POs
                        var nso_task = task.create({ taskType: task.TaskType.SCHEDULED_SCRIPT });
                        nso_task.scriptId = 'customscript_tjinc_dwvnr_ss_createpo';
                        nso_task.deploymentId = 'customdeploy_tjinc_dwvnr_ss_createpo';
                        nso_task.submit();

                    } else {
                        tj.log('tjincDWVNMR_onRequest - In / Out', 'Item: ' + context.request.parameters.item +
                            ', Vendor: ' + context.request.parameters.vendor +
                            ', Sub: ' + context.request.parameters.sub);

                        // Return the HTML to be used in the manufacturer popup selection   
                        var nso_manufa = search.createColumn({
                            name: 'custrecord_tjinc_dwvpur_manufacturer'
                        });

                        var nso_default = search.createColumn({
                            name: 'custrecord_tjinc_dwvpur_defaultmanufac'
                        });

                        var a_filter = [search.createFilter({
                            name: 'custrecord_tjinc_dwvpur_itemname',
                            operator: search.Operator.IS,
                            values: context.request.parameters.item,
                            join: 'custrecord_tjinc_dwvpur_parent'
                        }), search.createFilter({
                            name: 'custrecord_tjinc_dwvpur_vendor',
                            operator: search.Operator.IS,
                            values: context.request.parameters.vendor,
                            join: 'custrecord_tjinc_dwvpur_parent'
                        }), search.createFilter({
                            name: 'custrecord_tjinc_dwvpur_vensub',
                            operator: search.Operator.IS,
                            values: context.request.parameters.sub,
                            join: 'custrecord_tjinc_dwvpur_parent'
                        })];

                        s_html = '<table><tr><td class="labelSpanEdit smallgraytextnolink">Manufacturer: </td><td><select id="ddlManufa">{MANUFA}</select></td></tr><tr><td></td><td><button id="btnOk">OK</button><button id="btnCancel">Cancel</button></td></tr><table>';
                        var o_option = tjincDWVNMR_getOption(nso_manufa, nso_default, a_filter, true);

                        s_html = s_html.replace('{MANUFA}', o_option.data);

                        // Write output
                        context.response.write(s_html);
                    }

                } else {
                    // Get selected Item ID
                    var data = context.request.parameters.custpage_item;

                    // Trigger the callback function and close pop-up window
                    tj.log('tjincDWVNMR_onRequest', 'Out');
                    context.response.writePage('<html><body><script>window.opener.addItemButtonCallback("' + data + '");window.close();</script></body></html>');
                }

            } catch (e) {
                log.error('tjincDWVNMR_onRequest', e);
            }
        }
        return {
            onRequest: tjincDWVNMR_onRequest
        };
    });