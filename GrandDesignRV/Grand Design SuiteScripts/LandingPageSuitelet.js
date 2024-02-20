function LandingPageRedirect(request,response)
{
	// function performs a redirection based on the center that is viewing it.

	try
	{
		
		if(IsDealerLoggedIn()) 
		{
			// redirect to a custom suitelet dashboard.
 			nlapiSetRedirectURL('tasklink', "CARD_54");
		}
		else
		{
			// continue to standard dashboard		  
                        nlapiSetRedirectURL('tasklink', "CARD_-29");
		}		
	}
	catch(ex)
	{
		nlapiSetRedirectURL('tasklink', "CARD_-29");			
	}
}