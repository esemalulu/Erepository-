<div
  id="advancedsignup-registrationform-field-container-{{internalid}}"
  class="advancedsignup-registrationform-field"
  data-type="{{fieldtype}}">
  {{#if isHeading}}
    <h3 class="advancedsignup-registrationform-field-heading">{{label}}</h3>
  {{else if isCheckbox}}
    {{> checkboxField}}
  {{else}}
    {{> inputFieldLabel}}
    {{#if isDate}}
      {{> inputDateField}}
    {{else if isTextInput}}
      {{> inputTextField}}
    {{else if isCountry}}
      {{> inputCountryField}}
    {{else if isState}}
      {{#if stateOptions}}
        {{> inputStateField}}
      {{else}}
        {{> inputTextField}}
      {{/if}}
    {{else if isEmailAddress}}
      {{> inputTextField}}
    {{else if isTelephone}}
      {{> inputTextField}}
    {{else if isZIP}}
      {{> inputTextField}}
    {{else if isTextArea}}
      {{> inputTextAreaField}}
    {{else if isNumber}}
      {{> inputTextField}}
    {{else if isFileUpload}}
      {{> inputFileUploadField}}
    {{/if}}
  {{/if}}
</div>

<!-- htmllint id-no-dup="false" -->
{{#*inline "checkboxField"}}
  <div class="advancedsignup-registrationform-field-checkbox">
    <label class="advancedsignup-registrationform-field-label-checkbox"
      for="advancedsignup-registrationform-field-{{internalid}}">
      <input
        id="advancedsignup-registrationform-field-{{internalid}}"
        class="advancedsignup-registrationform-field-input-checkbox"
        type="checkbox"
        name="{{internalid}}"
        data-validation="control">
      {{label}}
    </label>
  </div>
{{/inline}}

{{#*inline "inputFieldLabel"}}
  <label for="advancedsignup-registrationform-field-{{internalid}}"
    class="advancedsignup-registrationform-field-label">
    {{label}}
    {{#if required}}
      <span class="advancedsignup-registrationform-field-label-required">*</span>
    {{/if}}
  </label>
{{/inline}}

{{#*inline "inputTextAreaField"}}
<div data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <textarea
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-textarea"
      name="{{internalid}}"
      placeholder="{{placeholder}}"
      {{#if isMandatory}}required{{/if}}
      maxlength="{{maxLength}}"></textarea>
  </span>
</div>
{{/inline}}

{{#*inline "inputDateField"}}
<div data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <input
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-date"
      type="date"
      name="{{internalid}}"
      placeholder="{{placeholder}}"
      {{#if isMandatory}}required{{/if}}
      data-field-type="date"
      data-format="yyyy-mm-dd">
  </span>
</div>
{{/inline}}

{{#*inline "inputTextField"}}
<div data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <input
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-text"
      type="{{#if isEmailAddress}}text{{else if isTelephone}}tel{{else if isNumber}}number{{else}}text{{/if}}"
      name="{{internalid}}"
      placeholder="{{placeholder}}"
      {{#if isMandatory}}required{{/if}}
      maxlength="{{maxLength}}">
  </span>
</div>
{{/inline}}

{{#*inline "inputFileUploadField"}}
<div class="advancedsignup-registrationform-field-file-container" data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <input
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-file"
      type="file"
      name="{{internalid}}"
      {{#if isMandatory}}required{{/if}}
      accept="image/png,image/jpeg,.pdf">
    <a
      id="advancedsignup-registrationform-field-clear-{{internalid}}"
      name="{{internalid}}">
      <span
        class="advancedsignup-registrationform-field-file-empty"
        name="{{internalid}}">
      </span>
    </a>
  </span>
</div>
{{/inline}}

{{#*inline "inputCountryField"}}
<div data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <select
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-country"
      name="{{internalid}}"
      {{#if isMandatory}}required{{/if}}
      type="country">
      {{{countryOptions}}}
    </select>
  </span>
</div>
{{/inline}}

{{#*inline "inputStateField"}}
<div data-input="{{internalid}}" data-validation="control-group">
  <span data-validation="control">
    <select
      id="advancedsignup-registrationform-field-{{internalid}}"
      class="advancedsignup-registrationform-field-input-state"
      name="{{internalid}}"
      {{#if isMandatory}}required{{/if}}
      type="state">
      {{{stateOptions}}}
    </select>
  </span>
</div>
{{/inline}}
<!-- htmllint id-no-dup="true" -->
