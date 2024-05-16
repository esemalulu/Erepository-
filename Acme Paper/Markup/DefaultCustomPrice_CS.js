var COL_GROSS_MARGIN = 'custcol_acme_markup_percent';

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */
function setPriceFieldChanged(type, name, linenum)
{
    var fCost, fRate, fGrossMargin;

    if (type == 'item' && name == 'item')
    {
        setTimeout(function ()
        {
            debugger;
            nlapiSetCurrentLineItemValue('item', 'price', '-1');
            nlapiSetCurrentLineItemValue('item', 'custcol_acme_markup_percent', '');
        }, 3000);
    }

    if (type == 'item' && name == 'rate')
    {
        fRate = !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item', 'rate'))) ? parseFloat(nlapiGetCurrentLineItemValue('item', 'rate')) : 0;
        fCost = !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item', 'costestimate'))) ? parseFloat(nlapiGetCurrentLineItemValue('item', 'costestimate')) : 0;

        //((Sell Price / Est. Extended Cost) - 1)
        //fGrossMargin = ((fRate/fCost) - 1) * 100;
        fGrossMargin = (1 - (fCost / fRate)) * 100;

        if (fRate > 0 && fCost > 0 && fGrossMargin > 0 && !isNaN(fGrossMargin))
        {
            //nlapiSetCurrentLineItemValue('item',COL_GROSS_MARGIN,fGrossMargin.toFixed(2), false);
        }
    }

    if (type == 'item' && name == COL_GROSS_MARGIN)
    {
        fGrossMargin = !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item', COL_GROSS_MARGIN))) ? parseFloat(nlapiGetCurrentLineItemValue('item', COL_GROSS_MARGIN)) / 100 : 0;
        fCost = !isNaN(parseFloat(nlapiGetCurrentLineItemValue('item', 'costestimate'))) ? parseFloat(nlapiGetCurrentLineItemValue('item', 'costestimate')) : 0;

        //(Est. Extended Cost x (1 + Gross Margin %))
        //fRate = fCost * (1 + fGrossMargin);
        fRate = fCost / (1 - fGrossMargin);

        if (fGrossMargin > 0 && fCost > 0 && fRate > 0 && !isNaN(fRate))
        {
            //nlapiSetCurrentLineItemValue('item','rate',fRate.toFixed(2), false);
        }
    }
}