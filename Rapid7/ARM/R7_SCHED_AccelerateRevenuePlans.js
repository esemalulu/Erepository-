/*
 * Author: Sa Ho (RSM US)
 * Date: 11/6/2017
 * Description: At the time of ASC606 adoption, Rapid7 will have in process Advanced Revenue Management Revenue Plans which will no longer be valid.
                Rapid7 will need to update these Revenue Plans to accelerate future period planned revenue with a new End Date.
 * Accelerate Revenue Plans Scheduled Script
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
            Modules.AccelRevPlans();
            
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
            'custscript_r7_arp_savedsearch',
            'custscript_r7_arp_newenddate'
        ]);
    };

    function AccelRevPlans() {
        ScriptBase.Log.Debug('Starting Modules.AccelRevPlans');

        try {
            var savedSearch = ScriptBase.Parameters.custscript_r7_arp_savedsearch;
            var newEndDate = ScriptBase.Parameters.custscript_r7_arp_newenddate;

            if (!cu.IsNullOrEmpty(savedSearch) && !cu.IsNullOrEmpty(newEndDate)) {
                var savedSearchObj = nlapiLoadSearch(null, savedSearch); //5 points
                var searchResults = McGladrey.ScriptUtilities.Search.GetAllResults(savedSearchObj); //10 points

                ScriptBase.Log.Debug('searchResults length: ' + searchResults.length);

                if (!cu.IsNullOrEmpty(searchResults) && searchResults.length > 0 && !cu.IsNullOrEmpty(newEndDate)) {
                    for (var i = 0; i < searchResults.length; i++) {
                        ScriptBase.CheckUsage(100);

                        var currRevPlanId = searchResults[i].getValue('internalid', null, 'group');

                        ScriptBase.Log.Debug('Current Revenue Plan ID ' + currRevPlanId);

                        var currRec = nlapiLoadRecord('revenueplan', currRevPlanId); //10 points

                        if (!cu.IsNullOrEmpty(currRec)) {
                            ScriptBase.Log.Debug('revenueplan id ' + currRevPlanId, ', hold rev rec ' + currRec.getFieldValue('holdrevenuerecognition') + ', start date ' + currRec.getFieldValue('revrecstartdate') + ', end date ' + currRec.getFieldValue('revrecenddate'));

                            currRec.setFieldValue('holdrevenuerecognition', 'F');
                            currRec.setFieldValue('revrecenddate', newEndDate);
                            currRec.setFieldValue('custrecord_r7_arp_enddatechange', new Date());

                            var recId = nlapiSubmitRecord(currRec, null, true);

                            if (!cu.IsNullOrEmpty(recId))
                                ScriptBase.Log.Debug('Revenue Plan updated successfully', 'hold rev rec ' + currRec.getFieldValue('holdrevenuerecognition') + ', start date ' + currRec.getFieldValue('revrecstartdate') + ', end date ' + currRec.getFieldValue('revrecenddate'));
                        }
                        else
                            ScriptBase.Log.Error('Unable to load Revenue Plan ID : ' + currRevPlanId);
                    }
                }
            }
        }

        catch (err) {
            ScriptBase.Log.Error('Error in Modules.AccelRevPlans', err.toString());
            throw err;
        }
    };

    return {
        GetParameters: GetParameters,
        AccelRevPlans: AccelRevPlans
    };
})();