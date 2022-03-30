//display custom error messages in Netsuite depending on the msgType passed in via the querystring
function message(request, response)
{
    var msgType =  Number(request.getParameter('msgtype'));
    var strHTML="";
    var form = nlapiCreateForm( 'Netsuite Message' );    

    
    switch(msgType.toString())
    {
        case "1":
            strHTML="<h3>Please use the 'Sales Order Button' on the Opportunity to create a Sales Order</h3>";
            break;
        
        default:

    }

    form.addField('message', 'inlinehtml', '');
    form.getField('message').setDefaultValue(strHTML);
    form.addButton( 'custpage_gobackbutton', 'Go Back', 'history.back()' );

    response.writePage( form );

}