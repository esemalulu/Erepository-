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
* @FileName: TJINCDWVNEV_CS_Entity.js
* @NamingStandard: TJINC_NSJ-2-0-0
*/
define(['/SuiteScripts/trajectoryinc.com/TJINC_DWVNMR/TJINC_DWVNMR_CS_Main'],
    function (dwvnmr) {
        function tjincDWVNEV_saveRecord(context) {
            switch (context.currentRecord.type) {
                case 'customrecord_tjinc_dwvpur_vendorlead':
                    return dwvnmr.tjincDWVNMR_saveRecord(context); // DWV-1
            }
            return true;
        }

        return {
            saveRecord: tjincDWVNEV_saveRecord
        };
    });