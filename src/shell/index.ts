/**
 * The shell: what an app's window draws around its own pages, which every
 * app of the family draws the same way. The title bar (`TitleBar` with the
 * `Lockup`, the `BrandMark`, and the `ChannelMarker`), the `UpdatePill`, the
 * `AboutWindow`, the `SettingsDialog` with its subsections and page keys,
 * its shared pages (`AppearanceSettings` over `ThemeChoices`,
 * `LanguageChoice`, `UpdatesPage` with `UpdateChecks` and `UpdateCard`,
 * `SettingsFiles`), and the sign-in prompts (`SignInDialog`,
 * `HostKeyDialog`). Their look is `shell.css` in
 * `@bigpixelrocket/uiok/styles.css`.
 */

export { AboutWindow, type AboutWindowProps } from './AboutWindow.js';
export { LanguageChoice, type LanguageChoiceProps, type LanguageOption } from './LanguageChoice.js';
export { BrandMark, Lockup, type BrandMarkProps, type LockupProps } from './Lockup.js';
export {
  SettingsDialog,
  SettingsSaveFailure,
  type SettingsDialogProps,
  type SettingsGroup,
  type SettingsPage,
  type SettingsPageRequest,
  type SettingsSaveFailureProps,
  type SettingsSubsectionEntry
} from './SettingsDialog.js';
export {
  spiedSubsection,
  SUBSECTION_SCROLL_INSET_PX,
  SUBSECTION_SPY_SLACK_PX,
  subsectionScrollTop,
  type SettingsScrollView,
  type SubsectionAnchor
} from './SettingsDialog.logic.js';
export {
  SettingsFiles,
  type SettingsFileEntry,
  type SettingsFileProblem,
  type SettingsFileRequest,
  type SettingsFilesProps
} from './SettingsFiles.js';
export {
  SettingsPageKeysContext,
  settingsLegend,
  useSettingsPageKeys,
  type SettingsPageKeys
} from './SettingsPageKeys.js';
export {
  SETTINGS_PAGE_HEAD_ATTRIBUTE,
  SETTINGS_REVEAL_ATTRIBUTE,
  SETTINGS_SUBSECTION_ATTRIBUTE,
  SettingsSubsection,
  type SettingsSubsectionProps
} from './SettingsSubsection.js';
export {
  HostKeyDialog,
  SignInDialog,
  type HostKeyDialogProps,
  type SignInDialogProps,
  type SignInFact
} from './SignIn.js';
export {
  AppearanceSettings,
  ThemeChoices,
  ThemePreview,
  themesOf,
  useSystemDark,
  type AppearanceSettingsProps,
  type ThemeChoice,
  type ThemeChoicesProps
} from './ThemePicker.js';
export { appearanceInUse, steppedIndex } from './ThemePicker.logic.js';
export {
  ChannelMarker,
  TitleBar,
  type ChannelMarkerProps,
  type TitleBarProps
} from './TitleBar.js';
export { UpdatePill, type UpdatePillProps, type UpdatePillState } from './UpdatePill.js';
export {
  UpdateCard,
  UpdateChecks,
  UpdateNotes,
  UpdatesPage,
  type UpdateCardProps,
  type UpdateCardTone,
  type UpdateCardVerb,
  type UpdateChecksChoice,
  type UpdateChecksProps,
  type UpdateNotesGroup,
  type UpdateNotesProps,
  type UpdatesPageProps
} from './Updates.js';
