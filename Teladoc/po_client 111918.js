
function clientValidateLine(type){
try
{
  var role = nlapiGetContext().getRole(); //get the role of logged in user
  //15 = Employee Center
  //1005 = Supply Chain User (SSO)
  //1020 = Supply Chain Manager (SSO)
  //1022 = Employee Center (SSO)
  //1030 = Tech PR Admin (SSO)
  //1031 = PR Admin (SSO)
  //1046 = Retrofit Supply Chain User (SSO)
  //1057 = PR Admin
  //1042 = Supply Chain User
  
  
  if(role==15 || role==1022 ||  role==1031 || role== 1046 || role== 1057 || role==1042 )// employee center
  {
     
    
     if(type == 'item')
     {
        var justification = nlapiGetCurrentLineItemValue('item', 'custcol_liv_pol_justification') ;
        var project = nlapiGetCurrentLineItemValue('item', 'custcol_liv_pol_project') ;
  
   
        if(justification != "" && project != "") return true;
          alert('Enter Justification and Project. If no project, enter N/A.');	
         return false;

      }
      else
     {
   
       return true;
   
      }
      
      
   }  
   else
   {
   
      return true;
   
   }
  
  }catch(error){
		nlapiLogExecution('ERROR','clientValidateLine',error.toString());
  } //try
}

function postSourcing(type, name)
{
   var amtbasedreceiving = nlapiGetCurrentLineItemValue('item', 'custcol_liv_pol_amt_based_receiving');
   
  if ((type == 'item') && (name == 'item') && amtbasedreceiving == 'T')
   {

         alert('Please enter total service amount in Quantity field and enter 1 in Rate field.');

   }
}