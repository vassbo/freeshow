import { get } from "svelte/store"
import { actionTags, activeActionTagFilter, activeEdit, activeMediaTagFilter, activeTagFilter, contextData, drawerTabsData, globalTags, groups, media, mediaTags, midiIn, outputs, overlays, selected, shows, sorted } from "../../stores"
import { translate } from "../../utils/language"
import { drawerTabs } from "../../values/tabs"
import { actionData } from "../actions/actionData"
import { getActionName, getActionTriggerId } from "../actions/actions"
import { getEditItems, getEditSlide } from "../edit/scripts/itemHelpers"
import { getSlideText } from "../edit/scripts/textStyle"
import { chordTypes, keys } from "../edit/values/chords"
import { clone, keysToID, sortByName, sortObject } from "../helpers/array"
import { removeExtension } from "../helpers/media"
import { getDynamicIds } from "../helpers/showActions"
import { _show } from "../helpers/shows"
import type { ContextMenuItem } from "./contextMenus"

const loadActions = {
    enabled_drawer_tabs: (items: ContextMenuItem[]) => {
        const tabsToRemove = 2
        let tabs = keysToID(clone(drawerTabs)).slice(tabsToRemove)
        items = tabs.map((a: any) => {
            let enabled = get(drawerTabsData)[a.id]?.enabled !== false
            return { id: a.id, label: a.name, icon: a.icon, enabled }
        })

        return items
    },

    // TAGS
    tag_set: () => {
        let selectedShowTags = get(shows)[get(selected).data[0]?.id]?.quickAccess?.tags || []
        let sortedTags = sortObject(sortByName(keysToID(get(globalTags))), "color").map((a) => ({ ...a, label: a.name, enabled: selectedShowTags.includes(a.id), translate: false }))
        setContextData("tags", sortedTags.length)
        return sortedTags
    },
    tag_filter: () => {
        let sortedTags = sortObject(sortByName(keysToID(get(globalTags))), "color").map((a) => ({ ...a, label: a.name, enabled: get(activeTagFilter).includes(a.id), translate: false }))
        setContextData("tags", sortedTags.length)
        return sortedTags
    },
    media_tag_set: () => {
        let selectedTags = get(media)[get(selected).data[0]?.path]?.tags || []
        let sortedTags = sortObject(sortByName(keysToID(get(mediaTags))), "color").map((a) => ({ ...a, label: a.name, enabled: selectedTags.includes(a.id), translate: false }))
        const create = { label: "popup.manage_tags", icon: "edit", id: "create" }
        if (sortedTags.length) sortedTags.push("SEPERATOR")
        sortedTags.push(create)
        return sortedTags
    },
    media_tag_filter: () => {
        let sortedTags = sortObject(sortByName(keysToID(get(mediaTags))), "color").map((a) => ({ ...a, label: a.name, enabled: get(activeMediaTagFilter).includes(a.id), translate: false }))
        setContextData("media_tags", sortedTags.length)
        return sortedTags
    },
    action_tag_set: () => {
        let selectedTags = get(midiIn)[get(selected).data[0]?.id]?.tags || []
        let sortedTags = sortObject(sortByName(keysToID(get(actionTags))), "color").map((a) => ({ ...a, label: a.name, enabled: selectedTags.includes(a.id), translate: false }))
        const create = { label: "popup.manage_tags", icon: "edit", id: "create" }
        if (sortedTags.length) sortedTags.push("SEPERATOR")
        sortedTags.push(create)
        return sortedTags
    },
    action_tag_filter: () => {
        let sortedTags = sortObject(sortByName(keysToID(get(actionTags))), "color").map((a) => ({ ...a, label: a.name, enabled: get(activeActionTagFilter).includes(a.id), translate: false }))
        sortedTags = sortedTags.filter((a) => a.id !== get(drawerTabsData).functions?.activeSubmenu)
        setContextData("action_tags", sortedTags.length)
        return sortedTags
    },

    sort_shows: (items: ContextMenuItem[]) => sortItems(items, "shows"),
    sort_projects: (items: ContextMenuItem[]) => sortItems(items, "projects"),
    slide_groups: (items: ContextMenuItem[]) => {
        let selectedIndex = get(selected).data[0]?.index
        let slideRef = _show().layouts("active").ref()[0]?.[selectedIndex] || {}
        let currentSlide = _show().get("slides")[slideRef.id]
        if (!currentSlide) return []

        let currentGroup: string = currentSlide.globalGroup || ""
        items = Object.entries(get(groups)).map(([id, a]: any) => {
            return { id, color: a.color, label: a.default ? "groups." + a.name : a.name, translate: !!a.default, enabled: id === currentGroup }
        })

        if (!items.length) return [{ label: "empty.general", disabled: true }]
        return sortItemsByLabel(items)
    },
    actions: () => {
        let slideRef: any = _show().layouts("active").ref()[0]?.[get(selected).data[0]?.index]
        let currentActions: any = slideRef?.data?.actions

        let slideActions = [
            { id: "action", label: "midi.start_action", icon: "actions" },
            "SEPERATOR",
            { id: "slide_shortcut", label: "actions.play_with_shortcut", icon: "play", enabled: currentActions?.slide_shortcut || false },
            { id: "receiveMidi", label: "actions.play_on_midi", icon: "play", enabled: currentActions?.receiveMidi || false },
            "SEPERATOR",
            { id: "nextTimer", label: "preview.nextTimer", icon: "clock", enabled: Number(slideRef?.data?.nextTimer || 0) || false },
            { id: "loop", label: "preview.to_start", icon: "restart", enabled: slideRef?.data?.end || false },
            { id: "nextAfterMedia", label: "actions.next_after_media", icon: "forward", enabled: currentActions?.nextAfterMedia || false },
            "SEPERATOR",
            { id: "animate", label: "popup.animate", icon: "stars", enabled: currentActions?.animate || false },
        ]

        return slideActions
    },
    item_actions: () => {
        let slide = getEditSlide()
        if (!slide) return []

        let selectedItems: number[] = get(activeEdit).items || []
        let currentItemActions: any = slide.items?.[selectedItems[0]]?.actions || {}

        let itemActions: any = [
            // { id: "transition", label: "popup.transition", icon: "transition", enabled: !!currentItemActions.transition },
            { id: "showTimer", label: "actions.show_timer", icon: "time_in", enabled: Number(currentItemActions.showTimer || 0) || false },
            { id: "hideTimer", label: "actions.hide_timer", icon: "time_out", enabled: Number(currentItemActions.hideTimer || 0) || false },
        ]

        return itemActions
    },
    remove_layers: () => {
        let layoutSlides = _show().layouts("active").ref()[0] || {}
        let layoutSlide: any = layoutSlides[get(selected).data[0]?.index] || {}

        // text content
        let textContent = ""
        get(selected).data.forEach(({ index }) => {
            textContent += getSlideText(_show().slides([layoutSlides[index]?.id]).get()[0])
        })
        setContextData("textContent", textContent)

        let data: any = layoutSlide.data
        if (!data) return []

        let showMedia: any = _show().get().media
        let media: any[] = []

        // get background
        let bg = data.background
        if (bg && showMedia[bg]?.name) {
            media.push({
                id: bg,
                label: removeExtension(showMedia[bg].name),
                translate: false,
                icon: "image",
            })
        }

        // get overlays
        let ol = data.overlays || []
        if (ol.length) {
            if (media.length) media.push("SEPERATOR")
            media.push(
                ...sortByName(
                    ol.map((id: string) => ({ id, label: get(overlays)[id].name, translate: false, icon: "overlays" })),
                    "label"
                )
            )
        }

        // get audio
        let audio = data.audio || []
        if (audio.length) {
            if (media.length) media.push("SEPERATOR")
            let audioItems = sortByName(
                audio.map((id: string) => ({
                    id,
                    label: showMedia[id]?.name ? (showMedia[id].name.indexOf(".") > -1 ? showMedia[id].name.slice(0, showMedia[id].name.lastIndexOf(".")) : showMedia[id].name) : "",
                    translate: false,
                    icon: "music",
                })),
                "label"
            )
            media.push(...audioItems)
        }

        // get mics
        let mics = data.mics || []
        if (mics.length) {
            if (media.length) media.push("SEPERATOR")
            let micItems = sortByName(
                mics.map((mic: any) => ({
                    id: mic.id,
                    label: mic.name,
                    translate: false,
                    icon: "microphone",
                })),
                "label"
            )
            media.push(...micItems)
        }

        // get slide actions
        let slideActions = data.actions?.slideActions || []
        if (slideActions.length) {
            if (media.length) media.push("SEPERATOR")
            let actionItems = sortByName(
                slideActions.map((action: any) => {
                    let triggerId = getActionTriggerId(action.triggers?.[0])
                    let customData = actionData[triggerId] || {}
                    let actionValue = action?.actionValues?.[triggerId] || action?.actionValues?.[action.triggers?.[0]] || {}
                    let customName = getActionName(triggerId, actionValue) || (action.name !== translate(customData.name) ? action.name : "")

                    let label = translate(actionData[triggerId]?.name || "") + (customName ? ` (${customName})` : "")
                    let icon = actionData[triggerId]?.icon || "actions"

                    return { id: action.id, label, translate: false, icon, type: "action" }
                }),
                "label"
            )
            media.push(...actionItems)
        }

        setContextData("layers", !!media?.length)

        if (media.length) return media
        return [{ label: "empty.general", disabled: true }]
    },
    keys: () => {
        return keys.map((key) => ({ id: key, label: key, translate: false }))
    },
    chord_list: (items: ContextMenuItem[]) => {
        keys.forEach((key) => {
            chordTypes.forEach((adder) => {
                items.push({ id: key + adder, label: key + adder, translate: false })
            })
        })

        return items
    },
    bind_slide: (_items, isItem: boolean = false) => {
        let outputList: any[] = sortByName(keysToID(get(outputs)).filter((a) => !a.isKeyOutput && !a.stageOutput))

        outputList = outputList.map((a) => ({ id: a.id, label: a.name, translate: false }))
        if (isItem) outputList.push("SEPERATOR", { id: "stage", label: "menu.stage" })

        let currentBindings: string[] = []
        if (isItem) {
            // get current item bindings
            let editItems: any[] = getEditItems(true)
            currentBindings = editItems[0]?.bindings || []
        } else {
            let selectedIndex = get(selected).data[0]?.index
            let currentSlide = _show().layouts("active").ref()[0]?.[selectedIndex] || {}
            currentBindings = currentSlide.data?.bindings || []
        }

        outputList = outputList.map((a) => {
            if (currentBindings.includes(a.id)) a.enabled = true
            return a
        })

        setContextData("outputList", outputList?.length > 1)

        return outputList
    },
    bind_item: () => loadActions.bind_slide([], true),
    dynamic_values: () => {
        let values: any = getDynamicIds().map((id) => ({ id, label: id, translate: false }))
        let firstShowIndex = values.findIndex((a) => a.id.includes("show_"))
        let firstVideoIndex = values.findIndex((a) => a.id.includes("video_"))
        let firstMetaIndex = values.findIndex((a) => a.id.includes("meta_"))
        let firstVarIndex = values.findIndex((a) => a.id.includes("variable_"))

        values = [
            ...values.slice(0, firstShowIndex),
            "SEPERATOR",
            ...values.slice(firstShowIndex, firstVideoIndex),
            "SEPERATOR",
            ...values.slice(firstVideoIndex, firstMetaIndex),
            "SEPERATOR",
            ...values.slice(firstMetaIndex, firstVarIndex),
            "SEPERATOR",
            ...values.slice(firstVarIndex),
        ]

        return values
    },
}

