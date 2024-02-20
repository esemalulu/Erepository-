/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       18 Nov 2013     ibrahima
 *
 */

/**
 * @param {String} recType Record type internal id
 * @param {Number} recId Record internal id
 * @returns {Void}
 */
function UpdateShowOnDealerPortalOnItems(recType, recId) 
{
	nlapiSubmitField(recType, recId, 'isonline', 'T', false);
}
