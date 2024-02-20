/**
 * UI library file for Solution Source accounts.
 * @NApiVersion 2.x
 * @NModuleScope Public
 */
define(['N/ui/serverWidget'],
		
/**
 * @param {serverWidget} serverWidget
 */
function(serverWidget) {
	
	/**
	 * Loops over all lines in the specified sublist type and deletes the lines.
	 * Only recalcs on the last line.
	 */
	function removeAllLinesInSublist(context, sublistType) {
		var lineCount = context.currentRecord.getLineCount({sublistId: sublistType});
		if (lineCount == 0) return;
		
		//Don't do recalcs down to the last one.
		for (var i = 0; i < lineCount - 1; i++) {
			context.currentRecord.removeLine({sublistId: sublistType, line: 0, ignoreRecalc: true});
		}
		
		//Do a recalc when the last one is removed.
		context.currentRecord.removeLine({sublistId: sublistType, line: 0, ignoreRecalc: false});
	}
	
	/**
	 * Disables the button with the specified HTML Element Id on either the form or the sublist.
	 */
	function disableButton(form, buttonId)	{
		var btn = null;
		if (form != null) {
			btn = form.getButton({id: buttonId});
			if(btn != null)	{
				btn.isDisabled = true;
			}
		}
	}
	
	/**
	 * Disables default NetSuite buttons on the form.
	 * Buttons that are disabled by this method are: 
	 * "Save & Copy", "Save & New", "Copy Previous", "Save & Print", "Reset", "New", "Make Copy", "Email", "Register"
	 * 
	 * Use the parameters to stop some of the buttons from being disabled.
	 */
	function disableNSButtons(form, enablePrint, enableSubmit, enableNew) {
		if(form != null) {
			var btn = null;
			//Disable buttons based on the parameters
			if (!enablePrint) {
				btn = form.getButton({id : 'print'});
				if (btn != null) btn.isDisabled = true;
			}
			
			if (!enableSubmit) {
				btn = form.getButton({id : 'submitter'});
				if (btn != null) btn.isDisabled = true;
			}
			
			if (!enableSubmit) {
				btn = form.getButton({id : 'new'});
				if (btn != null) btn.isDisabled = true;
			}
			
			//Disable other buttons regardless of the params
		    btn = form.getButton({id: 'submitcopy'});         
		    if (btn != null) btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'submitnew'});       
		    if (btn != null) btn.isDisabled = true;
		    	    
		    btn = form.getButton({id: 'autofill'}); //Copy Previous button
		    if(btn != null)	btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'saveprint'});
		    if(btn != null)	btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'resetter'});        
		    if (btn != null) btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'makecopy'});        
		    if (btn != null) btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'email'});           
		    if (btn != null) btn.isDisabled = true;
		    
		    btn = form.getButton({id: 'gotoregister'});           
		    if (btn != null) btn.isDisabled = true;
		}
	}
   
    return {
    	removeAllLinesInSublist: removeAllLinesInSublist,
    	disableButton: disableButton,
    	disableNSButtons: disableNSButtons
    };
    
});
