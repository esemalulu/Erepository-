/*******************************************************************************
 *
 * Name: Coupa-YieldLibrary.js
 *
 * Script Type: Library
 *
 * Description: Yields usage Points when API's usage remaining points are less than equal to the threshold value
 *
 * Version    Date            Author            Remarks
 * 1.0      Aug 10, 2020  Yogesh Jagdale    Initial Development; Yields usage Points when API's usage remaining points are less than equal to the threshold value
 * 1.1      AUg 17, 2020  Yogesh Jagdale    Added a Boolean to skip a DEBUG log to reduce unnecessary logs
 ********************************************************************************/

var THRESHOLD = 700;    // The nlapiYieldScript() will be called when the remaining usage drops to or below the threshold value
var LOG_USAGE = false;   //  Boolean flag to add debug logs of remaining usage

function yieldScript() {
    try {
        var usage = nlapiGetContext().getRemainingUsage();
        if (LOG_USAGE) {
            nlapiLogExecution('DEBUG', 'Current Remaining usage : ' + usage);
        }
        if (usage <= THRESHOLD) {
            var state = nlapiYieldScript();
            if (state.status == 'FAILURE') {
                nlapiLogExecution("AUDIT", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
                throw "Failed to yield script";
            } else if (state.status == 'RESUME') {
                nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ". Size = " + state.size);
            } else {
                nlapiLogExecution("AUDIT", "STATE" + JSON.stringify(state) + ".  Size = " + state.size);
            }
        }
    } catch (e) {
        if (e instanceof nlobjError) {
            nlapiLogExecution('ERROR', 'System Error', e.getCode() + '\n' + e.getDetails());
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', e.toString());
        }
    }
}