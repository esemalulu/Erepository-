/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Jul 2017     vkarbhar
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
var USAGE_LIMIT_THRESHOLD = 500;
function scheduled(type) {
var s = nlapiSearchRecord("salesorder", null, ["custbody_warehouse_roadnet", "isempty", "T"], [
    new nlobjSearchColumn("location")
])

for(var i=0;i<s.length;i++){

    var loc = s[i].getValue("location");
   // console.log("loc: ", loc);
    nlapiLogExecution("DEBUG", "ID SALESORDER: ",s[i].getId() + " Warehouse: "+ loc)
    nlapiSubmitField("salesorder",s[i].getId(),"custbody_warehouse_roadnet", loc);
}

}
