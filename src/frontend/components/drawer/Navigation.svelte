<script lang="ts">
    import { IMPORT } from "../../../types/Channels"
    import type { Category } from "../../../types/Tabs"
    import { activeEdit, activePopup, audioFolders, audioPlaylists, categories, dictionary, drawerTabsData, labelsDisabled, mediaFolders, overlayCategories, scriptures, templateCategories } from "../../stores"
    import { send } from "../../utils/request"
    import { keysToID, sortObject } from "../helpers/array"
    import { history } from "../helpers/history"
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import Button from "../inputs/Button.svelte"
    import FavButton from "../inputs/FavButton.svelte"
    import FolderPicker from "../inputs/FolderPicker.svelte"
    import DropArea from "../system/DropArea.svelte"
    import NavigationButtons from "./NavigationButtons.svelte"

    export let id: "shows" | "media" | "overlays" | "audio" | "effects" | "scripture" | "calendar" | "functions" | "templates" | "timers"

    interface Button extends Category {
        id: string
        url?: string
    }
    let buttons: Button[] = []
    $: {
        if (id === "shows" && $dictionary) {
            let categoriesList = keysToID($categories).filter((a) => !a.isArchive)
            let archivedCategories = keysToID($categories).filter((a) => a.isArchive)

            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "unlabeled", name: "category.unlabeled", default: true, icon: "noIcon" },
                { id: "SEPERATOR", name: "" },
                ...(sortObject(categoriesList, "name") as Button[]),
            ]
            if (archivedCategories.length) {
                buttons = [...buttons, { id: "SEPERATOR", name: "" }, ...(sortObject(archivedCategories, "name") as Button[])]
            }
        } else if (id === "media") {
            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "favourites", name: "category.favourites", default: true, icon: "star" },
                { id: "SEPERATOR", name: "" },
                { id: "online", name: "media.online", default: true, icon: "web" },
                { id: "screens", name: "live.screens", default: true, icon: "screen" },
                { id: "cameras", name: "live.cameras", default: true, icon: "camera" },
                { id: "SEPERATOR", name: "" },
                ...(sortObject(keysToID($mediaFolders), "name") as Button[]),
            ]
        } else if (id === "overlays") {
            let categoriesList = keysToID($overlayCategories).filter((a) => !a.isArchive)
            let archivedCategories = keysToID($overlayCategories).filter((a) => a.isArchive)

            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "unlabeled", name: "category.unlabeled", default: true, icon: "noIcon" },
                { id: "SEPERATOR", name: "" },
                ...(sortObject(categoriesList, "name") as Button[]),
            ]
            if (archivedCategories.length) {
                buttons = [...buttons, { id: "SEPERATOR", name: "" }, ...(sortObject(archivedCategories, "name") as Button[])]
            }
        } else if (id === "templates") {
            let categoriesList = keysToID($templateCategories).filter((a) => !a.isArchive)
            let archivedCategories = keysToID($templateCategories).filter((a) => a.isArchive)

            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "unlabeled", name: "category.unlabeled", default: true, icon: "noIcon" },
                { id: "SEPERATOR", name: "" },
                ...(sortObject(categoriesList, "name") as Button[]),
            ]
            if (archivedCategories.length) {
                buttons = [...buttons, { id: "SEPERATOR", name: "" }, ...(sortObject(archivedCategories, "name") as Button[])]
            }
        } else if (id === "audio") {
            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "favourites", name: "category.favourites", default: true, icon: "star" },
                { id: "SEPERATOR", name: "" },
                { id: "microphones", name: "live.microphones", default: true, icon: "microphone" },
                { id: "audio_streams", name: "live.audio_streams", default: true, icon: "audio_stream" },
                ...getAudioPlaylists($audioPlaylists),
                { id: "SEPERATOR", name: "" },
                ...(sortObject(keysToID($audioFolders), "name") as Button[]),
            ]
        } else if (id === "scripture") {
            buttons = getBibleVersions()
        } else if (id === "calendar") {
            buttons = [
                { id: "event", name: "menu._title_calendar", default: true, icon: "calendar" },
                { id: "action", name: "calendar.schedule_action", default: true, icon: "actions" },
                // WIP very few tabs
            ]
        } else if (id === "functions") {
            buttons = [
                { id: "actions", name: "tabs.actions", default: true, icon: "actions" },
                { id: "SEPERATOR", name: "" },
                { id: "timer", name: "tabs.timers", default: true, icon: "timer" },
                { id: "variables", name: "tabs.variables", default: true, icon: "variable" },
                { id: "triggers", name: "tabs.triggers", default: true, icon: "trigger" },
                // WIP effects
                // { id: "SEPERATOR", name: "" },
                // { id: "effects", name: "tabs.effects", default: true, icon: "effects" },
            ]
        } else {
            buttons = [
                { id: "all", name: "category.all", default: true, icon: "all" },
                { id: "SEPERATOR", name: "" },
            ]
        }
    }

    $: if (buttons.length && !$drawerTabsData[id]?.activeSubTab) setSubTab(buttons[0].id)

    function setSubTab(tabId: string) {
        drawerTabsData.update((a) => {
            a[id] = { activeSubTab: tabId, enabled: a[id]?.enabled !== false }
            return a
        })
    }

    $: if (id === "scripture" && $scriptures) buttons = getBibleVersions()

    const getBibleVersions = () =>
        keysToID($scriptures)
            .map((a: any) => ({ ...a, icon: a.api ? "scripture_alt" : a.collection ? "collection" : "scripture" }))
            .sort((a: any, b: any) => (b.customName || b.name).localeCompare(a.customName || a.name))
            .sort((a: any, b: any) => (a.api === true && b.api !== true ? 1 : -1))
            .sort((a: any, b: any) => (a.collection !== undefined && b.collection === undefined ? -1 : 1))

    function getAudioPlaylists(playlistUpdater): Button[] {
        if (!Object.keys(playlistUpdater).length) return []

        let playlists = sortObject(keysToID(playlistUpdater), "name") as Button[]
        playlists = playlists.map((a) => ({ ...a, icon: "playlist" }))
        if (!playlists.length) return []

        return [{ id: "SEPERATOR", name: "" }, ...playlists]
    }

    function keydown(e: KeyboardEvent) {
        if ($activeEdit.items.length) return
        if (!e.target?.closest(".edit") && (e.ctrlKey || e.metaKey)) {
            if (e.key === "ArrowDown") {
                // Ctrl + Arrow Down = change active drawer sub tab
                let index = buttons.findIndex((a) => a.id === $drawerTabsData[id]?.activeSubTab)
                let nextIndex = index + 1
                while (nextIndex < buttons.length && buttons[nextIndex]?.id === "SEPERATOR") {
                    nextIndex++
                }
                if (nextIndex < buttons.length) setSubTab(buttons[nextIndex].id)
            } else if (e.key === "ArrowUp") {
                // Ctrl + Arrow Up = change active drawer sub tab
                let index = buttons.findIndex((a) => a.id === $drawerTabsData[id]?.activeSubTab)
                let nextIndex = index - 1
                while (nextIndex >= 0 && buttons[nextIndex]?.id === "SEPERATOR") {
                    nextIndex--
                }
                if (nextIndex >= 0) setSubTab(buttons[nextIndex].id)
            }
        }
    }

    let selectId: any = "category"
    $: selectId = "category_" + id

    const dropAreas: (typeof id)[] = ["shows", "media", "audio", "overlays", "templates"]
