<script lang="ts">
    import VirtualList from "@sveltejs/svelte-virtual-list"
    import type { ShowList } from "../../../../types/Show"
    import { activeEdit, activeFocus, activePopup, activeProject, activeShow, activeTagFilter, categories, dictionary, focusMode, labelsDisabled, sorted, sortedShowsList } from "../../../stores"
    import { formatSearch, showSearch } from "../../../utils/search"
    import Icon from "../../helpers/Icon.svelte"
    import T from "../../helpers/T.svelte"
    import { clone } from "../../helpers/array"
    import { history } from "../../helpers/history"
    import { dateToString } from "../../helpers/time"
    import FavButton from "../../inputs/FavButton.svelte"
    import ShowButton from "../../inputs/ShowButton.svelte"
    import Autoscroll from "../../system/Autoscroll.svelte"
    import Center from "../../system/Center.svelte"
    import SelectElem from "../../system/SelectElem.svelte"

    export let id: string
    export let active: string | null
    export let searchValue: string

    $: formattedSearch = formatSearch(searchValue)
    $: showsSorted = $sortedShowsList

    let filteredShows: ShowList[] = []
    let filteredStored: any
    $: filteredStored = filteredShows =
        active === "all" ? showsSorted.filter((a) => !$categories[a?.category || ""]?.isArchive) : showsSorted.filter((s: any) => active === s.category || (active === "unlabeled" && (s.category === null || !$categories[s.category])))

    export let firstMatch: null | any = null
    export let resetSearchList: boolean = false
    let previousSearchValue: string = ""
    $: {
        if (searchValue.length > 1) {
            let currentShowsList = filterByTags(filteredShows, $activeTagFilter)
            // reset if search value changed
            let reset = resetSearchList || !formattedSearch.includes(previousSearchValue) // || formattedSearch.split(" ").filter(Boolean).length !== previousSearchValue.split(" ").filter(Boolean).length
            if (reset) {
                currentShowsList = filterByTags(clone(filteredStored), $activeTagFilter)
                resetSearchList = false
            }

            filteredShows = showSearch(formattedSearch, currentShowsList)
            if (searchValue.length > 15 && filteredShows.length > 50) filteredShows = filteredShows.slice(0, 50)
            if (searchValue.length > 30 && filteredShows.length > 30) filteredShows = filteredShows.slice(0, 30)
            firstMatch = filteredShows[0] || null

            // scroll to top
            document.querySelector("svelte-virtual-list-viewport")?.scrollTo(0, 0)

            previousSearchValue = formattedSearch
        } else {
            filteredShows = filterByTags(clone(filteredStored), $activeTagFilter)
            firstMatch = null
            previousSearchValue = ""
        }
    }

    // reduce lag by only refreshing full list when not typing for 200 ms
    let isTyping: any = null
    $: if (searchValue) typing()
    function typing() {
        if (isTyping) clearTimeout(isTyping)
        isTyping = setTimeout(() => (resetSearchList = true), 200)
    }

    function filterByTags(shows, tags: string[]) {
        if (!tags.length) return shows

        return shows.filter((a) => {
            return !tags.find((tagId) => !a.quickAccess?.tags?.includes(tagId))
        })
    }

    // auto scroll to active show in the virtual list
    // WIP this does not work because the show buttons does not exist unless they are in view
    if (id) {
    }
    // $: if (id === "shows" && $activeShow !== null && ($activeShow.type || "show") === "show") {
    //     let scrollElem: any = document.querySelector("svelte-virtual-list-viewport")
    //     if (scrollElem) {
    //         let elemTop = scrollElem.querySelector("#show_" + $activeShow.id)?.closest("svelte-virtual-list-row")?.offsetTop || 0
    //         scrollElem.scrollTo(0, elemTop - scrollElem.offsetTop)
    //     }
    // }

    function keydown(e: any) {
        if (e.target.closest("input") || e.target.closest(".edit") || (!e.ctrlKey && !e.metaKey) || !filteredShows?.length) return
        if ($activeEdit.items.length) return

        let id: any = null
        if (e.key === "ArrowRight") {
            if (!$activeShow || ($activeShow.type !== undefined && $activeShow.type !== "show")) id = filteredShows[0].id
            else {
                let currentIndex: number = filteredShows.findIndex((a) => a.id === $activeShow!.id)
                if (currentIndex < filteredShows.length - 1) id = filteredShows[currentIndex + 1].id
            }
        } else if (e.key === "ArrowLeft") {
            if (!$activeShow || ($activeShow.type !== undefined && $activeShow.type !== "show")) id = filteredShows[filteredShows.length - 1].id
            else {
                let currentIndex: number = filteredShows.findIndex((a) => a.id === $activeShow!.id)
                if (currentIndex > 0) id = filteredShows[currentIndex - 1].id
            }
        }

        if (id) {
            if ($focusMode) activeFocus.set({ id })
            else activeShow.set({ id, type: "show" })
        }
    }

    $: sortType = $sorted.shows?.type || "name"
</script>

<svelte:window on:keydown={keydown} />

<Autoscroll style="overflow-y: auto;flex: 1;">
    <div class="column context #drawer_show">
        {#if filteredShows.length}
            <!-- reload list when changing category -->
            {#key active}
                <VirtualList items={filteredShows} let:item={show}>
                    <SelectElem id="show_drawer" data={{ id: show.id }} shiftRange={filteredShows} draggable>
                        {#if searchValue.length <= 1 || show.match}
                            <ShowButton id={show.id} {show} data={dateToString(show.timestamps?.[sortType] || show.timestamps?.modified || show.timestamps?.created || "", true, $dictionary)} class="#drawer_show_button" match={show.match || null} />
                        {/if}
                    </SelectElem>
                </VirtualList>
            {/key}

            {#if searchValue.length > 1 && !filteredShows.length}
                <Center size={1.2} faded><T id="empty.search" /></Center>
            {/if}
        {:else}
            <Center size={1.2} faded><T id="empty.shows" /></Center>
        {/if}
    </div>
</Autoscroll>

<div class="tabs">
    <FavButton
        id="newShowBtn"
        style="flex: 1;"
        on:click={(e) => {
            if (e.ctrlKey || e.metaKey) {
                history({ id: "UPDATE", newData: { remember: { project: $activeProject } }, location: { page: "show", id: "show" } })
            } else activePopup.set("show")
        }}
        class="context #drawer_new_show"
        center
        title="{$dictionary.tooltip?.show} [Ctrl+N]"
    >
        <Icon id="add" size={1.1} right={!$labelsDisabled} />
        {#if !$labelsDisabled}<T id="new.show" />{/if}
    </FavButton>
</div>

<style>
    .column {
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        background-color: var(--primary-darker);
        height: 100%;
    }

    /* THIS don't work with virtual list */
    /* .column :global(svelte-virtual-list-contents:nth-child(even) button) {
        background-color: var(--primary-darkest);
    } */

    .tabs {
        position: relative;

        display: flex;
        background-color: var(--primary-darkest);
    }

    /* .column.hidden :global(button) {
    display: none;
  } */
</style>
