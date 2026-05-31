/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet

* Copyright (c) 1998-2023 Oracle NetSuite, Inc.
*  500 Oracle Parkway Redwood Shores, CA 94065 United States 650-627-1000
*  All Rights Reserved.
*
*  This software is the confidential and proprietary information of
*  NetSuite, Inc. ('Confidential Information'). You shall not
*  disclose such Confidential Information and shall use it only in
*  accordance with the terms of the license agreement you entered into
*  with Oracle NetSuite.
*
*  Version          Date          Author               Remarks
*  1.00            17 Nov 2023    riccardi             initial build
*
*/

// TODO -  extend the functioanlity to handle receiving inbound shipments, when an IBS is indicated as the transaction type. 
define(['N/log', 'N/query', 'N/record', 'N/runtime', 'N/ui/serverWidget','N/render','N/file','./ns_lib_custConsLibrary'],
    /**
 * @param{log} log
 * @param{query} query
 * @param{record} record
 * @param{runtime} runtime
 * @param{serverWidget} serverWidget
 */
    (log, query, record, runtime, serverWidget,render,file,custCons) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const strLogPrefix = 'Customer Consignment Check In:';
        const strRecWatermark = "<style>.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);transform-origin:50% 50%;font-size:10vw;color:red;opacity:.5;font-weight:700;z-index:1000;pointer-events:none;white-space:nowrap}@media (max-width:600px){.watermark{font-size:20vw}}</style><div class='watermark'>RECEIVED</div>";
        const onRequest = (scriptContext) => {
            const objScript = runtime.getCurrentScript();
            const strErrorHtml   = objScript.getParameter({name: 'custscript_error_html_general'}); // generic error to return to the browser. This is a parameter so it can be changed without a code change
            const intPickList = objScript.getParameter({name: 'custscript_pickslist_form_id'}); // form that's used to print the packing list
            const intPoForm = objScript.getParameter({name: 'custscript_po_form_id'}); // form that's used to print the purchase Order
            const objValidStatus = {
                            transferOrders: ['D','E','F'],
                            purchaseOrders: ['B','D','E']
                        };
            const arrValidTypes = ['TrnfrOrd','PurchOrd'];

            if(scriptContext.request.method === 'GET'){
                var intTransId = scriptContext.request.parameters.t; // transfer order for receiving
                var intCuId = scriptContext.request.parameters.m; // customer id
                var intHash = scriptContext.request.parameters.v; // hash
                if(!intCuId && !intTransId){
                  log.error(strLogPrefix, 'Page was loaded without proper parameters');
                  log.error(strLogPrefix, 'Customer Id: ' + intCuId + ' Transaction Id: ' + intTransId);
                  scriptContext.response.write(strErrorHtml);
                  return;
                }
                // verify the hash
                if(custCons.hashTrans(intTransId,intCuId) != intHash){
                    log.error(strLogPrefix, 'Incorrect Hash ' + intHash + 'compare to ' + custCons.hashTrans(intTransId,intCuId));
                    scriptContext.response.write(strErrorHtml);
                    return;
                }
                // check to make sure we have a valid order, in a valid status, with a valid consignment customer id; if not, return an error
                var intOrderId = intTransId
                var objOrder = getOrder(intOrderId);
                log.debug(strLogPrefix + 'Order Object', objOrder);
                if(!objOrder){
                  log.error(strLogPrefix, 'Transfer  or Purchase Order not found');
                  scriptContext.response.write(strErrorHtml);
                  return;
                }
                log.debug(strLogPrefix + 'Order Object', objOrder);

                if((objOrder.type == 'TrnfrOrd' && !objValidStatus.transferOrders.includes(objOrder.status)) || objOrder.custbody_ns_invcons_customer != intCuId){
                    log.error(strLogPrefix, 'Transfer Order is not in a valid status or does not have a valid consignment customer');
                    scriptContext.response.write(strErrorHtml);
                    return;
                }
                if((objOrder.type == 'PurchOrd' && !objValidStatus.purchaseOrders.includes(objOrder.status)) || objOrder.custbody_ns_invcons_customer != intCuId){
                    log.error(strLogPrefix, 'Purchase Order is not in a valid status or does not have a valid consignment customer');
                    scriptContext.response.write(strErrorHtml);
                    return;       
                }
                if(!arrValidTypes.includes(objOrder.type)){
                    log.error(strLogPrefix, 'Transaction is not valid type. Must be a Purchase Order or Transfer Order');
                    scriptContext.response.write(strErrorHtml);
                    return;       
                }
                // All checks are passed. transform the Order to receipt
                try{
                    var type = objOrder.type == 'TrnfrOrd' ? 'transferorder' : 'purchaseorder'; 
                    var formId = type == 'TrnfrOrd' ? intPickList : intPoForm;
                    var intItemReceipt = receiveOrder(intOrderId,type);
                    scriptContext.response.write(successHTML(objOrder,formId));
                } catch (e) {
                    log.error(strLogPrefix + 'error', e);
                    scriptContext.response.write(strErrorHtml);
                    return;
                }
            } else if(scriptContext.request.method === 'POST'){
                scriptContext.response.write(strErrorHtml);
                log.error(strLogPrefix, 'Page was loaded with a POST request');
                return;
            }
        }

        function successHTML(objOrder,formId){
            switch(objOrder.type){
            case 'TrnfrOrd':
                var transHTMLFile = render.pickingTicket({
                    entityId: parseInt(objOrder.id),
                    printMode: render.PrintMode.HTML,
                    inCustLocale: true,
                    formId: parseInt(formId)
                    });
                    break;
            case 'PurchOrd':
                var transHTMLFile = render.transaction({
                    entityId: parseInt(objOrder.id),
                    printMode: render.PrintMode.HTML,
                    inCustLocale: true,
                    formId: parseInt(formId)
                    });
                    break;
            }
            if(transHTMLFile){
                var transHTML = transHTMLFile.getContents();
                //transHTML += '<script>setTimeout(function(){window.print();}, 1000);</script>';
                transHTML += strRecWatermark;
                return transHTML;
            }else{
                return 'Error: Could not generate HTML';
            } 
        }

        function getOrder(id){
            var sql = "Select id,type,status,custbody_ns_invcons_customer FROM transaction t WHERE t.id = ?";
            var res = runSql(sql,[id]);
            if(res.length > 0){return res[0];}else{return null;}
         }

        function receiveOrder(id,type){
            var recTransform = record.transform({
                fromType: type,
                fromId: id,
                toType: 'itemreceipt'
            });
            // mark all available lines as received
            var intLineCount = recTransform.getLineCount({sublistId: 'item'});
            for(var i = 0; i < intLineCount; i++){
                recTransform.setSublistValue({sublistId: 'item', fieldId: 'itemreceive', line: i, value: true});
            }
            var recItemReceipt = recTransform.save();
            log.audit(strLogPrefix + 'completed', 'Item Receipt created: ' + recItemReceipt);
            return recItemReceipt;
        }    

        function runSql(sql,params){
            log.debug('sql',sql);
            log.debug('params',params);
            var sqlresults = query.runSuiteQL({
                        query: sql,
                        params: params
            });
            if(sqlresults){
              log.debug('Sql Return Object', sqlresults);
              return sqlresults.asMappedResults();
            }else{
                log.error('SQL Search Error', 'No results found: ' + JSON.stringify(sqlresults));
                return null;
            }
        }

        return {onRequest}

    });
