/**
 * Script is used in Debugger to Unlock Failed Sales Order Approval process by sweet_so_approve_scheduled
 */ 

var updflds = ['custbody_locked','custbody_so_approvalinprogress','custbody_show_message'];
var updvals = ['F','F','F'];

nlapiSubmitField('salesorder','373464',updflds, updvals,false);