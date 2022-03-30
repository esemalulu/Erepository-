
function recalc(type)
{
  if (type != 'item') {
    return true;
  }
  
  var line = nlapiGetCurrentLineItemIndex('item');
  
  // Add discount line
  //line += 1;
  try {
    nlapiInsertLineItem('item');
    //nlapiSetLineItemValue('item', 'amount', line, 100);
  } catch (err) {
    alert(err.description);
    return false;
  }

  alert('script success');
  return true;
}

