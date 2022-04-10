import { get } from "svelte/store"
import { STORE } from "../../types/Channels"
import {
  activeProject,
  audioFolders,
  categories,
  defaultProjectName,
  displayMetadata,
  drawer,
  drawerTabsData,
  drawSettings,
  events,
  exportPath,
  folders,
  fullColors,
  groupCount,
  groupNumbers,
  groups,
  imageExtensions,
  labelsDisabled,
  language,
  mediaFolders,
  mediaOptions,
  openedFolders,
  os,
  outLocked,
  outputScreen,
  overlayCategories,
  overlays,
  playerVideos,
  presenterControllerKeys,
  projects,
  remotePassword,
  resized,
  saved,
  screen,
  shows,
  showsCache,
  showsPath,
  slidesOptions,
  stageShows,
  templateCategories,
  templates,
  theme,
  themes,
  videoExtensions,
  webFavorites,
} from "../stores"
import type { SaveListSettings } from "./../../types/Save"

export function save() {
  console.log("SAVING...")

  let settings: { [key in SaveListSettings]: any } = {
    initialized: true,
    activeProject: get(activeProject),
    audioFolders: get(audioFolders),
    categories: get(categories),
    defaultProjectName: get(defaultProjectName),
    displayMetadata: get(displayMetadata),
    // events: get(events),
    showsPath: get(showsPath),
    exportPath: get(exportPath),
    drawer: get(drawer),
    drawerTabsData: get(drawerTabsData),
    drawSettings: get(drawSettings),
    groupNumbers: get(groupNumbers),
    fullColors: get(fullColors),
    groupCount: get(groupCount),
    groups: get(groups),
    imageExtensions: get(imageExtensions),
    labelsDisabled: get(labelsDisabled),
    language: get(language),
    mediaFolders: get(mediaFolders),
    mediaOptions: get(mediaOptions),
    openedFolders: get(openedFolders),
    os: get(os),
    outLocked: get(outLocked),
    outputScreen: get(outputScreen),
    overlayCategories: get(overlayCategories),
    presenterControllerKeys: get(presenterControllerKeys),
    playerVideos: get(playerVideos),
    remotePassword: get(remotePassword),
    resized: get(resized),
    screen: get(screen),
    slidesOptions: get(slidesOptions),
    templateCategories: get(templateCategories),
    // templates: get(templates),
    theme: get(theme),
    // themes: get(themes),
    videoExtensions: get(videoExtensions),
    webFavorites: get(webFavorites),
  }
  // save settings & shows
  // , shows: get(shows)

  window.api.send(STORE, {
    channel: "SAVE",
    data: {
      settings,
      shows: get(shows),
      showsCache: get(showsCache),
      stageShows: get(stageShows),
      projects: { projects: get(projects), folders: get(folders) },
      overlays: get(overlays),
      templates: get(templates),
      events: get(events),
      themes: get(themes),
      // path: get(showsPath),
    },
  })

  saved.set(true)
}
