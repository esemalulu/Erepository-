//Last updated: Add Retrofit Role 1046

function userEventBeforeLoad(type, form, request)
{
  var role = nlapiGetContext().getRole(); //get the role of logged in user
  if(role==15 || role==1022 || role==1020 || role==1005 || role==1031 || role== 1046)// employee center
  {
    var frm = form.getSubList('expense');
    frm.setDisplayType('hidden');
  }
}