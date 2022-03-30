 /** 
Project			: CH#AGING_REPORTS
Programmer		:Sagar Shah
Description		: Add couple of Stage Aging reports to the portlet.
Date			: 05/24/2013	
====================================================================
CHANGE ID		: CH#RESTRICT_ACCESS
Programmer		:Sagar Shah
Description		: Restrict access of the Regional reports to regional heads only.
Date			: 06/07/2013	
====================================================================
**/
function marketingReportsLinks(portlet)
{
   //var context = nlapiGetContext();

  var basesearchurl = nlapiResolveURL('TASKLINK','LIST_SEARCHRESULTS');
   //portlet.addLine('<b>Total value of the pipeline (all stages) - on demand</b> :', null, 0);

  portlet.setTitle('Forecast Reports');

	//Jim Bureau - Americas
	//Jason du Preez - APAC
	//Paul White - EMEA
	//Sander Spiegelenberg  - Benelux

  
   //CH#RESTRICT_ACCESS - start
   var userId = nlapiGetUser();

   var empRegionalHead = nlapiLookupField('employee', userId, 'custentity_sales_regional_head', true);
   
   if(empRegionalHead==null || empRegionalHead=='')
   {
	   portlet.addLine('You should be a Sales Regional Head or Executive to access Forecast Reports');	   
	   return;
   }

   var empRegionID = null;

   switch(empRegionalHead) {
   
   		case 'Americas':
   			portlet.addLine('', null, 0);

   			//Sales Forecast Report (Americas) - Current Quarter
   		   portlet.addLine('Sales Forecast Report (<b>Americas</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_1951'), 1);

   		   //Sales Forecast by Itm Categry (America) - Curr Qtr
   		   portlet.addLine('Sales Forecast by Item Category (<b>Americas</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_1960'), 1);

   			portlet.addLine('', null, 0);

   			//License Forecast report - on demand - Americas
   		   portlet.addLine('Total <b>LICENSE</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2150'), 1);

   		   //Subscription Forecast report - on demand - America
   		   portlet.addLine('Total <b>SUBSCRIPTION</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2154'), 1);

  			portlet.addLine('', null, 0);

  		   //License Forecast report - by country - America
  		   portlet.addLine('<b>LICENSE</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2158'), 1);

  		   //Subscription Forcast report - by country - America
  		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2166'), 1);

  			portlet.addLine('', null, 0);

  			//Forecast report - by Sales Rep - America
  		   portlet.addLine('Forecast report - by Sales Rep', nlapiResolveURL('TASKLINK','REPO_2162'), 1);

  		   portlet.addLine('', null, 0);

  		   //License Forecast - Public vs Commercial - Americas
  		   portlet.addLine('<b>LICENSE</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2170'), 1);

  		   //Subscrption Forcast - Pub vs Commercial - America
  		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2174'), 1);

  			portlet.addLine('', null, 0);

  			//License Forecast Report - LAGAN vs KANA - Americas
  			portlet.addLine('<b>LICENSE</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2755' , 1);
  		  
  			//Subscription Forecast Report - LAGAN vs KANA - Americas
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2759' , 1);

  			portlet.addLine('', null, 0);

  			//License Forecast Report - Enterprise vs Express vs Legacy - Americas
  			portlet.addLine('<b>LICENSE</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2763' , 1);

  			//Subscription Forecast Report - Enterprise vs Express vs Legacy - Americas
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2767' , 1);

  			//CH#AGING_REPORTS - start

  			portlet.addLine('', null, 0);

  			//Opportunity Sales Stage report - Americas
  			portlet.addLine('Opportunity <b>SALES STAGE</b> report', basesearchurl + '?searchid=2771' , 1);

  			portlet.addLine('', null, 0);

  			//Oppty Pipeline/Count across Stages - current Quarter - Americas
  			portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages - current Quarter', basesearchurl + '?searchid=2775' , 1);

  			portlet.addLine('', null, 0);

  			empRegionID = 1;
   			break;
   			
   		case 'Benelux':
   			portlet.addLine('', null, 0);

   			//Sales Forecast Report (Benelux) - Current Quarter
   		   portlet.addLine('Sales Forecast Report (<b>Benelux</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2014'), 1);

   		   //Sales Forcast by Item Categry (Benelux) - Curr Qtr
   		   portlet.addLine('Sales Forecast by Item Category (<b>Benelux</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2015'), 1);

   			portlet.addLine('', null, 0);

   			//License Forecast report - on demand - Benelux
    		 portlet.addLine('Total <b>LICENSE</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2151'), 1);

    		 //Subscription Forecast report - on demand - Benelux
    		 portlet.addLine('Total <b>SUBSCRIPTION</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2155'), 1);

   			portlet.addLine('', null, 0);

   		   //License Forecast report - by country - Benelux
   		   portlet.addLine('<b>LICENSE</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2159'), 1);

   		   //Subscription Forcast report - by country - Benelux
   		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2167'), 1);

   			portlet.addLine('', null, 0);

   			//Forecast report - by Sales Rep - Benelux
   		   portlet.addLine('Forecast report - by Sales Rep', nlapiResolveURL('TASKLINK','REPO_2163'), 1);

   		   portlet.addLine('', null, 0);

   		   //License Forecast - Public vs Commercial - Benelux
   		   portlet.addLine('<b>LICENSE</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2171'), 1);

   		   //Subscrption Forcast - Pub vs Commercial - Benelux
   		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2175'), 1);

   			portlet.addLine('', null, 0);

  			//License Forecast Report - LAGAN vs KANA - Benelux
  			portlet.addLine('<b>LICENSE</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2756' , 1);
  		  
  			//Subscription Forecast Report - LAGAN vs KANA - Benelux
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2760' , 1);

  			portlet.addLine('', null, 0);

  			//License Forecast Report - Enterprise vs Express vs Legacy - Benelux
  			portlet.addLine('<b>LICENSE</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2764' , 1);

  			//Subscription Forecast Report - Enterprise vs Express vs Legacy - Benelux
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2768' , 1);

  			//CH#AGING_REPORTS - start

  			portlet.addLine('', null, 0);

  			//Opportunity Sales Stage report - Benelux
  			portlet.addLine('Opportunity <b>SALES STAGE</b> report', basesearchurl + '?searchid=2772' , 1);

  			portlet.addLine('', null, 0);

  			//Oppty Pipeline/Count across Stages - current Quarter - Benelux
  			portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages - current Quarter', basesearchurl + '?searchid=2776' , 1);

  			portlet.addLine('', null, 0);

   			empRegionID = 2;
   			break;
   			
   		case 'EMEA':
   			portlet.addLine('', null, 0);

   			//Sales Forecast Report (EMEA) - Current Quarter
   		   portlet.addLine('Sales Forecast Report (<b>EMEA</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2012'), 1);

   		   //Sales Forecast by Item Category (EMEA) - Curr Qtr
   		   portlet.addLine('Sales Forecast by Item Category (<b>EMEA</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2013'), 1);

   			portlet.addLine('', null, 0);

   			//License Forecast report - on demand - EMEA
   		 portlet.addLine('Total <b>LICENSE</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2152'), 1);

   		 //Subscription Forecast report - on demand - EMEA
   		 portlet.addLine('Total <b>SUBSCRIPTION</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2156'), 1);

  			portlet.addLine('', null, 0);

  		   //License Forecast report - by country - EMEA
  		   portlet.addLine('<b>LICENSE</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2160'), 1);

  		   //Subscription Forecast report - by country - EMEA
  		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2168'), 1);

  			portlet.addLine('', null, 0);

  			//Forecast report - by Sales Rep - EMEA
  		   portlet.addLine('Forecast report - by Sales Rep', nlapiResolveURL('TASKLINK','REPO_2164'), 1);

  		   portlet.addLine('', null, 0);

  		   //License Forecast - Public vs Commercial - EMEA
  		   portlet.addLine('<b>LICENSE</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2172'), 1);

  		   //Subscrption Forcast - Public vs Commercial - EMEA
  		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2176'), 1);

  			portlet.addLine('', null, 0);

  			//License Forecast Report - LAGAN vs KANA - EMEA
  			portlet.addLine('<b>LICENSE</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2757' , 1);
  		  
  			//Subscription Forecast Report - LAGAN vs KANA - EMEA
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2761' , 1);

  			portlet.addLine('', null, 0);

  			//License Forecast Report - Enterprise vs Express vs Legacy - EMEA
  			portlet.addLine('<b>LICENSE</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2765' , 1);

  			//Subscription Forecast Report - Enterprise vs Express vs Legacy - EMEA
  			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2769' , 1);

  			//CH#AGING_REPORTS - start

  			portlet.addLine('', null, 0);

  			//Opportunity Sales Stage report - EMEA
  			portlet.addLine('Opportunity <b>SALES STAGE</b> report', basesearchurl + '?searchid=2773' , 1);

  			portlet.addLine('', null, 0);

  			//Oppty Pipeline/Count across Stages - current Quarter - EMEA
  			portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages - current Quarter', basesearchurl + '?searchid=2777' , 1);

  			portlet.addLine('', null, 0);
  			
   			empRegionID = 3;
   			break;
   			
   		case 'APAC':
   			portlet.addLine('', null, 0);

   			//Sales Forecast Report (APAC) - Current Quarter
   		   portlet.addLine('Sales Forecast Report (<b>APAC</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2010'), 1);

   		   //Sales Forecast by Item Category (APAC) - Curr Qtr
   		   portlet.addLine('Sales Forecast by Item Category (<b>APAC</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2011'), 1);

   			portlet.addLine('', null, 0);

   			//License Forecast report - on demand - APAC
      		 portlet.addLine('Total <b>LICENSE</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2153'), 1);

      		 //Subscription Forecast report - on demand - APAC
      		 portlet.addLine('Total <b>SUBSCRIPTION</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_2157'), 1);

     			portlet.addLine('', null, 0);

     		   //License Forecast report - by country - APAC
     		   portlet.addLine('<b>LICENSE</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2161'), 1);

     		   //SSubscription Forecast report - by country - APAC
     		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_2169'), 1);

     			portlet.addLine('', null, 0);

     			//Forecast report - by Sales Rep - APAC
     		   portlet.addLine('Forecast report - by Sales Rep', nlapiResolveURL('TASKLINK','REPO_2165'), 1);

     		   portlet.addLine('', null, 0);

     		   //License Forecast - Public vs Commercial - APAC
     		   portlet.addLine('<b>LICENSE</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2173'), 1);

     		   //Subscrption Forcast - Public vs Commercial - APAC
     		   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_2177'), 1);

     			portlet.addLine('', null, 0);

      			//License Forecast Report - LAGAN vs KANA - APAC
      			portlet.addLine('<b>LICENSE</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2758' , 1);
      		  
      			//Subscription Forecast Report - LAGAN vs KANA - APAC
      			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2762' , 1);

      			portlet.addLine('', null, 0);

      			//License Forecast Report - Enterprise vs Express vs Legacy - APAC
      			portlet.addLine('<b>LICENSE</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2766' , 1);

      			//Subscription Forecast Report - Enterprise vs Express vs Legacy - APAC
      			portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2770' , 1);

      			//CH#AGING_REPORTS - start

      			portlet.addLine('', null, 0);

      			//Opportunity Sales Stage report - APAC
      			portlet.addLine('Opportunity <b>SALES STAGE</b> report', basesearchurl + '?searchid=2774' , 1);

      			portlet.addLine('', null, 0);

      			//Oppty Pipeline/Count across Stages - current Quarter - APAC
      			portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages - current Quarter', basesearchurl + '?searchid=2778' , 1);

      			portlet.addLine('', null, 0);
      		
   			
   			empRegionID = 4;
   			break;   			   			
   }
   
   
   if(empRegionalHead == 'Americas' || empRegionalHead == 'Benelux' || empRegionalHead == 'EMEA' || empRegionalHead == 'APAC') 
   {
	   
		//Opportunity Pipeline/Count across Stages - current Quarter - Regional
		//portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages by Regions - current Quarter', basesearchurl + '?searchid=2754&CU_CUSTENTITY_REGION='+empRegionID, 1);

	   return;
   }
   
  //CH#RESTRICT_ACCESS - end

	   //Sales Forecast Report (Americas) - Current Quarter
	   portlet.addLine('Sales Forecast Report (<b>Americas</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_1951'), 1);

	   //Sales Forecast by Itm Categry (America) - Curr Qtr
	   portlet.addLine('Sales Forecast by Item Category (<b>Americas</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_1960'), 1);

		portlet.addLine('', null, 0);

		   //Sales Forecast Report (Benelux) - Current Quarter
		   portlet.addLine('Sales Forecast Report (<b>Benelux</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2014'), 1);

		   //Sales Forcast by Item Categry (Benelux) - Curr Qtr
		   portlet.addLine('Sales Forecast by Item Category (<b>Benelux</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2015'), 1);

			portlet.addLine('', null, 0);

	   		   //Sales Forecast Report (EMEA) - Current Quarter
	   		   portlet.addLine('Sales Forecast Report (<b>EMEA</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2012'), 1);

	   		   //Sales Forecast by Item Category (EMEA) - Curr Qtr
	   		   portlet.addLine('Sales Forecast by Item Category (<b>EMEA</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2013'), 1);

	   			portlet.addLine('', null, 0);

	    		   //Sales Forecast Report (APAC) - Current Quarter
	    		   portlet.addLine('Sales Forecast Report (<b>APAC</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2010'), 1);

	    		   //Sales Forecast by Item Category (APAC) - Curr Qtr
	    		   portlet.addLine('Sales Forecast by Item Category (<b>APAC</b>) - Current Quarter', nlapiResolveURL('TASKLINK','REPO_2011'), 1);

	    			portlet.addLine('', null, 0);

   //License Forecast report - on demand
   portlet.addLine('Total <b>LICENSE</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_1964'), 1);

   //Subscription Forecast report - on demand
   portlet.addLine('Total <b>SUBSCRIPTION</b> value of the pipeline (all stages) - for the quarter or between a date range', nlapiResolveURL('TASKLINK','REPO_1973'), 1);

	portlet.addLine('', null, 0);

   //License Forecast report - by country
   portlet.addLine('<b>LICENSE</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_1975'), 1);

   //Subscription Forecast report - by country
   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - by Country', nlapiResolveURL('TASKLINK','REPO_1976'), 1);

	portlet.addLine('', null, 0);

	//Forecast report - by Sales Rep
   portlet.addLine('Forecast report - by Sales Rep', nlapiResolveURL('TASKLINK','REPO_1984'), 1);

