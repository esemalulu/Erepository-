function PageInit()
{
// if Tier is equal NULL
if ((nlapiGetFieldText('custeventr7supporttier') == ''))
{
// then set Tier to Tier 12
nlapiSetFieldValue('custeventr7supporttier',12);
}


}


function saveRecord()
{
// if Contact is NULL
if ((nlapiGetFieldText('contact') == ''))
{
// then copy Contact In Customer Center to Contact field
var custcenter = nlapiGetFieldValue('custeventr7contactincustomercenterlist');
var contemail = nlapiGetFieldValue('custeventr7contactincustomercenterlist.email');
var contphone = nlapiGetFieldValue('custeventr7contactincustomercenterlist.phone');
nlapiSetFieldValue('contact', custcenter);
nlapiSetFieldValue('email', contemail);
nlapiSetFieldValue('phone', contphone);
}
// if Contact in Cust Center is NULL
if ((nlapiGetFieldText('custeventr7contactincustomercenterlist') == ''))
{
// then copy Contact to Contact In Customer Center field
var contcustcen = nlapiGetFieldValue('contact');
nlapiSetFieldValue('custeventr7contactincustomercenterlist', contcustcen);
}

/*

// if Product Impact is equal to SECURITY RISK (1) or CATASTROPHIC (2)
if ((nlapiGetFieldValue('custeventcaseproductimpact') == 1)||(nlapiGetFieldValue('custeventcaseproductimpact') == 2))
{
// then set Priority to P1 (1)
nlapiSetFieldValue('priority', 1);
}


// if Product Impact is equal to MAJOR (3)
if ((nlapiGetFieldValue('custeventcaseproductimpact') == 3))
{
	// if Business Impact is equal to CRITICAL (1)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 1))
		// then set Priority to P1 (1)
		nlapiSetFieldValue('priority', 1);

	// if Business Impact is equal to SIGNIFICANT (2)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 2))

		// if Revenue Impact is equal to YES (1)
		if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 1))
			// then set Priority to P1 (1)
			nlapiSetFieldValue('priority', 1);

		// else if Revenue Impact is equal to NO (2) or DON'T KNOW (3)
		else if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 2)||(nlapiGetFieldValue('custeventcaserevenueimpact') == 3))
			// then set Priority to P2 (2)
			nlapiSetFieldValue('priority', 2);

	// if Business Impact is equal to MODERATE (3)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 3))

		// then set Priority to P2 (2)
		nlapiSetFieldValue('priority', 2);

	// if Business Impact is equal to MINIMAL (4)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 4))

		// if Revenue Impact is equal to YES (1)
		if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 1))
			// then set Priority to P2 (2)
			nlapiSetFieldValue('priority', 2);

		else
			// then set Priority to P3 (4)
			nlapiSetFieldValue('priority', 4);
}


// if Product Impact is equal to MINOR (4)
if ((nlapiGetFieldValue('custeventcaseproductimpact') == 4))
{
	// if Business Impact is equal to CRITICAL (1)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 1))

		// if Revenue Impact is equal to YES (1)
		if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 1))
			// then set Priority to P1 (1)
			nlapiSetFieldValue('priority', 1);

		// else if Revenue Impact is equal to NO (2) or DON'T KNOW (3)
		else if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 2)||(nlapiGetFieldValue('custeventcaserevenueimpact') == 3))
			// then set Priority to P2 (2)
			nlapiSetFieldValue('priority', 2);

	// if Business Impact is equal to SIGNIFICANT (2)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 2))
		// then set Priority to P2 (2)
		nlapiSetFieldValue('priority', 2);

	// if Business Impact is equal to MODERATE (3)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 3))
		// then set Priority to P2 (2)
		nlapiSetFieldValue('priority', 2);

	// if Business Impact is equal to MINIMAL (4)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 4))
			// then set Priority to P3 (4)
			nlapiSetFieldValue('priority', 4);

}


// if Product Impact is equal to NONE (5)
if ((nlapiGetFieldValue('custeventcaseproductimpact') == 5))
{
	// if Business Impact is equal to CRITICAL (1)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 1))

		// if Revenue Impact is equal to YES (1)
		if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 1))
			// then set Priority to P2 (2)
			nlapiSetFieldValue('priority', 2);

		// else if Revenue Impact is equal to NO (2) or DON'T KNOW (3)
		else if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 2)||(nlapiGetFieldValue('custeventcaserevenueimpact') == 3))
			// then set Priority to P3 (4)
			nlapiSetFieldValue('priority', 4);

	// if Business Impact is equal to SIGNIFICANT (2)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 2))
		// if Revenue Impact is equal to YES (1)
		if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 1))
			// then set Priority to P2 (2)
			nlapiSetFieldValue('priority', 2);

		// else if Revenue Impact is equal to NO (2) or DON'T KNOW (3)
		else if ((nlapiGetFieldValue('custeventcaserevenueimpact') == 2)||(nlapiGetFieldValue('custeventcaserevenueimpact') == 3))
			// then set Priority to P3 (4)
			nlapiSetFieldValue('priority', 4);

	// if Business Impact is equal to MODERATE (3) or MINIMAL (4)
	if ((nlapiGetFieldValue('custeventcasebusinessimpact') == 3)||(nlapiGetFieldValue('custeventcasebusinessimpact') == 4))
			// then set Priority to P3 (4)
			nlapiSetFieldValue('priority', 4);
            
           

}
*/

{	return confirm("Are you sure you want to save this record?");}
}