</script>

<svelte:window on:keydown={keydown} />

<div class="main">
    <div class="categories context #category_{id}">
        {#if dropAreas.includes(id)}
            <DropArea id="navigation" selectChildren>
                <NavigationButtons {buttons} {id} {selectId} />
            </DropArea>
        {:else}
            <NavigationButtons {buttons} {id} {selectId} />
        {/if}
    </div>
    {#if id === "shows"}
        <div class="tabs">
            <FavButton on:click={() => history({ id: "UPDATE", location: { page: "drawer", id: "category_shows" } })} center title={$dictionary.new?.category}>
                <!-- round -->
                <!-- <Icon id="add" size={1.3} /> -->
                <Icon id="add" right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="new.category" />{/if}
            </FavButton>
        </div>
    {:else if id === "media" || id === "audio"}
        <FolderPicker id={id.toUpperCase()} title={$dictionary.new?.folder}>
            <Icon id="add" right={!$labelsDisabled} />
            {#if !$labelsDisabled}<T id="new.folder" />{/if}
        </FolderPicker>
    {:else if id === "overlays"}
        <div class="tabs">
            <Button on:click={() => history({ id: "UPDATE", location: { page: "drawer", id: "category_overlays" } })} center title={$dictionary.new?.category}>
                <Icon id="add" right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="new.category" />{/if}
            </Button>
        </div>
    {:else if id === "templates"}
        <div class="tabs">
            <Button on:click={() => history({ id: "UPDATE", location: { page: "drawer", id: "category_templates" } })} center title={$dictionary.new?.category}>
                <Icon id="add" right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="new.category" />{/if}
            </Button>
        </div>
    {:else if id === "scripture"}
        <div class="tabs">
            <Button on:click={() => activePopup.set("import_scripture")} center title={$dictionary.new?.scripture}>
                <Icon id="add" right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="new.scripture" />{/if}
            </Button>
        </div>
    {:else if id === "calendar"}
        <div class="tabs">
            <Button on:click={() => send(IMPORT, ["calendar"], { format: { name: "Calendar", extensions: ["ics"] } })} center title={$dictionary.actions?.import}>
                <Icon id="add" right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="actions.import" />{/if}
            </Button>
        </div>
    {/if}
</div>

<style>
    .main,
    .categories {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
    }

    .categories :global(button) {
        width: 100%;
        padding: 0.1em 0.8em !important;
        justify-content: space-between;
        background-color: var(--primary);
    }
    .tabs :global(button) {
        width: 100%;
    }

    .tabs {
        display: flex;
        background-color: var(--primary-darker);
    }

    .source {
        display: flex;
        justify-content: center;
        color: var(--text);
        opacity: 0.5;
        padding: 10px;
        font-weight: bold;
    }
    .source:hover {
        opacity: 0.8;
    }
</style>
