/**
 * Scheduled Script to update Recall Units with their matching claims.
 *
 * Version    Date            Author           Remarks
 * 1.00       20 Jul 2016     Jacob Shetler
 *
 */

/**
 * Scheduled Script that updates Recall Units
 *
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function GD_UpdateRecallUnits(type) {
    //Search for Open recall units.
    var openRecallUnits = GetSteppedSearchResults('customrecordrvs_recallunit', [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
        new nlobjSearchFilter('custrecordrecallunit_claim', null, 'is', '@NONE@')], [new nlobjSearchColumn('custrecordrecallunit_recallcode'),
        new nlobjSearchColumn('custrecordrecallunit_unit')]);

    //For each recall unit, search for a claim that has that unit and that flat rate code.
    if (openRecallUnits != null) {
        for (var i = 0; i < openRecallUnits.length; i++) {
            //Do a search on the Operation Line part of the claim so we can join up to the claim.
            //Both the flat rate code on the line and the unit on the body of the claim need to match the Recall information.
            // HD-11861 Added status of 5 and corrected status of 3 to the claim status filter
            var claimSearchResults = nlapiSearchRecord('customrecordrvsclaimoperationline', null,
                [new nlobjSearchFilter('custrecordclaimoperationline_flatratecod', null, 'is', openRecallUnits[i].getValue('custrecordrecallunit_recallcode')),
                    new nlobjSearchFilter('custrecordclaim_unit', 'custrecordclaimoperationline_claim', 'is', openRecallUnits[i].getValue('custrecordrecallunit_unit')),
                    new nlobjSearchFilter('custrecordclaim_status', 'custrecordclaimoperationline_claim', 'anyof', '3', '5')], new nlobjSearchColumn('custrecordclaimoperationline_claim'));

            //If we find a claim, set the recall unit to Complete and set the claim number.
            if (claimSearchResults != null && claimSearchResults.length > 0) {
                nlapiSubmitField('customrecordrvs_recallunit', openRecallUnits[i].getId(), ['custrecordrecallunit_claim', 'custrecordrecallunit_status'], [claimSearchResults[0].getValue('custrecordclaimoperationline_claim'), 'Complete']);
            }

            //Set percent complete, yield if necessary
            nlapiGetContext().setPercentComplete((i / openRecallUnits.length) * 100);
            if (nlapiGetContext().getRemainingUsage() < 50) nlapiYieldScript();
        }
    }
}
