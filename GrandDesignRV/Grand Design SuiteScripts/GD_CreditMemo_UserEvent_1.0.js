/**
 * Credit Memo scripts that need to be in SS 1.0
 * 
 * Version    Date            Author           Remarks
 * 1.00       17 Mar 2021     michaelv
 *
 */

/**  
 * @param {String} type Operation types: create, edit, view, copy, print, email
 * @param {nlobjForm} form Current form
 * @param {nlobjRequest} request Request object
 * @returns {Void}
 */
function GD_CreditMemo_BeforeLoad(type, form, request) {
    if (form != null && IsDealerLoggedIn()) {
    		var curSublist = form.getSubList('recmachcustrecord_rfs_pick_state_transaction');
    		hideButtonOnForm(form, curSublist, 'newrecrecmachcustrecord_rfs_pick_state_transaction');
    		hideButtonOnForm(form, curSublist, 'attach');
    		
    		curSublist = form.getSubList('recmachcustrecord_rfs_outboundserials_fulfill');
    		hideButtonOnForm(form, curSublist,'newrecrecmachcustrecord_rfs_outboundserials_fulfill');
    		hideButtonOnForm(form, curSublist, 'attach');
        	
    		curSublist = form.getSubList('recmachcustrecord_transaction');
        	hideButtonOnForm(form, curSublist, 'newrecrecmachcustrecord_transaction');
        	hideButtonOnForm(form, curSublist, 'attach');
        	
        	curSublist = form.getSubList('recmachcustrecord_rfs_op_session_completion');
        	hideButtonOnForm(form, curSublist, 'newrecrecmachcustrecord_rfs_op_session_completion');
        	hideButtonOnForm(form, curSublist, 'attach');
        	
        	curSublist = form.getSubList('recmachcustrecord_rfs_packed_box_order');
        	hideButtonOnForm(form, curSublist, 'newrecrecmachcustrecord_rfs_packed_box_order');
        	hideButtonOnForm(form, curSublist, 'attach');
    }
}

/** 
 * Hides this button on the form's sublist or form itself.
 * 
 * @param {nlobjForm} form 
 * @param {nlobjSublist} sublist
 * @param {String} buttonName 
 */
function hideButtonOnForm(form, sublist, buttonName) {
    if (form != null) {
        var button = (sublist != null) ? sublist.getButton(buttonName) : form.getButton(buttonName);
        
        if (button != null)
            button.setVisible(false);
    }
}