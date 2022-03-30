function addLeadFrWebForm(request, response) 
{
	
	var leadStatusParam = nlapiGetContext().getSetting('SCRIPT','custscript_aux_s180_lead_status'),
		leadSourceParam = nlapiGetContext().getSetting('SCRIPT','custscript_aux_s180_lead_source');
		
	
		var recType = request.getParameter('custparam_rectype');
		var recId = request.getParameter('custparam_recid');	
		var rec = nlapiLoadRecord(recType, recId);				
/*																						//'3 Port Tour')];
		var arrSearchFilters = [new nlobjSearchFilter('companyname', null, 'contains', rec.getFieldValue('custrecord_w2l_company'))];								
		searchresults = nlapiSearchRecord('lead', null, arrSearchFilters, null);
		
		if (searchresults)
		{			
			var method = request.getMethod();
			var html = '<html><body><h2> Customers Counts </h2><form method="post">';
			html = html + '<input type="radio" id= "fp_isIndividual" name="fp_isIndividual" value="Either"> Both Individuals & Companies </input><br/>' ;  
			html = html + '<input type="radio" id= "fp_isIndividual" name="fp_isIndividual" value="Yes"> Individuals </input><br/>' ; 
			html = html + '<input type="radio" id= "fp_isIndividual" name="fp_isIndividual" value="No"> Companies </input><br/><br/>' ; 
			html = html + '<input type="submit" value="Submit">';
			html = html + '</form><br/><hr/><br/></body></html>' ; 			
			var html = '<html><body><h2>There is a possible duplicate already in the system</h2></body></html>';
			response.write(duplicates);
		}
*/	
			//Company
			var cmpnyName = rec.getFieldValue('custrecord_w2l_company');	//NS will not create customer with same name
			var webSite = rec.getFieldValue('custrecord_w2l_website');
			var email = rec.getFieldValue('custrecord_w2l_email');
			var phone = rec.getFieldValue('custrecord_w2l_phone');
			//var comments = rec.getFieldValue('custrecord_w2l_comments');
			
			//Contact
			var frstName = rec.getFieldValue('custrecord_w2l_firstname');			
			var lstName = rec.getFieldValue('custrecord_w2l_lastname');	
			
			//Address
			var address1 = rec.getFieldValue('custrecord_w2l_address');						
			var city = rec.getFieldValue('custrecord_w2l_city');
			var state = rec.getFieldValue('custrecord_w2l_province');			
			var zipostal = rec.getFieldValue('custrecord_w2l_postal');
			var cntry = rec.getFieldValue('custrecord_w2l_country');
			
			//COUNTRIES
			if(cntry == '37'){cntry = 'CA';}
			if(cntry == '230'){cntry = 'US';}
			if(cntry == '77'){cntry = 'GB';}
			if(cntry == '14'){cntry = 'AU';} //AUSTRALIA
			if(cntry == '57'){cntry = 'DE';} //GERMANY
			if(cntry == '84'){cntry = 'GL';} //GREENLAND	
			if(cntry == '105'){cntry = 'IN';} //INDIA
			if(cntry == '101'){cntry = 'ID';} //INDONASIA
			if(cntry == '110'){cntry = 'IT';} //ITALY
			if(cntry == '166'){cntry = 'NL';} //NETHERLANDS			
			if(cntry == '167'){cntry = 'NO';} //NORWAY			
			if(cntry == '197'){cntry = 'SG';} //SINGAPORE
			
			//CANADA PROVINCES
			if(state == '101'){state = 'AB';}
			if(state == '102'){state = 'BC';}
			if(state == '103'){state = 'MB';}
			if(state == '104'){state = 'NB';}
			if(state == '105'){state = 'NL';}
			if(state == '106'){state = 'NT';}	
			if(state == '107'){state = 'NS';}
			if(state == '108'){state = 'NU';}
			if(state == '109'){state = 'ON';}
			if(state == '110'){state = 'PE';}
			if(state == '111'){state = 'QC';}
			if(state == '112'){state = 'SK';}
			if(state == '113'){state = 'YT';}
			//UNITED STATES
			if(state == '0'){state = 'AL';} //Alabama
			if(state == '1'){state = 'AK';} //Alaska
			if(state == '2'){state = 'AZ';} //Arizona
			if(state == '3'){state = 'AR';} //Arkansas
			if(state == '4'){state = 'CA';} //California
			if(state == '5'){state = 'CO';} //Colorado
			if(state == '6'){state = 'CT';} //Connecticut
			if(state == '7'){state = 'DE';} //Delaware
			if(state == '8'){state = 'DC';} //District of Columbia
			if(state == '9'){state = 'FL';} //Florida
			if(state == '10'){state = 'GA';} //Georgia
			if(state == '11'){state = 'HI';} //Hawaii
			if(state == '12'){state = 'ID';} //Idaho
			if(state == '13'){state = 'IL';} //Illinois
			if(state == '14'){state = 'IN';} //Indiana
			if(state == '15'){state = 'IA';} //Iowa
			if(state == '16'){state = 'KS';} //Kansas
			if(state == '17'){state = 'KY';} //Kentucky			
			if(state == '18'){state = 'LA';} //Louisiana
			if(state == '19'){state = 'ME';} //Maine
			if(state == '20'){state = 'MD';} //Maryland
			if(state == '21'){state = 'MA';} //Massachusetts
			if(state == '22'){state = 'MI';} //Michigan
			if(state == '23'){state = 'MN';} //Minnesota
			if(state == '24'){state = 'MS';} //Mississippi
			if(state == '25'){state = 'MO';} //Missouri
			if(state == '26'){state = 'MT';} //Montana
			if(state == '26'){state = 'NE';} //Nebraska
			if(state == '28'){state = 'NV';} //Nevada
			if(state == '29'){state = 'NH';} //New Hampshire
			if(state == '30'){state = 'NJ';} //New Jersey
			if(state == '31'){state = 'NM';} //New Mexico
			if(state == '32'){state = 'NY';} //New York
			if(state == '33'){state = 'NC';} //North Carolina
			if(state == '34'){state = 'ND';} //North Dakota
			if(state == '35'){state = 'OH';} //Ohio
			if(state == '36'){state = 'OK';} //Oklahoma
			if(state == '37'){state = 'OR';} //Oregon
			if(state == '38'){state = 'PA';} //Pennsylvania
			if(state == '39'){state = 'PR';} //Puerto Rico
			if(state == '40'){state = 'RI';} //Rhode Island			
			if(state == '41'){state = 'SC';} //South Carolina			
			if(state == '42'){state = 'SD';} //South Dakota
			if(state == '43'){state = 'TN';} //Tennessee
			if(state == '44'){state = 'TX';} //Texas
			if(state == '45'){state = 'UT';} //Utah
			if(state == '46'){state = 'VT';} //Vermont
			if(state == '47'){state = 'VA';} //Virginia
			if(state == '48'){state = 'WA';} //Washington
			if(state == '49'){state = 'WV';} //West Virginia
			if(state == '50'){state = 'WI';} //Wisconsin
			if(state == '51'){state = 'WY';} //Wyoming
			if(state == '52'){state = 'AE';} //Armed Forces Europe			
			if(state == '53'){state = 'AA';} //Armed Forces America
			if(state == '54'){state = 'AP';} //Armed Forces Pacific

//------------------------------------------------------------------------------------------------------
			
			var webRecord = nlapiCreateRecord('lead',  {recordmode: 'dynamic'});		
				//Company
				webRecord.setFieldValue( 'companyname', cmpnyName);
				webRecord.setFieldValue( 'url', webSite);
				//cntRecord.setFieldValue( 'email', email);
				webRecord.setFieldValue( 'phone', phone);				
				webRecord.setFieldValue( 'entitystatus', leadStatusParam); // Lead Qualified
				webRecord.setFieldValue( 'leadsource', leadSourceParam); // Lead Source	
				//webRecord.setFieldValue( 'weblead', 'T'); 
									
				var bodySubRecord = webRecord.createCurrentLineItemSubrecord('addressbook', 'addressbookaddress');
				bodySubRecord.setFieldValue('country', cntry);
				bodySubRecord.setFieldValue('attention', frstName+' '+lstName);
				bodySubRecord.setFieldValue('addr1', address1);
				bodySubRecord.setFieldValue('city', city);
				bodySubRecord.setFieldValue('state', state);
				bodySubRecord.setFieldValue('zip', zipostal);
				bodySubRecord.commit();
				webRecord.commitLineItem('addressbook');

				var id = nlapiSubmitRecord(webRecord);			

			//Contact			
			var cntRecord = nlapiCreateRecord( 'contact');
				cntRecord.setFieldValue( 'company', id);		
				cntRecord.setFieldValue( 'firstname', frstName);
				cntRecord.setFieldValue( 'lastname', lstName);
				cntRecord.setFieldValue( 'email', email);
				cntRecord.setFieldValue( 'phone', phone);
				
			nlapiSubmitRecord(cntRecord, true);
								
			var html = '<html><body>Contact has been sucessfully added as a Lead <br><br>' ;
			html = html + '<a href="https://system.netsuite.com/app/common/entity/custjob.nl?id='+id+'" target="_blank" >View Record</a>' ; 
			
			response.write(html);	
	
 
}
