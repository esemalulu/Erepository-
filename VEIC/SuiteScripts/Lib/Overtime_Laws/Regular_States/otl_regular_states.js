/**
 * @author Sergio Arce - sarce@veic.org
 * @date   12/05/24
 * Script File:	otl_regular_states.js
 * Script Name:	otl_regular_states.js
 * Script Type:	Library
 * Description:	This will have all the Overtime Laws Logic from the Regular States
 * @NApiVersion 2.1
 * @NModuleScope public
 * History:
 * Date       Author             Change Made
 * ---------------------------------------------------------------------
 * 12/05/24   Sergio Arce        File Creation
 */

define([], function () {
    // Define a helper function to get the minimum of a number and 10
    function minWithTen(x) {
        return Math.min(x, 10);
    }
  
    function calculateRegularPayHrs(workedHrs) {
        // Sum the minimum of each worked hour with 10, using the minWithTen function
        let total = workedHrs.reduce((sum, hours) => sum + minWithTen(hours), 0);
        
        // Apply the outer MIN(40, total) logic
        let result = Math.min(40, total);      

        return result;
    }

    return {
        calculateRegularPayHrs: calculateRegularPayHrs
    }
});

