//Last updated: Add Retrofit Role 1046

function userEventBeforeLoad(type, form, request)
{
  var role = nlapiGetContext().getRole(); //get the role of logged in user
  // 15 = Employee Center
  ///1005 = Supply Chain User (SSO)
  //1020 = Supply Chain Manager (SSO)
  //1022 = Employee Center (SSO)
  //1030 = Tech PR Admin (SSO)
  //1031 = PR Admin (SSO)
  //1046 = Retrofit Supply Chain User (SSO)
  //1057 = PR Admin
  //1042 = Supply Chain User
  
  if(role==15 || role==1022 || role==1020 || role==1005 || role==1031 || role== 1046 || role== 1057 || role == 1030)// employee center
  {
    var frm = form.getSubList('expense');
    frm.setDisplayType('hidden');
  }
  /* code below is causing issue with billing address default
  if(role==1052 || role==1053 )// PCH Supply Chain riles
  {
      
         form.getSubList('item').getField('rate').setDisplayType('hidden'); 
         form.getSubList('item').getField('amount').setDisplayType('hidden');
         form.getSubList('expense').getField('amount').setDisplayType('hidden');
         
         
   }
   */
}