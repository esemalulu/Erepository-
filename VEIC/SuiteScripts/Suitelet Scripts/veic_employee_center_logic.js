/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/search', 'N/record'], function (ui, search, record) {
  function onRequest(context) {
    const request = context.request;
    const response = context.response;

    if (request.method === 'GET') {
      const jobId = request.parameters.custscript_sl_job_id;
      if (!jobId) {
        response.write(JSON.stringify({ error: 'Missing jobId' }));
        return;
      }

      try {
        const job = record.load({
          type: record.Type.JOB,
          id: jobId
        });

        const classId = job.getValue({ fieldId: 'custentity_pc_class' });
        const className = job.getText({ fieldId: 'custentity_pc_class' });
        const requireComments = job.getText({ fieldId: 'custentity_veic_require_comments_on_time' });

        response.setHeader({
          name: 'Content-Type',
          value: 'application/json'
        });

        response.write(JSON.stringify({ classId: classId, className: className, requireComments: requireComments }));
      } catch (e) {
        response.write(JSON.stringify({ error: e.message }));
      }
    }
  }

  return {
    onRequest: onRequest
  };
});
