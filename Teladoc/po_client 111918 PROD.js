
function clientValidateLine(type){

  var role = nlapiGetContext().getRole(); //get the role of logged in user
//  if(role==15 || role==1022 || role==1020 || role==1005 || role==1031 || role== 1046 || role== 1057)// employee center
//  {
    
     if(type == 'item')
     {
        var justification = nlapiGetCurrentLineItemValue('item', 'custcol_liv_pol_justification')
        var project = nlapiGetCurrentLineItemValue('item', 'custcol_liv_pol_project')
   
        if(justification != "" && project != "") return true;
          alert('Enter Justification and Project. If no project, enter N/A.');	
         return false
      }
  // }
}