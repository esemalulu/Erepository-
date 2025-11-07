/**
 * @author Sergio Arce - sarce@veic.org
 * @date   12/02/24
 * Script File:	otl_colorado.js
 * Script Name:	otl_colorado.js
 * Script Type:	Library
 * Description:	This will have all the Overtime Laws Logic from the State of Colorado 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 12/02/24   Sergio Arce        File Creation
 */

define([], function () {

    function calculateRegularPayHrs(workedHrs) {
        // Sum of minimum of each worked hour and 12
        let totalMinHours = workedHrs.reduce((sum, hour) => sum + Math.min(hour, 12), 0);
        
        // Return the minimum of total hours and 40
        return Math.min(40, totalMinHours);
    }

    return {
        calculateRegularPayHrs: calculateRegularPayHrs
    }
});

