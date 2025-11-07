// Locate the "Reject" button and attach a click handler
try {
  NS.jQuery('input[type="button"][value="Reject"]').on('click', function (e) {
    try {
      var reason = null;
      do {
        reason = prompt('Please provide a rejection reason:');
      } while (!reason);

      nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), "custbody_cp_rejectionreason", reason, false);
      location.reload();

    } catch (e) {
      console.log(e);
    }
  });
} catch (e) {
  console.log(e);
}