/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * author: ngrigoriev
 * Date: 04.07.2019
 * Version: 1.0
 */
                                      
      
define(['N/format','N/https','N/record','N/runtime','N/search','N/ui/serverWidget', 'N/url'],

 /**
* @param {format} format
* @param {https} https
* @param {record} record
* @param {runtime} runtime
* @param {search} search
* @param {url} url
* @param {serverWidget} serverWidget
*/
    function(format, https, record, runtime, search, serverWidget, url) {

        /**
         * Definition of the Suitelet script trigger point.
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context)
        {
            var params = getParams(context);
            if( params.method==='GET'){
                doGet(params);
            }else{
                doPost(params);
            }
        }
        function doGet(params){
            var form = serverWidget.createForm({title:'Create Reversal JE'});
            form.addSubmitButton({label:'Create Reversal JE'});

            var tranDateField = form.addField({
                id: 'custpage_trandate',
                type: serverWidget.FieldType.DATE,
                label: 'Transaction Date'
            }).defaultValue = format.format(new Date(), format.Type.DATE);

            var periodField = form.addField({
                id: 'custpage_period',
                type: serverWidget.FieldType.SELECT,
                source:'accountingperiod',
                label: 'Accounting Period'
            }).defaultValue = getCurrentPeriod();

            var jeIdField = form.addField({
                id:'custpage_jeid',
                type: serverWidget.FieldType.TEXT,
                label: 'Je Internal Id'
            }).defaultValue = params.jeId

            var jeTypeField = form.addField({
                id:'custpage_jetype',
                type: serverWidget.FieldType.TEXT,
                label: 'Je Type'
            }).defaultValue = params.jeType
            
            params.response.writePage(form);
        }

        function doPost(params) {
            log.debug('doPost params',params);
            var form = serverWidget.createForm({title:'reversal JE created'});
            try {
                switch(params.jeType) {
                    case "journalentry":
                        var recType = record.Type.JOURNAL_ENTRY;
                        break;
                    case "intercompanyjournalentry":
                        var recType = record.Type.INTER_COMPANY_JOURNAL_ENTRY;
                        break;
                    case "advintercompanyjournalentry":
                        var recType = record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY;
                }
                var recCopy = record.copy({
                    type: recType,
                    id: params.jeId
                });
                var linesCount = recCopy.getLineCount({sublistId: 'line'});

                recCopy.setValue({
                    fieldId:'trandate',
                    value: params.trandate
                });
                recCopy.setValue({
                    fieldId:'postingperiod',
                    value:params.period
                });
                recCopy.setValue({
                    fieldId:'custbodyr7_man_reversal_tran_id',
                    value:params.jeId
                });
                recCopy.setValue({
                    fieldId:'custbodyr7quoteorderapprovalstatus',
                    value:1
                });
                recCopy.setValue({
                    fieldId:'memo',
                    value: 'REVERSAL: '+recCopy.getValue({fieldId:'memo'})
                });
                for (var i = 0; i < linesCount; i++) {
                    var debitVal = recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'debit'})
                        ?Number(recCopy.getSublistValue({sublistId: 'line',line:i,fieldId: 'debit'}))
                        :0;
                    var creditVal = recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'credit'})
                        ?Number(recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'credit'}))
                        :0;
                    log.debug('line '+i+' debitVal',debitVal);
                    log.debug('line '+i+' creditVal',creditVal);
                    recCopy.setSublistValue({
                        sublistId: 'line',
                        line: i,
                        fieldId: 'credit',
                        value: debitVal
                    });
                    recCopy.setSublistValue({
                        sublistId: 'line',
                        line: i,
                        fieldId: 'debit',
                        value: creditVal
                    });
                    recCopy.setSublistValue({
                        sublistId: 'line',
                        line: i,
                        fieldId: 'memo',
                        value: 'REVERSAL: '+recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'memo'})
                    });
                }
                for (var i = 0; i < linesCount; i++) {
                    var debitVal = recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'debit'})
                        ?recCopy.getSublistValue({sublistId: 'line',line:i,fieldId: 'debit'})
                        :0;
                    var creditVal = recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'credit'})
                        ?recCopy.getSublistValue({sublistId: 'line',line: i,fieldId: 'credit'})
                        :0;
                    log.debug('line '+i+' debitVal after',debitVal);
                    log.debug('line '+i+' creditVal after',creditVal);
                }

                var revrsedJeId = recCopy.save();
                if(revrsedJeId){
                    record.submitFields({
                        type:recType,
                        id:params.jeId,
                        values: {'custbodyr7_man_reversal_tran_id':revrsedJeId}
                    });
                }

                var reverseJeIdField = form.addField({
                    id:'custpage_reverse_jeid',
                    type: serverWidget.FieldType.URL,
                    label: 'Link to the reversal JE'
                });
                reverseJeIdField.updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.INLINE
                });

                var toURL = https.get({
                    url:url.resolveScript({
                        scriptId:'customscriptretrieveurl',
                        deploymentId:'customdeployretrieveurl',
                        returnExternalUrl:true
                    })
                }).body.replace(".extsystem.",".app.");

                reverseJeIdField.defaultValue = toURL+'/app/accounting/transactions/journal.nl?id='+revrsedJeId.toString();
                var originalJEIDField = form.addField({
                    id:'custpage_jeid',
                    type: serverWidget.FieldType.URL,
                    label: 'Link to the original JE'
                });
                originalJEIDField.updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.INLINE
                });
                originalJEIDField.defaultValue = toURL+'/app/accounting/transactions/journal.nl?id='+params.jeId;
            }catch (e) {
                log.error('error when creating reversal JE', e);
                form.addField({
                    id:'custpage_errorfield',
                    type: serverWidget.FieldType.LONGTEXT,
                    label: 'Error during JE creation'
                }).defaultValue = JSON.stringify(e);
            }


            params.response.writePage(form);
        }

     function getCurrentPeriod(){
         var currentPer;
         var periodSearch = search.create({
             type:search.Type.ACCOUNTING_PERIOD,
             filters: [{
                 name: 'startdate',
                 operator: 'onorbefore',
                 values: [format.format({value:new Date(), type:format.Type.DATE})]
             },
             {
                 name: 'enddate',
                 operator: 'onorafter',
                 values:

                     [format.format({value:new Date(), type:format.Type.DATE})]
             },
             {
                 name: 'periodname',
                 operator: 'DOESNOTSTARTWITH',
                 values: ['Q']
             },
             {
                 name: 'periodname',
                 operator: 'DOESNOTSTARTWITH',
                 values: ['FY']
             },
             {
                 name: 'parent',
                 operator: 'ISNOTEMPTY'
             }
             ],
             columns: [
                 {
                     name:'periodname'
                 }
             ]
         }).run().each(function (result) {
             currentPer = result.id
         });
         log.debug('getCurrentPeriod',currentPer);
         return currentPer;
     }

     function getParams(context) {
         return {
             method   : context.request.method,
             response : context.response,
             jeId     : context.request.parameters.custpage_jeid,
             period   : context.request.parameters.custpage_period,
             trandate : new Date(context.request.parameters.custpage_trandate),
             jeType   : context.request.parameters.custpage_jetype,
         }
     }

        return {
            onRequest: onRequest
        }
    }
);