portlet.addLine('', null, 0);

   //License Forecast report - Public vs Commercial
   portlet.addLine('<b>LICENSE</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_1977'), 1);

   //Subscription Forecast report - Public vs Commercial
   portlet.addLine('<b>SUBSCRIPTION</b> Forecast Report - Public vs Commercial', nlapiResolveURL('TASKLINK','REPO_1978'), 1);

	portlet.addLine('', null, 0);

	//License Forecast Report - LAGAN vs KANA
	portlet.addLine('<b>LICENSE</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2536' , 1);
  
	//Subscription Forecast Report - LAGAN vs KANA
	portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - LAGAN vs KANA', basesearchurl + '?searchid=2576' , 1);

	portlet.addLine('', null, 0);

	//License Forecast Report - Enterprise vs Express vs Legacy
	portlet.addLine('<b>LICENSE</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2538' , 1);

	//Subscription Forecast Report - Enterprise vs Express
	portlet.addLine('<b>SUBSCRIPTION</b> Forecast report - Enterprise vs Express vs Legacy', basesearchurl + '?searchid=2577' , 1);

	//CH#AGING_REPORTS - start

	portlet.addLine('', null, 0);

	//Opportunity Sales Stage report
	portlet.addLine('Opportunity <b>SALES STAGE</b> report', basesearchurl + '?searchid=2727' , 1);

	portlet.addLine('', null, 0);

	//Opportunity Pipeline/Count across Stages by Regions - current Quarter
	portlet.addLine('Opportunity <b>PIPELINE/COUNT</b> across Stages by Regions - current Quarter', basesearchurl + '?searchid=2730' , 1);

	//CH#AGING_REPORTS - end
}
