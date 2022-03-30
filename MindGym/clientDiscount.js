
function main(type)
{
  if (type != 'item') {
    return true;
  }
  
  var i = nlapiGetCurrencyLineItemIndex('item');
  alert('line ' + i + ' was modified');
  return true;
}

