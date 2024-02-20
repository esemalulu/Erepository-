{{#if showContainer }}
  <div>
    {{#each field}}
      {{#if visible}}
        <div class="custom-pdp-fields-line-container">
          <span class="custom-pdp-fields-label">{{{parsedText}}}</span>
        </div>
      {{/if}}
    {{/each}}
  </div>
{{/if}}
