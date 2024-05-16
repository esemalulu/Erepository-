/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 *   
 * @returns {Boolean} True to continue save, false to abort save
 */
function shipToSelectSaveRecord() {
    if(!nlapiGetFieldValue('shipaddresslist') || parseFloat(nlapiGetFieldValue('shipaddresslist')) <= 0) {
        alert('Please enter a value on the Ship to Select field.');
        return false;
    } else {
        return true;
    }
}