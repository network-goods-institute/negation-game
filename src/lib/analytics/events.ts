export const analyticsEvents = {
  auth: {
    login: "auth_login",
  },
  onboarding: {
    opened: "onboarding_opened",
    dismissed: "onboarding_dismissed",
  },
  video: {
    opened: "video_tutorial_opened",
    loaded: "video_tutorial_loaded",
  },
  multiplayer: {
    listViewed: "mp_board_list_viewed",
    boardOpened: "mp_board_opened",
    boardViewed: "mp_board_viewed",
    boardCreated: "mp_board_created",
    boardDuplicated: "mp_board_duplicated",
    boardRenamed: "mp_board_renamed",
    boardDeleted: "mp_board_deleted",
    boardLinkCopied: "mp_board_link_copied",
    accessDenied: "mp_board_access_denied",
  },
} as const;
