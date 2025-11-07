/**
 * @author Sergio Arce - sarce@veic.org
 * @date   12/04/24
 * Script File:	otl_oregon.js
 * Script Name:	otl_oregon.js
 * Script Type:	Library
 * Description:	This will have all the Overtime Laws Logic from the State of Oregon 
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 12/04/24   Sergio Arce        File Creation
 */

define([], function () {

    function calculateRegularPayHrs(workedHrs) {
        // Calculate the sum of the minimum of each value with 10
        let total = workedHrs.reduce((sum, hours) => sum + Math.min(hours, 10), 0);

        // Return the minimum of 40 and the total
        return Math.min(40, total);
    }

    return {
        calculateRegularPayHrs: calculateRegularPayHrs
    }
});

