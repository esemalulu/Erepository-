
/**
 * Temp. Function to place a button to load 
 * @param type
 * @param form
 * @param request
 */
function tempBeforeLoadInv(type, form, request)
{
	if (type == 'view' && nlapiGetRecordType() == 'invoice')
	{
		var tempPrintUrl = nlapiResolveURL('SUITELET',
					'customscript_ax_sl_tempprintinvus',
					'customdeploy_ax_sl_tempprintinvus'
				 );

		form.addButton(
				'custpage_tempbtn', 
				'TEMP: Print In U.S Invoice', 
				'window.open(\''+tempPrintUrl+'&trxid='+nlapiGetRecordId()+
				'\', \'\', \'width=800,height=600,resizable=yes,scrollbars=yes\');return true;'
		);
	}
}


/*** Suitelet ***/
function tempPrintAltInvoice(req, res)
{
	var prop = new Object();
	//Use 210	TEMP MindGym Invoice - PRINT IN US
	prop.formnumber = '210';
	var tempInvPdf = nlapiPrintRecord('TRANSACTION', req.getParameter('trxid'), 'PDF', prop);
	
	log('debug','prop',JSON.stringify(prop));
	
	res.setContentType('PDF',req.getParameter('trxid')+'US_Invoice.pdf','inline');
	res.write(tempInvPdf.getValue());
	
}