function setContextData(key: string, data: any) {
    contextData.update((a) => {
        a[key] = data
        return a
    })
}

function sortItems(items: ContextMenuItem[], id: "projects" | "shows") {
    let type = get(sorted)[id]?.type || "name"

    items = [
        { id: "name", label: "sort.name", icon: "text", enabled: type === "name" },
        { id: "name_des", label: "sort.name_des", icon: "text", enabled: type === "name_des" },
        { id: "created", label: "info.created", icon: "calendar", enabled: type === "created" },
        { id: "modified", label: "info.modified", icon: "calendar", enabled: type === "modified" },
    ]
    if (id === "shows") {
        items.push({ id: "used", label: "info.used", icon: "calendar", enabled: type === "used" })

        // WIP load used metadata values...
    }

    return items
}

function sortItemsByLabel(items: ContextMenuItem[]) {
    return items.sort((a, b) => {
        let aName = a.translate ? translate(a.label) : a.label
        let bName = b.translate ? translate(b.label) : b.label

        return aName.localeCompare(bName)
    })
}

export function loadItems(id: string): [string, ContextMenuItem][] {
    if (!loadActions[id]) return []

    let items: ContextMenuItem[] = loadActions[id]([])
    let menuItems: [string, ContextMenuItem][] = items.map((a: any) => [a === "SEPERATOR" ? a : id, a])

    return menuItems
}

export function quickLoadItems(id: string) {
    if (!loadActions[id]) return
    loadActions[id]([])
}
