/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       29 Jan 2016     Richard Cai
 *
 * purpose: to first focus on "Items" tab, then focus on the "Items" subtab.
 * e.g. on Purchase Order, instead of showing "Expenses" subtab, "Items" subtab will show as default
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType 
 * 
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function es_focus_item_tab_PageInit(type){
	jQuery(document).ready(function(){
		setTimeout(function(){
			try{
				if(ShowTab){
					ShowTab("items",false);
				}
				if(ShowitemsMachine){
					ShowitemsMachine("item");
				}
			}
			catch(error_itemtab){}
		},  50);
	});
}
