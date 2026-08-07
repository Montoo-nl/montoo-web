import React, { useState, useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
import { getCurrentUserTypeRoles } from '../../../../util/userHelpers';
import {
  Avatar,
  InlineTextButton,
  LinkedLogo,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  NamedLink,
} from '../../../../components';

import TopbarSearchForm from '../TopbarSearchForm/TopbarSearchForm';
import CustomLinksMenu from './CustomLinksMenu/CustomLinksMenu';

import css from './TopbarDesktop.module.css';

const ProfileIcon = () => (
  <svg
    className={css.profileIconSvg}
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.75 14.75C0.75 13.6891 1.17143 12.6717 1.92157 11.9216C2.67172 11.1714 3.68913 10.75 4.75 10.75H12.75C13.8109 10.75 14.8283 11.1714 15.5784 11.9216C16.3286 12.6717 16.75 13.6891 16.75 14.75C16.75 15.2804 16.5393 15.7891 16.1642 16.1642C15.7891 16.5393 15.2804 16.75 14.75 16.75H2.75C2.21957 16.75 1.71086 16.5393 1.33579 16.1642C0.960714 15.7891 0.75 15.2804 0.75 14.75Z"
      stroke="#071745"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <path
      d="M8.75 6.75C10.4069 6.75 11.75 5.40685 11.75 3.75C11.75 2.09315 10.4069 0.75 8.75 0.75C7.09315 0.75 5.75 2.09315 5.75 3.75C5.75 5.40685 7.09315 6.75 8.75 6.75Z"
      stroke="#071745"
      stroke-width="1.5"
    />
  </svg>
);

const SignupLink = () => {
  return (
    <NamedLink id="signup-link" name="SignupPage" className={css.joinUsButton}>
      <span className={css.joinUsLabel}>
        <FormattedMessage id="TopbarDesktop.signup" />
      </span>
      <span className={css.joinUsArrow} aria-hidden="true">
        <svg
          width="34"
          height="34"
          viewBox="0 0 34 34"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21.597 22.1401C21.5001 22.122 21.4077 22.085 21.3251 22.0313C21.2425 21.9775 21.1713 21.908 21.1156 21.8267C21.0599 21.7454 21.0208 21.6539 21.0004 21.5574C20.9801 21.461 20.979 21.3615 20.9971 21.2646L22.4182 13.6607L10.3003 21.9639C10.1362 22.0763 9.9342 22.119 9.73867 22.0825C9.54314 22.0459 9.37013 21.9332 9.2577 21.7691C9.14526 21.6051 9.10262 21.403 9.13914 21.2075C9.17567 21.012 9.28837 20.8389 9.45246 20.7265L21.5704 12.4233L13.9663 11.0035C13.7706 10.967 13.5975 10.8542 13.485 10.69C13.3725 10.5259 13.3299 10.3237 13.3664 10.1281C13.403 9.93244 13.5157 9.75933 13.6799 9.64683C13.8441 9.53434 14.0462 9.49167 14.2419 9.52822L23.6255 11.2811C23.7224 11.2992 23.8148 11.3361 23.8974 11.3899C23.98 11.4437 24.0512 11.5132 24.1069 11.5945C24.1626 11.6758 24.2017 11.7673 24.2221 11.8637C24.2424 11.9602 24.2435 12.0597 24.2254 12.1566L22.4725 21.5402C22.4544 21.6371 22.4174 21.7295 22.3637 21.8121C22.3099 21.8947 22.2404 21.9659 22.1591 22.0216C22.0778 22.0773 21.9863 22.1164 21.8898 22.1368C21.7934 22.1571 21.6939 22.1582 21.597 22.1401Z"
            fill="white"
          />
        </svg>
      </span>
    </NamedLink>
  );
};

const LoginLink = ({ intl }) => {
  return (
    <NamedLink
      id="login-link"
      name="LoginPage"
      className={css.loginIconLink}
      title={intl.formatMessage({ id: 'TopbarDesktop.login' })}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.login' })}
    >
      <ProfileIcon />
    </NamedLink>
  );
};

const InboxLink = ({ notificationCount, inboxTab }) => {
  const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;
  return (
    <NamedLink
      id="inbox-link"
      className={css.topbarLink}
      name="InboxPage"
      params={{ tab: inboxTab }}
    >
      <span className={css.topbarLinkLabel}>
        <FormattedMessage id="TopbarDesktop.inbox" />
        {notificationDot}
      </span>
    </NamedLink>
  );
};

const ProfileMenu = ({
  currentPage,
  currentUser,
  onLogout,
  showManageListingsLink,
  showCreateJobLink,
  intl,
}) => {
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  return (
    <Menu skipFocusOnNavigation={true}>
      <MenuLabel
        id="profile-menu-label"
        className={css.profileMenuLabel}
        isOpenClassName={css.profileMenuIsOpen}
        ariaLabel={intl.formatMessage({ id: 'TopbarDesktop.screenreader.profileMenu' })}
      >
        <Avatar className={css.avatar} user={currentUser} disableProfileLink />
      </MenuLabel>
      <MenuContent className={css.profileMenuContent}>
        {showCreateJobLink ? (
          <MenuItem key="NewListingPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('NewListingPage'))}
              name="NewListingPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.createJobLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        {showManageListingsLink ? (
          <MenuItem key="ManageListingsPage">
            <NamedLink
              className={classNames(css.menuLink, currentPageClass('ManageListingsPage'))}
              name="ManageListingsPage"
            >
              <span className={css.menuItemBorder} />
              <FormattedMessage id="TopbarDesktop.yourListingsLink" />
            </NamedLink>
          </MenuItem>
        ) : null}
        <MenuItem key="ProfileSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('ProfileSettingsPage'))}
            name="ProfileSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="AccountSettingsPage">
          <NamedLink
            className={classNames(css.menuLink, currentPageClass('AccountSettingsPage'))}
            name="AccountSettingsPage"
          >
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
          </NamedLink>
        </MenuItem>
        <MenuItem key="logout">
          <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
            <span className={css.menuItemBorder} />
            <FormattedMessage id="TopbarDesktop.logout" />
          </InlineTextButton>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
};

/**
 * Topbar for desktop layout
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {CurrentUser} props.currentUser API entity
 * @param {string?} props.currentPage
 * @param {boolean} props.isAuthenticated
 * @param {number} props.notificationCount
 * @param {Function} props.onLogout
 * @param {Function} props.onSearchSubmit
 * @param {Object?} props.initialSearchFormValues
 * @param {Object} props.intl
 * @param {Object} props.config
 * @param {boolean} props.showSearchForm
 * @param {boolean} props.showCreateListingsLink
 * @param {string} props.inboxTab
 * @returns {JSX.Element} search icon
 */
const TopbarDesktop = props => {
  const {
    className,
    config,
    customLinks,
    currentUser,
    currentPage,
    rootClassName,
    notificationCount = 0,
    intl,
    isAuthenticated,
    onLogout,
    onSearchSubmit,
    initialSearchFormValues = {},
    showSearchForm,
    showCreateListingsLink,
    inboxTab,
  } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const marketplaceName = config.marketplaceName;
  const authenticatedOnClientSide = mounted && isAuthenticated;
  const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;

  const giveSpaceForSearch = customLinks == null || customLinks?.length === 0;
  const classes = classNames(rootClassName || css.root, className, {
    [css.rootLandingPage]: currentPage === 'LandingPage',
  });

  const inboxLinkMaybe = authenticatedOnClientSide ? (
    <InboxLink notificationCount={notificationCount} inboxTab={inboxTab} />
  ) : null;

  // Companies (the 'customer' role) are the ones posting jobs on this
  // marketplace, so they get a direct link to the new job page.
  const { customer: isCompany } = getCurrentUserTypeRoles(config, currentUser);

  const profileMenuMaybe = authenticatedOnClientSide ? (
    <ProfileMenu
      currentPage={currentPage}
      currentUser={currentUser}
      onLogout={onLogout}
      showManageListingsLink={showCreateListingsLink}
      showCreateJobLink={isCompany}
      intl={intl}
    />
  ) : null;

  const signupLinkMaybe = isAuthenticatedOrJustHydrated ? null : <SignupLink />;
  const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink intl={intl} />;

  const searchFormMaybe = showSearchForm ? (
    <TopbarSearchForm
      className={classNames(css.searchLink, { [css.takeAvailableSpace]: giveSpaceForSearch })}
      desktopInputRoot={css.topbarSearchWithLeftPadding}
      onSubmit={onSearchSubmit}
      initialValues={initialSearchFormValues}
      appConfig={config}
    />
  ) : (
    <div
      className={classNames(css.spacer, css.topbarSearchWithLeftPadding, {
        [css.takeAvailableSpace]: giveSpaceForSearch,
      })}
    />
  );

  return (
    <nav
      className={classes}
      aria-label={intl.formatMessage({ id: 'TopbarDesktop.screenreader.topbarNavigation' })}
    >
      <LinkedLogo
        id="logo-topbar-desktop"
        className={css.logoLink}
        layout="desktop"
        alt={intl.formatMessage({ id: 'TopbarDesktop.logo' }, { marketplaceName })}
        linkToExternalSite={config?.topbar?.logoLink}
      />

      <CustomLinksMenu
        currentPage={currentPage}
        customLinks={customLinks}
        intl={intl}
        hasClientSideContentReady={authenticatedOnClientSide || !isAuthenticatedOrJustHydrated}
        showCreateListingsLink={showCreateListingsLink}
      />

      {searchFormMaybe}

      <div className={css.rightSection}>
        {inboxLinkMaybe}
        {profileMenuMaybe}
        {loginLinkMaybe}
        {signupLinkMaybe}
      </div>
    </nav>
  );
};

export default TopbarDesktop;
