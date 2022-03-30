/* Creation date: 08/08/18 */

function beforeLoad(type, form, request){
    hideSubtlist();
    }



function hideSubtlist() { 
   var role = nlapiGetContext().getRole(); //get the role of logged in user
       if(role==1052 || role==1053 )// PCH Supply Chain User
      {
         form.getSubList('item').getField('rate').setDisplayType('hidden'); 
        // form.getSubList('item').getField('amount').setDisplayType('hidden');
       }
}

