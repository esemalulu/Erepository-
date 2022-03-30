/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript

 */
define(['N/ui/dialog', 
        'N/ui/message',
       
        '../../Com/dic.cs.config',
        '../../Com/Util/dic.cs.util',
        '../../Com/Mailbox/dic.cls.com.mailbox',
        '../../Com/Util/dic.cs.util.url',
        '../../Com/Util/dic.cs.util.object'],

function(dialog, 
		 nsmess,
		
		 diConfig,
		 diUtil,
		 dimailbox,
		 diUtilUrl,
		 diUtilObj) {
	
	
    /**
     *create a ns error message in create custom form  
     */
	function _displayErrorMessage(){
		var $ = NS.jQuery;
		var mess = $('#' + diConfig.PRE_MB_CF.MESSAGE.Id).val();
		if (mess && mess.length > 0){
			nsmess.create({
				title:"EDI Error",
				message: mess,
				type: nsmess.Type.ERROR
			}).show();
		}
	}
	
	/**
	 * Build the paging header for subgrid
	 * 
	 */
	function _buildPagingHeader(){
		dimailbox.buildPagingSublist({
			mailboxType: diConfig.MAILBOX.TYPE.Outbound.Type
		});
	
	};
	
	/**
	 * customize event sorting for columns in subgrid of mailbox
	 * remove the event click which built by netsuite, then add a customize events 
	 */
	function _buildSortingColumns(){
		dimailbox.buidSortingSublist({
			mailboxType: diConfig.MAILBOX.TYPE.Outbound.Type
		});
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
    function pageInitInner(scriptContext) {
    	 _displayErrorMessage();
 	    _buildPagingHeader();
 	    _buildSortingColumns();
    }
   
    function searchAction(){
    	dimailbox.searchAction();
	}

    return {
    	searchAction: searchAction,
        pageInit: pageInitInner
        
    };
        

    
    
});
