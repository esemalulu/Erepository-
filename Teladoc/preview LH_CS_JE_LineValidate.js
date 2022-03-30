/*
 *Created Date	: Jul 09,2019
 *Script Author	: Gautam Deo	
 *ApiVersion	: 2.x
 *Script Type	: Client Script (NS-548)  
 *Note			: Script define the validaion check on JE
 *script url	: app/common/scripting/script.nl?id=563
*/

/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope SameAccount
 */
define(['N/error','N/ui/message','N/runtime','N/search'],
    function(error,message,runtime,search) 
	{        
       		
		/**
		 *isValidateLineLevel
         *Process line-level validation on JE
         *@param (Object) context
		 *@return boolean objects
         */		
		function isValidateLineLevel(context)
		{
			try 
			{	
					//Block Start to get script parameters passed via Script
					var scriptObj = runtime.getCurrentScript();						
					var glAccTypeStr = scriptObj.getParameter({name: 'custscript_gl_account_type'}); 					
					var glAccountTypeArr = getScriptParamArray(glAccTypeStr); //Get the script parameter Obj in Array
					//Block End 
					
					var boolFlag=true;
					var currentRecord = context.currentRecord;
					var sublistName = context.sublistId;
					var acctId = currentRecord.getCurrentSublistValue({
						sublistId: sublistName,
						fieldId: 'account'
					});
					if(acctId!=null && acctId!='')
					{
						var acctName = currentRecord.getCurrentSublistText({
						sublistId: sublistName,
						fieldId: 'account'
						});
												
					
						var accTypeObj = search.lookupFields({
							type: search.Type.ACCOUNT,
							id: acctId,
							columns: ['type']
						});
	
						var acctType = accTypeObj.type[0]['text'];		
						//alert("acctId: "+acctId+", line acctType:"+acctType+", AccountTypeArr:"+glAccountTypeArr);
						
						var searchColms = ['custrecord_liv_name_validation'];					
						var accFeildObj = search.lookupFields({
						type: search.Type.ACCOUNT,
						id: acctId,
						columns:searchColms
						});
						var useForNameValidFlag = accFeildObj.custrecord_liv_name_validation;
						//alert("acctId: "+acctId+", useForNameValidFlag:"+useForNameValidFlag, "");
						//Block start to match the script parameter with each line account type
						//if(glAccountTypeArr.indexOf(acctType)>=0) 
						
						if(useForNameValidFlag==true) //modified on 08/07/2019
						{
							var NameDisplay = currentRecord.getCurrentSublistValue({
								sublistId: sublistName,
								fieldId: 'entity_display'
							});
							var NameDisplayText = currentRecord.getCurrentSublistText({
								sublistId: sublistName,
								fieldId: 'entity_display'
							});
							
							if(NameDisplay=='' || NameDisplay=='<Type then tab>')
							{
								alert("Please enter the value for Name for account "+acctName);
								boolFlag=false;
							}
						}
						//Block End
					}
				
				return boolFlag
			} 
			catch (ex)
			{
                /*logExec.debug({
                    title: "Exception raised on line-level validate on JE:",
                    details: ex
                });*/
			
				var errMsg = message.create({
						title: "Error!",
						message: "Exception raised on validate JE.\n"+ex,
						type: message.Type.ERROR					
						});
					errMsg.show();
            }
		}
		/**
		*Define methods to split the string parameters 
		*@param string
		*@return Array object
		*@type  object 		
		*/
		function getScriptParamArray(paramStr)
		{
			try
			{
				var paramArr = [];			
				if(paramStr!=null && paramStr!='')
				{
					var paramStrArr=paramStr.split(",");
					for(var i=0; i< paramStrArr.length; i++)
					{
						paramArr.push(paramStrArr[i].trim());
					}
					
				}				
				return paramArr;
			}
			catch (ex) 
			{
				//log.error("Error occured with getScriptParamArray",ex.message);
				var errMsg = message.create({
						title: "Error!",
						message: "Exception raised on JE for getScriptParamArray.\n"+ex,
						type: message.Type.ERROR					
						});
					errMsg.show();
			}
		}
        		        
        return {						
				validateLine:isValidateLineLevel
        };
    });
	
