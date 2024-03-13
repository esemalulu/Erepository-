/**
 * @author suvarshi
 * https://usergroup.netsuite.com/users/showthread.php?p=94008#post94008
 */

function callSuitelet(portlet, column){
	
	
	var abc = nlapiGetUser();
	
	portlet.setTitle('Hoovers');
	
	var noSearchResults = nlapiGetContext().getSetting('SCRIPT','custscriptr7hooverssearchresultsadv');
	
    var fld = portlet.addField('custparamcustomername','text','Company Name(if known)');
    
    var fld2 = portlet.addField('custparamcustomerkeyword','text','Search Keyword');
        
    var fld14 = portlet.addField('custparamannualsalesrange','select','Annual Sales');
    fld14.addSelectOption('','');
    fld14.addSelectOption('1','Under 49.9M');
    fld14.addSelectOption('2','$50M - $99.9M');
    fld14.addSelectOption('3','$100M - $249.9M');
    fld14.addSelectOption('4','$250M - $449.9M');
    fld14.addSelectOption('5','$500M - $749.9M');
    fld14.addSelectOption('6','$750M - $999.9M');
    fld14.addSelectOption('7','$1B - $1.49B');
    fld14.addSelectOption('8','$1.5B - $1.99B');
    fld14.addSelectOption('9','$2B+');
  
    
    var fld3 = portlet.addField('custparamemprange','select','Employees');
    fld3.addSelectOption('','');
    fld3.addSelectOption('1','1-99 employees');
    fld3.addSelectOption('2','100-249 employees');
    fld3.addSelectOption('3','250-499 employees');
    fld3.addSelectOption('4','500-999 employees');
    fld3.addSelectOption('5','1000-2999 employees');
    fld3.addSelectOption('6','2500-4999 employees');
    fld3.addSelectOption('7','5000-9999 employees');
    fld3.addSelectOption('8','10000+ employees');
    
    
    var fld4 = portlet.addField('custparammktcaprange','select','MarketCap');
    fld4.addSelectOption('','');
    fld4.addSelectOption('1','0-100(in thousands)');
    fld4.addSelectOption('2','100-500(in thousands)');
    fld4.addSelectOption('3','500-1000(in thousands)');
    fld4.addSelectOption('4','Not working presently');
    fld4.setDisplayType('hidden');
    
    var fld5 = portlet.addField('custparamassetsrange','select','Assets');
    fld5.addSelectOption('','');
    fld5.addSelectOption('1','0-100(in thousands)');
    fld5.addSelectOption('2','100-500(in thousands)');
    fld5.addSelectOption('3','500-1000(in thousands)');
    fld5.addSelectOption('4','Not working presently');
    fld5.setDisplayType('hidden');
    
    var fld6 = portlet.addField('custparamnetincomerange','select','Net Income');
    fld6.addSelectOption('','');
    fld6.addSelectOption('1','0-100(in thousands)');
    fld6.addSelectOption('2','100-500(in thousands)');
    fld6.addSelectOption('3','500-1000(in thousands)');
    fld6.addSelectOption('4','These will be decided upon');
    fld6.setDisplayType('hidden');
    
    
    var fld651 = portlet.addField('custparammultiselect','multiselect', 'Boom');
    fld651.addSelectOption('Ab','Anchorage', true);
    fld651.addSelectOption('AC','Din', true);
    fld651.addSelectOption('AD','Doom', true);
    
    
    var fld7 = portlet.addField('custparamnaics','text','NAICS(atleast first 2)');
    var fld8 = portlet.addField('custparamnetsic','text','SIC(atleast first 2)');
    var fld9 = portlet.addField('custparamusstate','select','US State');
    fld9.addSelectOption('','');
    fld9.addSelectOption('AK','Alaska');
    fld9.addSelectOption('AS','American Samoa');
    fld9.addSelectOption('AZ','Arizona');
    fld9.addSelectOption('AR','Arkansas');
    fld9.addSelectOption('CA','California');
    fld9.addSelectOption('CO','Colorado');
    fld9.addSelectOption('CT','Connecticut');
    fld9.addSelectOption('DE','Delaware');
    fld9.addSelectOption('DC','District of Columbia');
    fld9.addSelectOption('FM','Federated State of Micronesia');
    fld9.addSelectOption('FL','Florida');
    fld9.addSelectOption('GA','Georgia');
    fld9.addSelectOption('GU','Guam');
    fld9.addSelectOption('HI','Hawaii');
    fld9.addSelectOption('ID','Idaho');
    fld9.addSelectOption('IL','Illinois');
    fld9.addSelectOption('IN','Indiana');
    fld9.addSelectOption('IA','Iowa');
    fld9.addSelectOption('KS','Kansas');
    fld9.addSelectOption('KY','Kentucky');
    fld9.addSelectOption('LA','Louisiana');
    fld9.addSelectOption('ME','Maine');
    fld9.addSelectOption('MH','Marshall Islands');
    fld9.addSelectOption('MD','Maryland');
    fld9.addSelectOption('MA','Massachussetts');
    fld9.addSelectOption('MI','Michigan');
    fld9.addSelectOption('MN','Minnesota');
    fld9.addSelectOption('MS','Missisippi');
    fld9.addSelectOption('MO','Missouri');
    fld9.addSelectOption('MT','Montana');
    fld9.addSelectOption('NE','Nebraska');
    fld9.addSelectOption('NH','New Hampshire');
    fld9.addSelectOption('NJ','New Jersey');
    fld9.addSelectOption('NM','New Mexico');
    fld9.addSelectOption('NY','New York');
    fld9.addSelectOption('NC','North Carolina');
    fld9.addSelectOption('ND','North Dakota');
    fld9.addSelectOption('MP','Northern Mariana Islands');
    fld9.addSelectOption('OH','Ohio');
    fld9.addSelectOption('OK','Oklahoma');
    fld9.addSelectOption('OR','Oregon');
    fld9.addSelectOption('PW','Palau');
    fld9.addSelectOption('PA','Pennsylvania');
    fld9.addSelectOption('PR','Puerto Rico');
    fld9.addSelectOption('RI','Rhode Island');
    fld9.addSelectOption('SC','South Carolina');
    fld9.addSelectOption('SD','South Dakota');
    fld9.addSelectOption('TN','Tennessee');
    fld9.addSelectOption('TX','Texas');
    fld9.addSelectOption('UT','Utah');
    fld9.addSelectOption('VT','Vermont');
    fld9.addSelectOption('VI','Virgin Islands');
    fld9.addSelectOption('VA','Virginia');
    fld9.addSelectOption('WA','Washington');
    fld9.addSelectOption('WV','West Virginia');
    fld9.addSelectOption('WI','Wisconsin');
    fld9.addSelectOption('WY','Wyoming');
    var fld10 = portlet.addField('custparammileswithin','integer','Miles within');
    var fld11 = portlet.addField('custparamzip','text','Zip Code');
    
    //orderByTypes in the Hoover WSDL
    var fld12 = portlet.addField('custparamorderby','select','Order By');
    fld12.addSelectOption('','');
    fld12.addSelectOption('CompanyName','Company Name');
    fld12.addSelectOption('TotalAssets','Total Assets');
    fld12.addSelectOption('EmployeesTotal','Employee Total');
    fld12.addSelectOption('MarketCap','Market Capitalization');
    fld12.addSelectOption('NetIncome','Net Income');    
    fld12.addSelectOption('SalesUS','Sales US');
    fld12.addSelectOption('SalesUK','Sales UK');  
    fld12.addSelectOption('SalesGrowth12Mon','12 Month Sales Growth');    
    fld12.addSelectOption('NetIncomeGrowth12Mon','12 Month NetIncome Growth');
    fld12.addSelectOption('EmployeeGrowth12Mon','12 Month Employee Growth');
    fld12.addSelectOption('NetMargin','Net Margin');
    fld12.addSelectOption('ROE','Return on Equity');
    fld12.addSelectOption('ROA','Return on Assets');
    fld12.addSelectOption('DividendRate','Dividend Rate');
    fld.setLayoutType('normal','startcol');
    
    /*
    var fld18 = portlet.addField('custparamcountry','select','Country');
    fld18.addSelectOption('','');
    fld18.addSelectOption('4','Australia');
    fld18.addSelectOption('14','Canada');
    fld18.addSelectOption('87','India');
    fld18.addSelectOption('50','Mexico');
    fld18.addSelectOption('53','New Zealand');
    fld18.addSelectOption('55','Nigeria');
    fld18.addSelectOption('66','South Africa');
    fld18.addSelectOption('73','Turkey');
    fld18.addSelectOption('74','UK');
    fld18.addSelectOption('76','United States');
    */
    
    var fld16 = portlet.addField('custparamresultsperpage','integer', 'Results per Page');
    fld16.setDisplayType('hidden');
    fld16.setDefaultValue(50);
    
    var fld17 = portlet.addField('custparamhitoffset','integer', 'Hit Offset');
    fld17.setDisplayType('hidden');
    fld17.setDefaultValue(0);
    
    portlet.setSubmitButton(nlapiResolveURL('SUITELET','customscriptr7hooverspopup', 'customdeployr7hooverspopup'),'Submit');
    
}

