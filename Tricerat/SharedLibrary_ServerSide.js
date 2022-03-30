/// <reference path="References\Explore\SuiteScript\SuiteScriptAPI.js" />

var Logger =
{
	LogType:
	{
		Debug: "DEBUG"
		, Error: "ERROR"
		, Audit: "AUDIT"
	},
	Write: function(type, title, details)
	{
		/// <summary>Writes a message to the execution log.</summary>
		/// <param name="type" type="Logger.LogType">Log Type</param>
		/// <param name="title" type="string"></param>
		/// <param name="details" type="string"></param>

		nlapiLogExecution(type, title, details);
	},
	FormatException: function(ex)
	{
		/// <summary>Returns the formatted error message.</summary>
		/// <param name="ex" type="Error">Error</param>

		var msg = "";

		if (ex instanceof nlobjError)
			msg += "Script Name: " + ex.getUserEvent() + "\nError Code: " + ex.getCode() + "\nError Details: " + ex.getDetails() + "\n\nStack Trace: " + ex.getStackTrace();
		else
			msg += ex.toString();

		return msg;
	}
}

var Messaging =
{
	SendMessage: function(from, to, subject, body)
	{
		/// <summary>Sends an email to specified recipient.</summary>
		/// <param name="from" type="string" mayBeNull="false">The Internal ID of an employee indicating the sender of the email.</param>
		/// <param name="to" type="string" mayBeNull="false">Recipients email address.</param>
		/// <param name="subject" type="string" mayBeNull="false">Email subject</param>
		/// <param name="body" type="string" mayBeNull="false">Email body</param>

		nlapiSendEmail(from, to, subject, body, null, null, null);
	}
}

var Governance =
{
	StartTime: new Date(),
	ElapsedTime: function()
	{
		/// <summary>Gets the number of seconds elapsed since the script has started.</summary>
		/// <returns type="Number" mayBeNull="false">Number in seconds.</returns>

		var elapsedTime = ((new Date().getTime() - this.StartTime.getTime()) / 1000);
		Logger.Write(Logger.LogType.Debug, "Governance.ElapsedTime()", "Time elapsed since script start: " + elapsedTime);
		return elapsedTime;
	},
	RemainingUsage: function()
	{
		/// <summary>Gets the number of units remaining for script execution.</summary>
		/// <returns type="Number" mayBeNull="false">Number of units remaining.</returns>

		var unitRemaining = parseInt(nlapiGetContext().getRemainingUsage());
		Logger.Write(Logger.LogType.Debug, "Governance.RemainingUsage()", unitRemaining + " units remaining for this script execution.");
		return unitRemaining;
	}
}

function catchErrors(e, functionName, script) {
    var errorText;
    if (e instanceof nlobjError) {
        errorText = 'UNEXPECTED ERROR: ' + '\n\n' +
					'Script Name: ' +
					e.getUserEvent() +
					'\n' +
					'Function Name: ' +
					functionName +
					'\n' +
					'Error Code: ' +
					e.getCode() +
					'\n' +
					'Error Details: ' +
					e.getDetails() +
					'\n\n' +
					'Stack Trace: ' +
					e.getStackTrace();
    }
    else {
        errorText = 'UNEXPECTED ERROR: ' + '\n\n' + 'Function Name:' + functionName + '\n\nError Details: ' + e.toString();
    }
    nlapiLogExecution('ERROR', 'UNEXPECTED ERROR', errorText);
    nlapiSendEmail("253847", "tricerat@exploreconsulting.com", "Unexpected error in " + script + " has occured.", errorText, null, null, null);
}