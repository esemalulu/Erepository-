/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

/**
* Copyright (c) 2016 Trajectory Inc.
* 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
* www.trajectoryinc.com
* All Rights Reserved.
*/

/** 
* @System: D-Wave
* @Module: DWVNEV
* @Version: 1.0.01
* @Company: Trajectory Inc.
* @CreationDate: 20160623
* @FileName: TJINCDWVNEV_CS_Transaction.js
* @NamingStandard: TJINC_NSJ-2-0-0
*/
define(['/SuiteScripts/trajectoryinc.com/TJINC_DWVNMR/TJINC_DWVNMR_CS_Main'],
    function (dwvnmr) {
        function tjincDWVNEV_fieldChanged(context) {
            switch (context.currentRecord.type) {
                case 'purchaseorder':
                    dwvnmr.tjincDWVNMR_fieldChangedPO(context); // DWV-1
                    break;
            }
        }

        function tjincDWVNEV_pageInit(context) {
            switch (context.currentRecord.type) {
                case 'purchaseorder':
                    dwvnmr.tjincDWVNMR_pageInit(context); // DWV-1
                    break;
            }
        }

        return {
            fieldChanged: tjincDWVNEV_fieldChanged,
            pageInit: tjincDWVNEV_pageInit
        };
    });