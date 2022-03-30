/**
 * Copyright (c) 2015 Trajectory Inc.
 * 2 Berkeley Street, Unit 205, Toronto, ON, Canada, M5A 4J5
 * www.trajectoryinc.com
 * All Rights Reserved.
 */

/**
 * @System: Achievers
 * @Company: Trajectory Inc. / Kuspide Canada Inc.
 * @CreationDate: 20150223
 * @DocumentationUrl: https://docs.google.com/a/trajectoryinc.com/document/d/1rmQNPhSHFcOzxsSdauuVWuomDbwo4nmHaLiaK4Ugi-k/edit?usp=sharing
 * @FileName: TJINC_ACHNIC_Customer.js
 * @NamingStandard: TJINC_NSJ-1-3-3
 */

/* exported o_REQUIREDSUBSIDIARIES, TJINC_ACHNIC_Item_SaveRecord, TJINC_ACHNIC_Item_MassUpdate, TJINC_ACHNIC_Item_BeforeSubmit, 
TJINC_ACHNIC_Customer_IntercoCheck */
/* global jSuite, _, TJINC*/

//https://docs.google.com/document/d/1rmQNPhSHFcOzxsSdauuVWuomDbwo4nmHaLiaK4Ugi-k/edit#heading=h.x4j945nwfxjf
var o_REQUIREDSUBSIDIARIES = jSuite.runSearch({
    recordType: 'subsidiary',
    filterExpression: [['custrecord_tjinc_achnic_isrequired', 'is', 'T']],
    columns: [new nlobjSearchColumn('namenohierarchy').setLabel('name')]
}).Results;

//https://docs.google.com/document/d/1rmQNPhSHFcOzxsSdauuVWuomDbwo4nmHaLiaK4Ugi-k/edit#heading=h.gfus5t1npzdv
Array.prototype.pairwise = function () {
    return this.map(function (a, b, c) {
        var t = c.map(function (d) {
            if (a !== d){ return [a, d]; }
        });
        return t.splice(t.indexOf(undefined), 1), t;
    });
};

//https://docs.google.com/document/d/1rmQNPhSHFcOzxsSdauuVWuomDbwo4nmHaLiaK4Ugi-k/edit#heading=h.4ydxfuua80tf
function TJINC_ACHNIC_Customer_IntercoCheck(s_type) {
    var subsidiaries, a_foundCustomer, a_missingCustomers, a_tooManyCustomers, o_subsidiary = null, i_currentSubsidiary = -1;
    TJINC.Log.Debug({'Title': 'TJINC_ACHNIC_Customer_IntercoCheck - Start', 'Details': 'Type: ' + s_type});

    //1 - Clear out previous values on all subsidiaries
    subsidiaries = jSuite.runSearch({recordType: 'subsidiary'}).Results;

    _.each(subsidiaries, function (subsidiary) {
        o_subsidiary = nlapiLoadRecord('subsidiary', subsidiary.id);
        o_subsidiary.setFieldValues('custrecord_tjinc_achnic_interco_missing', []);
        o_subsidiary.setFieldValues('custrecord_tjinc_achnic_interco_toomany', []);
        nlapiSubmitRecord(o_subsidiary);
    });

    //2 - Update Relevant subsidiaries
    
    //2a- Find all permutations of 'required' subsidiary pairs 
    subsidiaries = _.map(o_REQUIREDSUBSIDIARIES, function (sub) {
        return sub.id;
    }).pairwise();
    
    //2b- Inspect all found permutations of 'required' subsidiary pairs
    _.each(subsidiaries, function (subsidiary) {
        TJINC.Log.Debug({'Title': 'TJINC_ACHNIC_Customer_IntercoCheck', 'Details': 'Processing: '});
        a_missingCustomers = [];
        a_tooManyCustomers = [];
        _.each(subsidiary, function (interco) {
            TJINC.Log.Debug({
                'Title': 'TJINC_ACHNIC_Customer_IntercoCheck',
                'Details': 'Combo: ' + JSON.stringify(interco)
            });
            i_currentSubsidiary = interco[0];
            a_foundCustomer = jSuite.runSearch({
                recordType: 'customer',
                filterExpression: [['subsidiary', 'anyof', i_currentSubsidiary], 'AND', ['custentity_tjinc_represents_subsidiary', 'anyof', interco[1]]]
            }).Results;

            TJINC.Log.Debug({
                'Title': 'TJINC_ACHNIC_Customer_IntercoCheck',
                'Details': 'Results: ' + JSON.stringify(a_foundCustomer)
            });

            if (a_foundCustomer.length < 1) {
                a_missingCustomers.push(interco[1]);
            } else if (a_foundCustomer.length > 1) {
                a_tooManyCustomers.push(interco[1]);
            }
        });

        if (a_missingCustomers.length > 0 || a_tooManyCustomers.length > 0) {
            TJINC.Log.Debug({
                'Title': 'TJINC_ACHNIC_Customer_IntercoCheck',
                'Details': 'Updating Subsidiary: ' + i_currentSubsidiary.toString()
            });
            o_subsidiary = nlapiLoadRecord('subsidiary', i_currentSubsidiary);
            o_subsidiary.setFieldValues('custrecord_tjinc_achnic_interco_missing', a_missingCustomers);
            o_subsidiary.setFieldValues('custrecord_tjinc_achnic_interco_toomany', a_tooManyCustomers);
            nlapiSubmitRecord(o_subsidiary);
        }
    });
    TJINC.Log.Debug({'Title': 'TJINC_ACHNIC_Customer_IntercoCheck - Out', 'Details': ''});
}
