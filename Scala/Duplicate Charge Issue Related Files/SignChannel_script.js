function disableTerms ()
{

	var specialTerms = nlapiGetFieldValue ( 'custbodysignchannel_checkbox' ) ;
	
	if ( specialTerms == 'T' )
	{
		nlapiDisableField('custbodysignchannel_acct_name', false );
	}
	else
	{
		nlapiDisableField('custbodysignchannel_acct_name', true );
	}
	

}


