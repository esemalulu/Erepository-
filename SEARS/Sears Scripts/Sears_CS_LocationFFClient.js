/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2016     bfeliciano
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment.
 * @appliedtorecord recordType
 *
 * @param {String} type Access mode: create, copy, edit
 * @returns {Void}
 */
function pageInit_LocationFFHelper(type)
{
	var logTitle = 'LocationHelper';
	try
	{
		nlapiLogExecution('DEBUG', logTitle, '** Start script ' + type);
		alert(1);
	}
	catch (error)
	{

		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			error = nlapiCreateError('99999', error.toString());
		}

		throw error;
	}
}

(function(){
	return false;
	var document = window.document || self.document;
	function bindReady(handler)
	{

		var called = false;

		function ready()
		{
			if (called)
			{
				return


			}
			called = true
			handler()
		}

		if (document.addEventListener)
		{ // native event
			document.addEventListener("DOMContentLoaded", ready, false)
		}
		else
			if (document.attachEvent)
			{ // IE

				try
				{
					var isFrame = window.frameElement != null
				}
				catch (e)
				{}

				// IE, the document is not inside a frame
				if (document.documentElement.doScroll && !isFrame)
				{
					function tryScroll()
					{
						if (called)
							return

						try
						{
							document.documentElement.doScroll("left")
							ready()
						}
						catch (e)
						{
							setTimeout(tryScroll, 10)
						}
					}
					tryScroll()
				}

				// IE, the document is inside a frame
				document.attachEvent("onreadystatechange", function()
				{
					if (document.readyState === "complete")
					{
						ready()
					}
				})
			}

		// Old browsers
		if (window.addEventListener)
		{
			window.addEventListener('load', ready, false)
		}
		else
			if (window.attachEvent)
			{
				window.attachEvent('onload', ready)
			}
			else
			{
				var fn = window.onload // very old browser, copy old onload
				window.onload = function()
				{ // replace by new onload and call the old one
					fn && fn()
					ready()
				}
			}
	}

	bindReady(function(){
		alert('browser ready!');

		var lineCount = nlapiGetLineItemCount('item');
		alert(lineCount);


	});
})();

/**
 *
 * @param {String} type
 * @param {nlobjForm} form
 * @param {nlobjRequest} request
 */
function beforeLoad_LocationFFHelper(type, form, request)
{
	var logTitle = 'LocationHelper';
	var CACHE = {};
	try
	{
		nlapiLogExecution('DEBUG', logTitle, '** Start script: ' + type);
		if (type != 'view')
		{
			return;
		}

		var itemSublist = form.getSubList('item');
		itemSublist.addField('custpage_createpo', 'text', 'CREATE PO');

		var lineCount = nlapiGetLineItemCount('item');
		for (var line=1; line<=lineCount; line++)
		{
			var lineCreatePO = nlapiGetLineItemValue('item', 'createpo', line);
			nlapiLogExecution('DEBUG',logTitle, '##line '+line+' Create PO: ' + lineCreatePO);

			if (lineCreatePO)
			{
				if (!lineCreatePO.match(/Drop.+?Ship/ig) )
				{
					var cacheKey = ['GetId',lineCreatePO].join('::');
					if (CACHE[cacheKey] == null)
					{
						var arrIdSearch = nlapiSearchRecord('transaction', null,
						[
								(new nlobjSearchFilter('tranid', null, 'is', lineCreatePO)),
								(new nlobjSearchFilter('mainline', null, 'is', 'T'))
						]);

						if (arrIdSearch && arrIdSearch.length)
						{
							var linkURL = nlapiResolveURL('RECORD', 'purchaseorder', arrIdSearch[0].getId());
							CACHE[cacheKey] = '<a class="dottedlink" href="'+linkURL+'" target="_blank">'+lineCreatePO+'</a>';
							lineCreatePO = CACHE[cacheKey];
						}
					}
					nlapiSetLineItemValue('item', 'custpage_createpo', line, lineCreatePO);
				}
			}
		}

		var fldCreatePO = itemSublist.getField('createpo');
		fldCreatePO.setDisplayType('hidden');

		return true;

	}
	catch (error)
	{

		if (error.getDetails != undefined)
		{
			nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
		}
		else
		{
			nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
			error = nlapiCreateError('99999', error.toString());
		}

		throw error;
	}
}
