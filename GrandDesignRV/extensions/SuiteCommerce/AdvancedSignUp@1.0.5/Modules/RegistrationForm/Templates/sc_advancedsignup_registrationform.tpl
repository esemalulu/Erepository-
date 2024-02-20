<section class="advancedsignup-registrationform-container">
  <h1 class="advancedsignup-registrationform-header">{{ formHeader }}</h1>
  <div class="advancedsignup-registrationform-body">
    {{#if displayForm}}
    <div class="advancedsignup-registrationform-wrapper">
        <div class="advancedsignup-registrationform-form">
          <form>
            <h2 class="advancedsignup-registrationform-title">{{ formTitle }}</h2>
            <p class="advancedsignup-registrationform-subtitle">{{ formSubTitle }}</p>
            <p class="advancedsignup-registrationform-message" data-error-bin-message=""></p>
            <div data-view="RegistrationForm.Fields"></div>
            <button
              type="submit"
              class="advancedsignup-registrationform-button"
              data-action="">{{ submitButtonLabel }}</button>
          </form>
        </div>
    </div>
    <div class="advancedsignup-cmsarea-wrapper">
      <div class="advancedsignup-form-default-layout-cms-area"
         data-cms-area-filters="path" data-cms-area="advancedsignup-form-cms-area-1"></div>
    </div>
    {{else}}
      <div class="advancedsignup-registrationform-message-success">
        <h2 class="advancedsignup-registrationform-message-text">
          {{ confirmationTitle }}
        </h2>
        <p class="advancedsignup-registrationform-message-text">
          {{{ confirmationMessage }}}
        </p>
      </div>
    {{/if}}
  </div>
</section>