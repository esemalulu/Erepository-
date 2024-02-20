/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Aug 2014     ibrahima
 *
 */

var ENVIRONMENT_SANDBOX = 'sandbox';
var ENVIRONMENT_BETA = 'beta';

/**
 * Gets page content style.
 * @returns {String}
 */
function getContentStyle()
{
	var ctx = nlapiGetContext();
	var colors = ctx.getColorPreferences();
	return  'background-color:#' +  colors["bodybackground"] + ';color:#' + colors["text"];
}

/**
 * Gets block header style.
 * @returns {String}
 */
function getBlockHeaderStyle()
{
	var ctx = nlapiGetContext();
	var colors = ctx.getColorPreferences();
	return 'background-color:#' +  colors["activetab"] + ';color:#' + colors["textontab"];
}

/**
 * Gets block border style.
 * @returns {String}
 */
function getBlockBorderStyle()
{
	var ctx = nlapiGetContext();
	var colors = ctx.getColorPreferences();
	return 'border: 1px solid #' +  colors["activetab"];
}

/**
 * Returns whether or not user is logged in the web site by checking the shopping session or userId.
 */
function isLoggedIn()
{
	var shopsess = nlapiGetWebContainer().getShoppingSession();
	var ctx = nlapiGetContext();
	var userId = ctx.getUser();
//	var role = ctx.getRole();
//	var roleId = ctx.getRoleId();
//	nlapiLogExecution('debug', 'isLoggedIn', 'userId = ' + userId + '; role = ' + role + '; roleId = ' + roleId);
	if(shopsess.isLoggedIn() || userId > 0) //shopsess.isLoggedIn() returns false even if user is logged in when not in My Account tab. So we use userId to confirm whether or not user is logged in
		return true;
	else
		return false;
}

/**
 * Returns whether or not this user is allowed to register units.
 */
function canRegisterUnits(role) {
	
	var rolesWhoCanRegisterUnits = [ROLE_ADMIN,
	                                ROLE_GD_DC_FULLACCESS,
	                                ROLE_GD_DC_FULLACCESSANDSPIFF,
	                                ROLE_GD_DC_PARTSVIEWREG, 
	                                ROLE_GD_DC_UNITANDWARRANTY,
	                                ROLE_GD_DC_SALESREGISTRATIONSPIFF,
	                                ROLE_GD_DC_SALESREGISTRATION,
	                                ROLE_GD_DC_FULLACCESSANDSPIFF];

	return rolesWhoCanRegisterUnits.indexOf(role.toString()) != -1;
}