import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import contexts and util modules
import { FormattedMessage, intlShape } from '../../../util/reactIntl.js';
import { propTypes } from '../../../util/types.js';
import { getPropsForCustomTransactionFieldInputs } from '../../../util/fieldHelpers.js';
import { requiredFieldArrayCheckbox } from '../../../util/validators.js';

// Import shared components
import {
  CustomExtendedDataField,
  FieldCheckboxGroup,
  FieldTextInput,
  Form,
  NamedLink,
  PrimaryButton,
} from '../../../components/index.js';

import css from './MakeOfferForm.module.css';

// Note: NamedLink doesn't forward a target attribute, so this navigates in the
// same tab.
const policiesLink = (
  <NamedLink name="TermsOfServicePage">
    <FormattedMessage id="MakeOfferPage.policiesLinkText" />
  </NamedLink>
);

const FinePrint = ({ stripeConnected }) => {
  if (stripeConnected) {
    return (
      <div className={css.finePrint}>
        <FormattedMessage id="MakeOfferPage.finePrint" />
      </div>
    );
  }

  const payoutDetailsWarningLink = (
    <NamedLink name="StripePayoutPage">
      <FormattedMessage id="MakeOfferPage.payoutDetailsWarningLink" />
    </NamedLink>
  );

  return (
    <div className={css.finePrint}>
      <FormattedMessage
        id="MakeOfferPage.payoutDetailsWarning"
        values={{ payoutDetailsWarningLink }}
      />
    </div>
  );
};

/**
 * Make offer step in the default-negotiation process.
 * It's provider's job to make offer for "request" type of listings.
 *
 * @param {Object} props - The component props.
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled.
 * @param {string} props.processName - The process name.
 * @param {propTypes.listing} props.listing - The listing.
 * @param {string} props.listingTitle - The listing title.
 * @param {string} props.title - The title.
 * @param {intlShape} props.intl - The intl object.
 * @param {Object} props.config - The config object.
 * @param {propTypes.error} props.initiateInquiryError - The error message.
 */
export const MakeOfferForm = props => {
  const {
    intl,
    config,
    price,
    providerDefaultMessage,
    stripeConnected,
    errorMessageComponent: ErrorMessage,
    makeOfferError,
    onSubmit,
    transactionFieldInitialValues = {},
    ...restProps
  } = props;

  const providerDefaultMessageMaybe = providerDefaultMessage ? { providerDefaultMessage } : {};
  const priceMaybe = price ? { quote: price } : {};
  const initialValuesMaybe = {
    ...providerDefaultMessageMaybe,
    ...priceMaybe,
    ...transactionFieldInitialValues,
  };

  return (
    <FinalForm
      initialValues={initialValuesMaybe}
      mutators={{ ...arrayMutators }}
      onSubmit={onSubmit}
      keepDirtyOnReinitialize={true}
      {...restProps}
      render={formRenderProps => {
        const {
          rootClassName,
          className,
          submitButtonWrapperClassName,
          formId,
          handleSubmit,
          inProgress,
          invalid,
          authorDisplayName,
          transactionFieldConfigs = [],
        } = formRenderProps;

        const classes = classNames(rootClassName || css.root, className);
        const submitInProgress = inProgress;
        const submitDisabled = invalid || submitInProgress || !stripeConnected;

        const hasTransactionFieldConfigs = transactionFieldConfigs.length > 0;
        const transactionFieldsProps = getPropsForCustomTransactionFieldInputs(
          transactionFieldConfigs,
          false
        );

        return (
          <Form className={classes} onSubmit={handleSubmit} enforcePagePreloadFor="SaleDetailsPage">
            <div className={css.section}>
              {/* Note: the quote is not asked from the provider. It comes from
                  the job's compensation through initialValues, and stays in the
                  form values even though no field is registered for it. */}

              {hasTransactionFieldConfigs ? (
                <div className={css.transactionFieldsContainer}>
                  {transactionFieldsProps.map(({ key, ...fieldProps }) => (
                    <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                  ))}
                </div>
              ) : null}

              <FieldTextInput
                className={css.fieldDefaultMessage}
                type="textarea"
                name="providerDefaultMessage"
                id={formId ? `${formId}.message` : 'message'}
                labelClassName={css.sectionHeading}
                label={intl.formatMessage({
                  id: 'MakeOfferPage.defaultMessageLabel',
                })}
                placeholder={intl.formatMessage(
                  {
                    id: 'MakeOfferPage.defaultMessagePlaceholder',
                  },
                  { authorDisplayName }
                )}
              />

              <FieldCheckboxGroup
                className={css.policies}
                name="policies"
                id={formId ? `${formId}.policies-accepted` : 'policies-accepted'}
                optionLabelClassName={css.policiesLabel}
                options={[
                  {
                    key: 'platform-policies',
                    label: intl.formatMessage(
                      { id: 'MakeOfferPage.policiesAcceptText' },
                      { policiesLink }
                    ),
                  },
                ]}
                validate={requiredFieldArrayCheckbox(
                  intl.formatMessage({ id: 'MakeOfferPage.policiesAcceptRequired' })
                )}
              />
            </div>

            <div className={submitButtonWrapperClassName}>
              <ErrorMessage error={makeOfferError} />
              <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
                <FormattedMessage id="MakeOfferPage.submitButtonText" />
              </PrimaryButton>
              <FinePrint stripeConnected={stripeConnected} />
            </div>
          </Form>
        );
      }}
    />
  );
};

export default MakeOfferForm;
