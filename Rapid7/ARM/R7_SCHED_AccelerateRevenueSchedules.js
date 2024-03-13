/*
 * Author: Sa Ho (RSM US)
 * Date: 11/6/2017
 * Description: At the time of ASC606 adoption, Rapid7 will have in process legacy Revenue Schedules which will no longer be valid.
                Rapid7 will need to update these Revenue Schedules to accelerate future period planned revenue into a selected posting period.
 * Accelerate Revenue Schedules Scheduled Script
 */

var ScriptBase;
var cu = McGladrey.CommonUtilities;

var Events = {
    /*
     * Main entry point
     */
    Main: function () {
        ScriptBase = new McGladrey.Script.Scheduled();

        try {
            var startBench = ScriptBase.Log.StartBenchmark(ScriptBase.EventName);

            Modules.GetParameters();
            Modules.AccelRevSched();
            
            ScriptBase.Log.EndBenchmark(ScriptBase.EventName, startBench);
        }
        catch (err) {
            if (err instanceof nlobjError) {
                ScriptBase.Log.ErrorObject('Unknown nlobjError', err);
            }
            else {
                ScriptBase.Log.Error('Unknown Error', err.message);
            }

            throw err;
        }
    }
};

var Modules = (function () {
    //Retrieves script parameters
    function GetParameters() {
        ScriptBase.GetParameters([
            //'custscript_r7_ars_savedsearch',
            'custscript_r7_ars_newpostingperiod',
            'custscript_r7_ars_revschedids'
        ]);
    };

    function AccelRevSched() {
        ScriptBase.Log.Debug('Starting Modules.AccelRevSched');

        try {
            ScriptBase.Log.Debug('revSchedIds', ScriptBase.Parameters.custscript_r7_ars_revschedids);

            //var savedSearch = ScriptBase.Parameters.custscript_r7_ars_savedsearch;
            var newPostingPeriod = ScriptBase.Parameters.custscript_r7_ars_newpostingperiod;
            var revSchedIds = ScriptBase.Parameters.custscript_r7_ars_revschedids.split(',');

            ScriptBase.Log.Debug('revSchedIds Length ' + revSchedIds.length);
            //ScriptBase.Log.Debug('savedSearch: ' + savedSearch + ', newPostingPeriod ' + newPostingPeriod);

            //if (!cu.IsNullOrEmpty(savedSearch) && !cu.IsNullOrEmpty(newPostingPeriod)) {
                //var savedSearchObj = nlapiLoadSearch(null, savedSearch); //5 points
                //var searchResults = McGladrey.ScriptUtilities.Search.GetAllResults(savedSearchObj); //10 points
                
                //ScriptBase.Log.Debug('searchResults length: ' + searchResults.length);

                //if (!cu.IsNullOrEmpty(searchResults) && searchResults.length > 0 && !cu.IsNullOrEmpty(newPostingPeriod)) {
                //    for (var j = 0; j < searchResults.length; j++) {
                //        ScriptBase.CheckUsage(250);

                //        var currRec = nlapiLoadRecord('revrecschedule', searchResults[j].getValue('internalid', null, 'group')); //10 points
                //        var lineCount = currRec.getLineItemCount('recurrence');
                //        var auditRecList = new Array();
            
            if (!cu.IsNullOrEmpty(newPostingPeriod) && !cu.IsNullOrEmpty(revSchedIds) && revSchedIds.length > 0) {
                for (var i = 0; i < revSchedIds.length; i++) {
                    ScriptBase.CheckUsage(250);

                    ScriptBase.Log.Debug('revSchedId ' + revSchedIds[i]);

                    var currRec = nlapiLoadRecord('revrecschedule', revSchedIds[i]); //10 points
                    var lineCount = currRec.getLineItemCount('recurrence');
                    var auditRecList = new Array();

                        for (var n = 1; n <= lineCount; n++) {
                            var status = currRec.getFieldValue('status');
                            var postPer = currRec.getLineItemValue('recurrence', 'postingperiod', n);
                            var dateExec = currRec.getLineItemValue('recurrence', 'jdate', n);
                            var journal = currRec.getLineItemValue('recurrence', 'journal', n);

                            if (cu.IsNullOrEmpty(dateExec) && journal == '- None -' && postPer > newPostingPeriod) {
                                var auditRecId = CreateAuditRecord(currRec, n);

                                if (!cu.IsNullOrEmpty(auditRecId)) {
                                    auditRecList.push(auditRecId);

                                    currRec.setLineItemValue('recurrence', 'postingperiod', n, newPostingPeriod);

                                    //if (status == 'ONHOLD')
                                    //    currRec.setFieldValue('status', 'INPROGRESS');
                                }
                            }
                        }

                        var recId = nlapiSubmitRecord(currRec, null, true);

                        if (!cu.IsNullOrEmpty(recId)) {
                            currRec = nlapiLoadRecord('revrecschedule', recId); //10 points; reload Rev Rec Schedule
                            UpdateAuditRecord(currRec, auditRecList);
                        }
                    }
                }
            }
        //}

        catch (err) {
            ScriptBase.Log.Error('Error in Modules.AccelRevSched', err.toString());
            throw err;
        }
    };

    function CreateAuditRecord(revSchedRec, lineNum) {
        ScriptBase.CheckUsage(100);

        var auditRec = nlapiCreateRecord('customrecord_r7_revschedauditlog');
        auditRec.setFieldValue('custrecord_r7_rsal_revenueschedid', revSchedRec.getId());
        auditRec.setFieldValue('custrecord_r7_rsal_revenuesched', revSchedRec.getId());
        auditRec.setFieldValue('custrecord_r7_rsal_linenumber', lineNum);
        auditRec.setFieldValue('custrecord_r7_rsal_b_remaindefbal', revSchedRec.getFieldValue('remainingdeferredbalance'));
        auditRec.setFieldValue('custrecord_r7_rsal_b_totalrecog', revSchedRec.getFieldValue('totalamortized'));
        auditRec.setFieldValue('custrecord_r7_rsal_b_amount', revSchedRec.getFieldValue('totalamount'));
        auditRec.setFieldValue('custrecord_r7_rsal_b_postingperiodline', revSchedRec.getLineItemValue('recurrence', 'postingperiod', lineNum));
        auditRec.setFieldValue('custrecord_r7_rsal_b_amountline', revSchedRec.getLineItemValue('recurrence', 'recamount', lineNum));

        var auditRecId = nlapiSubmitRecord(auditRec, true);

        return auditRecId;
    };

    function UpdateAuditRecord(revSchedRec, auditRecList) {
        for (var i = 0; i < auditRecList.length; i++) {
            ScriptBase.CheckUsage(100);

            var auditRec = nlapiLoadRecord('customrecord_r7_revschedauditlog', auditRecList[i]);
            auditRec.setFieldValue('custrecord_r7_rsal_a_remaindefbal', revSchedRec.getFieldValue('remainingdeferredbalance'));
            auditRec.setFieldValue('custrecord_r7_rsal_a_totalrecog', revSchedRec.getFieldValue('totalamortized'));
            auditRec.setFieldValue('custrecord_r7_rsal_a_amount', revSchedRec.getFieldValue('totalamount'));
            auditRec.setFieldValue('custrecord_r7_rsal_a_postingperiodline', revSchedRec.getLineItemValue('recurrence', 'postingperiod', auditRec.getFieldValue('custrecord_r7_rsal_linenumber')));
            auditRec.setFieldValue('custrecord_r7_rsal_a_amountline', revSchedRec.getLineItemValue('recurrence', 'recamount', auditRec.getFieldValue('custrecord_r7_rsal_linenumber')));

            var auditRecId = nlapiSubmitRecord(auditRec, true);

            if (!cu.IsNullOrEmpty(auditRecId))
                ScriptBase.Log.Audit('Update Revenue Schedule Audit Log.', 'Record update SUCCESSFUL. ID: ' + auditRecList[i]);
            else
                ScriptBase.Log.Error('Update Revenue Schedule Audit Log.', 'Record update FAILED. ID: ' + auditRecList[i]);
        }
    }

    return {
        GetParameters: GetParameters,
        AccelRevSched: AccelRevSched
    };
})();