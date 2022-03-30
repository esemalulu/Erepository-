/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../dic.cs.hub.config',
        'N/ui/dialog', 
        'N/ui/message'],

        
function(dicHubConfig,
		nsDialog,
		nsMessage) {
	
	function _displayErrorMessage(){
		var $ = NS.jQuery;
	
		var mess = $('#' + dicHubConfig.SetingForm.CustomFields.Message.Id).val();
		if (mess && mess.length > 0){
			nsMessage.create({
				title:"EDI Error",
				message: mess,
				type: nsMessage.Type.ERROR
			}).show();
		}
	}
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
    	 _displayErrorMessage();
    }
    
    
    function save(){
    	NS.jQuery('#' + dicHubConfig.FORMS.SETTING.CustomFields.ActionType.Id).val('Save');
    	NS.jQuery('#main_form').submit();
    } 
    return {
        pageInit: pageInit,
        save: save
    };
    
});
