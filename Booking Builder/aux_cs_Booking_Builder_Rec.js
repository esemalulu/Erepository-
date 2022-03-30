/**
 * Author: joe.son@audaxium.com 
 * Date: May 20, 2016 (Eli)
 * Desc:
 * Client level script deployed for Booking at record level.
 */

function openBookingBuild()
{
	if (!nlapiGetFieldValue('parent'))
	{
		alert('You must set Client first');
		return false;
	}
	
	var selUrl = nlapiResolveURL(
		'SUITELET',
		'customscript_ax_sl_booking_build_config',
		'customdeploy_ax_sl_booking_build_config'
	)+
	'&currency='+nlapiGetFieldValue('currency')+
	'&subsidiary='+nlapiGetFieldValue('subsidiary')+
	'&clientid='+nlapiGetFieldValue('parent')+
	'&user='+nlapiGetUser();
	
	 window.open(selUrl, '', 'width=1024,height=700,resizable=yes,scrollbars=yes');
	 
}






