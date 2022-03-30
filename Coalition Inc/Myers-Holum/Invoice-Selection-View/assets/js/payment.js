/* eslint-disable */

function goToPayment(customerId) {
    $('.button-loader').show();

    const selectedInvoices = [];
    $('#invoice-table tbody tr').map(function(index, row) {
      var checkbox = $(row).find('input[type="checkbox"]');
      if (checkbox.length) {
        var status = checkbox.prop('checked');
        if (status) selectedInvoices.push(row.id);
      }
    });

    var data = $.ajax({
      url: redirectEndpoint()+'&customerId='+customerId,
      type: 'POST',
      dataType: 'jsonp',
      beforeSend: function() {
        $('#inv-submit-button').text('Submitting...');
        $('#inv-submit-button').attr('disabled', true);
      },
      data: {
        invoices: selectedInvoices.join(',')
      },
      async: false,
      complete: function(data) {
        console.log(data);
        var url = JSON.parse(data.responseText).sessionUrl;

        // TODO Setup redirect to web app
        if (url) window.location.replace(url);
      }
      })
}

$(document).ready(function() {
  var searchParams = new URLSearchParams(window.location.search);
  var customerId = searchParams.get('customerId');
  document.querySelectorAll('.inv-submit-button').forEach(function(element) {
    element.onclick = function(event) {
      const name = event.target.name;
      if (name === 'agency-submit') {
        event.preventDefault();
        goToPayment(customerId);
      }
    };
    return;
  });
});
