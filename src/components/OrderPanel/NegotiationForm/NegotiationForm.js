import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { offerAvailability } from '../../../util/api';

import { Form, PrimaryButton } from '../..';
import MissingJobRequirements from '../MissingJobRequirements/MissingJobRequirements';

import css from './NegotiationForm.module.css';

// Reasons the backend gives for turning an offer down.
const JOB_TAKEN = 'jobTaken';

const renderForm = formRenderProps => {
  // FormRenderProps from final-form
  const {
    formId,
    className,
    rootClassName,
    handleSubmit,
    payoutDetailsWarning,
    isOwnListing,
    missingRequirements,
    checkInProgress,
    finePrintComponent: FinePrint,
  } = formRenderProps;
  const classes = classNames(rootClassName || css.root, className);

  const { specialisations = [], certifications = [] } = missingRequirements || {};
  const hasMissingRequirements = specialisations.length > 0 || certifications.length > 0;

  return (
    <Form id={formId} onSubmit={handleSubmit} className={classes}>
      <div className={css.submitButton}>
        <MissingJobRequirements missingRequirements={missingRequirements} />

        <PrimaryButton
          type="submit"
          inProgress={checkInProgress}
          disabled={hasMissingRequirements || checkInProgress}
        >
          <FormattedMessage id="NegotiationForm.ctaButton" />
        </PrimaryButton>
        <FinePrint
          payoutDetailsWarning={payoutDetailsWarning}
          isOwnListing={isOwnListing}
          omitYouWontBeChargedMessage={true}
        />
      </div>
    </Form>
  );
};

/**
 * A form to redirect user to the MakeOfferPage. It can be used to initialize the page if needed.
 * Note: by default, the form just shows a submit button.
 *
 * A technician can only make an offer once their profile covers what the job
 * asks for - its trade among their specialisations, and its required
 * certifications uploaded. A logged out visitor is let through: submitting
 * takes them to the login page, and only then can their profile be compared.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} props.formId - The ID of the form
 * @param {Object} [props.missingRequirements] - From getMissingJobRequirements. Computed by
 * OrderPanel, so that this form and the mobile CTA button agree on what is blocked.
 * @param {string} [props.listingId] - Used to check how many offers the job already has
 * @param {Function} props.onSubmit - The function to handle the form submission
 * @returns {JSX.Element}
 */
const NegotiationForm = props => {
  const intl = useIntl();
  const { listingId, onSubmit } = props;
  const initialValues = {};

  const [checkInProgress, setCheckInProgress] = useState(false);

  // How many offers a job already has is only known to the backend, so it is
  // asked on submit rather than on every render of the listing page.
  const handleSubmit = values => {
    if (!listingId) {
      return onSubmit(values);
    }

    setCheckInProgress(true);

    return offerAvailability({ listingId })
      .then(response => {
        setCheckInProgress(false);

        if (response?.canMakeOffer === false) {
          const messageId =
            response.reason === JOB_TAKEN
              ? 'NegotiationForm.jobTaken'
              : 'NegotiationForm.offerLimitReached';
          window.alert(intl.formatMessage({ id: messageId }, { maxOffers: response.maxOffers }));
          return;
        }

        return onSubmit(values);
      })
      .catch(() => {
        // The transition itself is still guarded by the transaction process, so
        // a failed check shouldn't be what stops a legitimate offer.
        setCheckInProgress(false);
        return onSubmit(values);
      });
  };

  return (
    <FinalForm
      initialValues={initialValues}
      {...props}
      onSubmit={handleSubmit}
      intl={intl}
      checkInProgress={checkInProgress}
      render={renderForm}
    />
  );
};

export default NegotiationForm;
