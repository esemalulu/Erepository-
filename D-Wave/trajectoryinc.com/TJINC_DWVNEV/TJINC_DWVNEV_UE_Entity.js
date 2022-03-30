/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */

/**
* Copyright (c) 2016 Trajectory Inc.
* 250 The Esplanade, Suite 402, Toronto, ON, Canada, M5A 1J2
* www.trajectoryinc.com
* All Rights Reserved.
*/

/**
* @System: D-Wave
* @Module: DWVNEV NetSuite Events
* @Version: 1.0.1
* @Company: Trajectory Inc.
* @CreationDate: 20160628
* @FileName: TJINC_DWVNEV_UE_Entity.js
* @NamingStandard: TJINC_NSJ-2-0-0
*/
define(['/SuiteScripts/trajectoryinc.com/TJINC_DWVNMR/TJINC_DWVNMR_UE_Main'],
    function (dwvnmr) {
        var DWVNEV_UE = { version: '1.0.1', log: true };

        function tjincDWVNEV_afterSubmit(context) {
            switch (context.newRecord.type) {
                case 'customrecord_tjinc_dwvpur_venmanufac':
                    dwvnmr.tjincDWVNMR_afterSubmitVLTM(DWVNEV_UE.log, context); // DWV-3
                    break;
                case 'customer':
                    dwvnmr.tjincDWVMR_afterSubmitPROS(DWVNEV_UE.log, context);
                    break;
            }
            log.debug('tjincDWVNEV_afterSubmit - In / Out', 'Ver: ' + DWVNEV_UE.version);
        }

        function tjincDWVNEV_beforeLoad(context) {
            switch (context.newRecord.type) {
                case 'assemblyitem':
                case 'inventoryitem':
                case 'serviceitem':
                    dwvnmr.tjincDWVNMR_beforeLoadItem(DWVNEV_UE.log, context); // DWV-1
                    break;
            }
            log.debug('tjincDWVNEV_beforeLoad - In / Out', 'Ver: ' + DWVNEV_UE.version);
        }

        return {
            afterSubmit: tjincDWVNEV_afterSubmit,
            beforeLoad: tjincDWVNEV_beforeLoad
        };
    });
