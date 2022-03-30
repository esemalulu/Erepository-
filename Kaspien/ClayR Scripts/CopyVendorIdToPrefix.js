/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Jul 2015     clayr
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit,
 *                      approve, cancel, reject (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF only)
 *                      dropship, specialorder, orderitems (PO only) 
 *                      paybills (vendor payments)
 * @returns {Void}
 */
function afterSubmitCopyVendorIdToPrefix(type){
  
	try {
		
		if (type == 'create' || type == 'edit') {
			
			var internalId = nlapiGetRecordId();  // Get the record id
			
			var recVendor = nlapiLoadRecord('vendor',internalId);		// Load the vendor record
			var prefix = recVendor.getFieldValue('entityid');
			var companyName = recVendor.getFieldValue('companyname');
			var market = recVendor.getFieldText('custentitymarket_c');
			var prefix_blank = prefix.indexOf(" ");
			
			if (prefix_blank > -1) {
				prefix = prefix.substr(0,prefix_blank);
			}
		
			nlapiSubmitField('vendor',internalId,'custentityprefix',prefix);  // store prefix
		
			nlapiLogExecution('DEBUG', 'Update Prefix Ratt Field', 'type: ' + type + '; prefix: ' + prefix + '; internalId: ' + internalId + 
					'; Company Name: ' + companyName  + '; Market: ' + market);
			
			/* This section assembles and stores the QB Vendor Name
			 * === No longer Needed ===
			
			var vendorName = companyName.replace(/[\'\"]/g, "");	// remove any " or ' characters
			
			// Check market and assemble the Prefix and Suffix
			if (market == 'US' || market == null || market == '') {
				
				// US market vendor name format
				var vn_suffix = " -- " + prefix;
				var vn_prefix = "";
				
			} else {
				
				var marketLen = market.length;
				var newMarket = market.substr(marketLen - 2);	// Get two char country code
				
				// If market (country code) is at end of name remove the last 4 characters
				var nameEnd = vendorName.substr(-4);
				var tempEnd = "- " + newMarket;
				
				if (nameEnd == tempEnd) {
					
					newLen = vendorName.length - 4;
					vendorName = vendorName.substr(0,newLen);
					
				}
				
				// Foreign market vendor name format
				var vn_suffix = " -- " + prefix;
				var vn_prefix = newMarket + " -- ";
				
			}
			
			// Shorten the name to fit within 41 characters and assemble the QB Vendor Name
			var tempLen = vn_prefix.length + vn_suffix.length;
			var name_len = 41 - tempLen;
			var qb_vendor_name = vn_prefix + vendorName.substr(0, name_len) + vn_suffix;

			nlapiSubmitField('vendor',internalId,'custentityqb_vendor_name_c',qb_vendor_name);  // store QB Vendor Name
			
			nlapiLogExecution('DEBUG', 'Update Prefix Ratt Field', 'type: ' + type + '; prefix: ' + prefix + '; internalId: ' + internalId + 
					'; Company Name: ' + companyName  + '; vendorName: ' + vendorName  + '; Market: ' + market  + '; newMarket: ' + newMarket + 
					'; qb_vendor_name: ' + qb_vendor_name);
					
			*/

		}
		
	} catch (err) {
		
		nlapiLogExecution('ERROR', 'Update Prefix_Ratt Field', 'type: ' + type + '; prefix: ' + prefix + '; internalId: ' + internalId + 
				'; errName: ' + err.name + '; errMsg: ' + err.message);
		
	}
	
	
}
