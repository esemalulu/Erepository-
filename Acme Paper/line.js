/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/serverWidget'],

function(currentRecord , serverWidget) {
	
function pageInit(context) {
     //create an inline html field
var hideFld = context.form.addField({
	id:'custpage_hide_buttons',
	label:'not shown - hidden',
	type: serverWidget.FieldType.INLINEHTML
});

 
//for every button you want to hide, modify the scr += line
var scr = "";
scr += 'jQuery("#custpage_cust_history").hide();';
//scr += 'jQuery("#addmessage").hide();';
//scr += 'jQuery("#addcontact").hide();';

//push the script into the field so that it fires and does its handy work
hideFld.defaultValue = "<script>jQuery(function($){require([], function(){" + scr + ";})})</script>"

}
	  return {
	pageInit: pageInit
	  };

});