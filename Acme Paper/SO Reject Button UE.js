function userEventBeforeLoad(type, form, request) {

    var currentUser = nlapiGetUser();
    var currentApprover = nlapiGetFieldValue('custbody_current_approver');
    var soStatus = nlapiGetFieldValue('custbody_so_approval_status');
    var currentRole = nlapiGetRole();
    //if(type=='view' && reqStatus != null && reqStatus != 1 && reqStatus != 5 && reqStatus != 7 && (currentUser == currentApprover || currentRole == 3 || (reqStatus == 9 && currentRole == 1013 || currentRole == 1014)))
    if (type == 'view' && soStatus != '' && soStatus != null) {
        if (soStatus.indexOf('Pending') > -1 && soStatus.length > 16 && (currentUser == currentApprover || currentRole == 3 || currentUser == 244)) {
            form.setScript('customscript_req_reject_btn');	//Set Client Script
            form.addButton('custpage_reject_button', 'Reject', 'RejectAction()');
        }
    }
}