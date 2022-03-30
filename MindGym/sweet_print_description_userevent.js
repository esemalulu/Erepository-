/**
 * Before submit user event
 *
 * @param type
 * @return void
 */
function beforeSubmit(type)
{
  try {
    nlapiLogExecution('DEBUG', 'Before submit', '');
    nlapiLogExecution('DEBUG', 'Type', type);
    var consolidatedForm = 107; // todo: script parameter
    var consolidatedInvoice = nlapiGetFieldValue('custbody_invco_invoice');
    var customForm = nlapiGetFieldValue('customform');
    var recordId = nlapiGetRecordId();
              
    switch (type.toLowerCase()) {
      case 'delete':
      case 'edit':
      case 'create':
        if (customForm == consolidatedForm) {
          break; // Do nothing
        }
        
        // Update print description on every item
        nlapiLogExecution('DEBUG', 'Update print description', '');
        var bookingDate = nlapiGetFieldValue('custbody_bo_date');
        var line = 0;
        var j = 1, m = nlapiGetLineItemCount('item') + 1;
        for (;j < m; j++) {
          line++;
          nlapiLogExecution('DEBUG', 'Get item', '');
          var printDescription = new Array();
          
          // Get item display name
          var item = nlapiGetLineItemValue('item', 'item', line);
          if (item != null) {
            var itemDisplayName = nlapiLookupField('item', item, 'displayname')
            nlapiLogExecution('DEBUG', 'Item', 'item=' + item + '|itemDisplayName=' + itemDisplayName);
          }
          
          // Add booking date and course display name
          var course = nlapiGetLineItemValue('item', 'custcol_course', line);
          if (course != null) {
          
            // Booking date
            if (bookingDate != null) {
              date = new Date(bookingDate);
              printDescription.push(sweet_dateFormat('dd mmm yyyy'));
            }
            
            // Course display name
            var courseName = nlapiLookupField('customrecord_course', course, 'custrecord_course_display_name');
            nlapiLogExecution('DEBUG', 'Course', 'course=' + course + '|courseName='+courseName);
            printDescription.push(itemDisplayName + ' : ' + courseName);
            
          } else {
          
            // Only add item display name
            printDescription.push(itemDisplayName);
          }
          
          // Set print description
          printDescription = printDescription.join(', ');
          nlapiLogExecution('DEBUG', 'Set print description', 'printDescription=' + printDescription);
          nlapiSetLineItemValue('item', 'custcol_print_description', line, printDescription);
        }

        break;
      default:
        // Do nothing
    }
  } catch (e) {
    if (e instanceof nlobjError ) {
      nlapiLogExecution('DEBUG', 'System error', e.getCode() + ' ' + e.getDetails());
    } else {
      nlapiLogExecution('DEBUG', 'Unexpected error', e.toString());
    }
    throw e;
  }
}
