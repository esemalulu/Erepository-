/**
 * 
 *
 * @return {Void}
 */
function form_beforeLoad(type, form) {
    var i = 1, n = nlapiGetLineItemCount('item')+1;

    nlapiLogExecution('DEBUG', 'Info', 'Number of Items = ' + n );

    for (;i < n; i++) {
        var jobId = nlapiGetLineItemValue('item', 'lineentity', i);
        nlapiLogExecution('DEBUG', 'Info', 'jobId = ' + jobId );

        if(jobId && jobId.length > 0)
        {
            var job = nlapiLoadRecord('job', jobId);
            if(job)
            {
                nlapiLogExecution('DEBUG', 'Info', 'job loaded');
                if(!job.getFieldValue('custentity_bo_coach'))
                {
                    continue;
                }
                var coachAddress = job.getFieldValue('custentity_bo_coachaddr');
                if(coachAddress && coachAddress.length > 0)
                {
                     coachAddress = coachAddress.replace(/, ,*/g,',');

                    if(type == 'view')
                        var addr = coachAddress.replace(/,/g,'<br>');
                    else
                        var addr = coachAddress.replace(/,/g,'\n');

                    nlapiSetFieldValue('custbody_coachaddr', addr);
                    break;
                }
            }

        }
    }

 }

