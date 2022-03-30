function beforeLoad(type)
{
  if (type.toLowerCase() == 'create') {
    var newRecord = nlapiGetNewRecord();
    newRecord.setFieldValue('discountrate', newRecord.getFieldValue('custbody_membership_discount_rate'));
  }
}
