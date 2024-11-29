<script lang="ts">
    import type { Tree } from "../../../types/Projects"
    import { ShowType } from "../../../types/Show"
    import { activeFocus, activeProject, activeShow, dictionary, drawer, focusMode, folders, labelsDisabled, midiIn, projects, projectTemplates, projectView, showRecentlyUsedProjects, sorted, special } from "../../stores"
    import { getActionIcon } from "../actions/actions"
    import { keysToID, removeDuplicateValues, sortByName, sortByTimeNew } from "../helpers/array"
    import { history } from "../helpers/history"
    import Icon from "../helpers/Icon.svelte"
    import { getFileName, removeExtension } from "../helpers/media"
    import { checkInput } from "../helpers/showActions"
    import T from "../helpers/T.svelte"
    import Button from "../inputs/Button.svelte"
    import FavButton from "../inputs/FavButton.svelte"
    import ProjectButton from "../inputs/ProjectButton.svelte"
    import ShowButton from "../inputs/ShowButton.svelte"
    import { autoscroll } from "../system/autoscroll"
    import Autoscroll from "../system/Autoscroll.svelte"
    import Center from "../system/Center.svelte"
    import DropArea from "../system/DropArea.svelte"
    import SelectElem from "../system/SelectElem.svelte"
    import ProjectList from "./ProjectList.svelte"

    let tree: Tree[] = []

    if (Object.keys($projects).length) deleteDuplicatedProjects()
    function deleteDuplicatedProjects() {
        projects.set(removeDuplicateValues($projects))
    }

    $: f = Object.entries($folders)
        .filter(([_, a]) => !a.deleted)
        .map(([id, folder]) => ({ ...folder, id, type: "folder" as "folder" }))
    $: p = Object.entries($projects)
        .filter(([_, a]) => !a.deleted)
        .map(([id, project]) => ({ ...project, parent: $folders[project.parent] ? project.parent : "/", id, shows: [] as any }))
    $: {
        let sortType = $sorted.projects?.type || "name"
        // sort by name regardless because project folders <= 0.9.5 doesn't have created date
        let sortedFolders = sortByName(f)
        let sortedProjects = sortByName(p)
        if (sortType === "created") {
            sortedFolders = sortedFolders.sort((a, b) => (b.created || 0) - (a.created || 0))
            sortedProjects = sortedProjects.sort((a, b) => (b.created || 0) - (a.created || 0))
        }

        tree = [...sortedFolders, ...sortedProjects]

        folderSorted = []
        sortFolders()
        tree = folderSorted
    }

    let folderSorted: Tree[] = []
    function sortFolders(parent: string = "/", index: number = 0, path: string = "") {
        let filtered = tree.filter((a: any) => a.parent === parent).map((a) => ({ ...a, index, path }))
        filtered.forEach((folder) => {
            folderSorted.push(folder)
            if (folder.type !== "folder") return

            sortFolders(folder.id, index + 1, path + folder.id + "/")
        })
    }

    // autoscroll
    let scrollElem: any
    let offset: number = -1
    $: itemsBefore = $drawer.height < 400 ? 5 : 1
    $: offset = autoscroll(scrollElem, Math.max(0, ($activeShow?.index || 0) - itemsBefore))

    // close if not existing
    $: if ($activeProject && !$projects[$activeProject]) activeProject.set(null) // projectView.set(true)
    // get pos if clicked in drawer
    $: if ($activeProject && $activeShow?.index !== undefined && $projects[$activeProject]?.shows?.[$activeShow.index]?.id !== $activeShow?.id) findShowInProject()

    function findShowInProject() {
        if (!$projects[$activeProject!]?.shows) return

        let i = $projects[$activeProject!].shows.findIndex((p) => p.id === $activeShow?.id)
        let pos: number = i > -1 ? i : $activeShow?.index || -1

        // ($activeShow?.type !== "video" && $activeShow?.type !== "image")
        if (pos < 0 || $activeShow?.index === pos) return

        activeShow.update((a) => {
            a!.index = pos
            return a
        })
    }

    // pre v0.6.1
    $: if ($activeProject && $projects[$activeProject]?.notes !== undefined) moveNotes()
    function moveNotes() {
        projects.update((a) => {
            let notes: string = a[$activeProject!].notes || ""
            if (notes.length) a[$activeProject!].shows.splice(0, 0, { id: "notes", type: "section", name: "Notes", notes })

            delete a[$activeProject!].notes
            return a
        })
    }

    function addSection() {
        let activeShowIndex = $activeShow?.index !== undefined ? $activeShow?.index + 1 : null
        let index: number = activeShowIndex ?? $projects[$activeProject || ""]?.shows?.length ?? 0
        history({ id: "UPDATE", newData: { key: "shows", index }, oldData: { id: $activeProject }, location: { page: "show", id: "section" } })
    }

    function getContextMenuId(type: ShowType | undefined) {
        if ((type || "show") === "show") return "show"
        if (type === "video" || type === "image") return "media"
        return type
    }

    $: projectActive = !$projectView && $activeProject !== null

    let listScrollElem: any = null
    let listOffset: number = -1
    $: if (listScrollElem) {
        let time = tree.length * 0.5 + 20
        setTimeout(() => {
            if (!listScrollElem) return
            listOffset = autoscroll(listScrollElem, Math.max(0, [...(listScrollElem.querySelector(".ParentBlock")?.children || [])].findIndex((a) => a?.querySelector(".active")) - itemsBefore))
        }, time)
    }

    function back() {
        projectView.set(true)
        showRecentlyUsedProjects.set(false)
    }

    // last used
    let recentlyUsedList: any[] = []
    // listen for $projects updates in case it has been updated from sync
    $: if ($showRecentlyUsedProjects && $projects) lastUsed()
    else recentlyUsedList = []

    function lastUsed() {
        const ONE_WEEK = 604800000
        // get all projects used within the last week
        recentlyUsedList = keysToID($projects).filter((a) => a.used && Date.now() - a.used < ONE_WEEK)
        // last used first
        recentlyUsedList = sortByTimeNew(recentlyUsedList, "used").reverse()

        if (recentlyUsedList.length < 2) {
            recentlyUsedList = []
            showRecentlyUsedProjects.set(false)
        }
    }
</script>

<svelte:window on:keydown={checkInput} />

<div class="main">
    <span class="tabs">
        {#if projectActive || recentlyUsedList.length}
            {#if !$focusMode}
                <Button style="flex: 1" on:click={back} active={$projectView} center dark title={$dictionary.remote?.projects}>
                    <Icon id="back" size={1.2} />
                </Button>
                <div style="flex: 7;max-width: calc(100% - 43px);" class="header context #projectTab _close" title={$dictionary.remote?.project + ": " + ($projects[$activeProject || ""]?.name || "")}>
                    <!-- <Icon id="project" white right /> -->
                    {#if recentlyUsedList.length}
                        <p style="font-style: italic;opacity: 0.7;"><T id="info.recently_used" /></p>
                    {:else}
                        <p>{$projects[$activeProject || ""]?.name || ""}</p>
                    {/if}
                </div>
            {/if}
        {:else}
            <div class="header">
                <!-- <Icon id="folder" white right /> -->
                <p><T id="remote.projects" /></p>
            </div>
        {/if}
    </span>

    {#if recentlyUsedList.length}
        <div id="projectsArea" class="list projects" style="overflow: auto;">
            {#each recentlyUsedList as project}
                <ProjectButton name={project.name} parent={project.parent} id={project.id} recentlyUsed />
            {/each}
        </div>
    {:else if !projectActive}
        <div id="projectsArea" class="list projects context #projects">
            <Autoscroll offset={listOffset} bind:scrollElem={listScrollElem} timeout={150} smoothTimeout={0}>
                <DropArea id="projects">
                    <ProjectList {tree} />
                </DropArea>
            </Autoscroll>
        </div>

        {#if Object.keys($projectTemplates).length}
            <div class="projectTemplates">
                {#each sortByName(keysToID($projectTemplates)) as project}
                    <ProjectButton name={project.name} parent={project.parent} id={project.id} template />
                {/each}
            </div>
        {/if}

        <div id="projectsButtons" class="tabs">
            <FavButton extra on:click={() => history({ id: "UPDATE", newData: { replace: { parent: $projects[$activeProject || ""]?.parent || "/" } }, location: { page: "show", id: "project" } })} center title={$dictionary.new?.project}>
                <Icon id="project" size={1.1} right={!$labelsDisabled} />
                {#if !$labelsDisabled}<p><T id="new.project" /></p>{/if}

                <div class="extraCnt" slot="extraCnt">
                    <Button on:click={() => history({ id: "UPDATE", newData: { replace: { parent: $projects[$activeProject || ""]?.parent || "/" } }, location: { page: "show", id: "project_folder" } })} center title={$dictionary.new?.folder}>
                        <Icon id="folder" size={1.1} right={!$labelsDisabled} />
                        {#if !$labelsDisabled}<p><T id="new.folder" /></p>{/if}
                    </Button>
                </div>
            </FavButton>
        </div>
    {:else}
        <div id="projectArea" class="list context #project">
            <Autoscroll {offset} bind:scrollElem timeout={150}>
                <DropArea id="project" selectChildren let:fileOver file>
                    {#if $projects[$activeProject || ""]?.shows?.length}
                        {#each $projects[$activeProject || ""]?.shows as show, index}
                            <SelectElem id="show" triggerOnHover data={{ ...show, name: show.name || removeExtension(getFileName(show.id)), index }} {fileOver} borders="edges" trigger="column" draggable>
                                {#if show.type === "section"}
                                    <Button
                                        active={$focusMode ? $activeFocus.id === show.id : $activeShow?.id === show.id}
                                        class="section context #project_section__project"
                                        on:click={() => {
                                            if ($focusMode) activeFocus.set({ id: show.id, index })
                                            else activeShow.set({ ...show, index })
                                        }}
                                        dark
                                        center
                                        bold={false}
                                    >
                                        <p>
                                            {#if show.name?.length}
                                                {show.name}
                                            {:else}
                                                <span style="opacity: 0.5;"><T id="main.unnamed" /></span>
                                            {/if}
                                        </p>

                                        {#if $special.sectionTriggerAction}
                                            <span style="display: flex;position: absolute;right: 5px;" title={$midiIn[$special.sectionTriggerAction]?.name}>
                                                <Icon id={getActionIcon($special.sectionTriggerAction)} size={0.8} white />
                                            </span>
                                        {/if}
                                    </Button>
                                {:else}
                                    <ShowButton id={show.id} {show} {index} class="context #project_{getContextMenuId(show.type)}__project" icon />
                                {/if}
                            </SelectElem>
                        {/each}
                    {:else}
                        <Center faded>
                            <T id="empty.general" />
                        </Center>
                    {/if}
                </DropArea>
            </Autoscroll>
        </div>
    {/if}
</div>

{#if $activeProject && !$projectView && !$focusMode && !recentlyUsedList.length}
    <div class="tabs">
        <FavButton title={$dictionary.new?.section} on:click={addSection} center>
            <Icon id="section" right={!$labelsDisabled} />
            {#if !$labelsDisabled}<p><T id="new.section" /></p>{/if}
        </FavButton>
    </div>
{/if}

<style>
    .main {
        /* max-height: 50%; */
        /* width: 100%; */
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow-y: auto;
    }

    .tabs {
        display: flex;
        background-color: var(--primary-darker);
        /* width: 100%;
    justify-content: space-between; */
    }
    /* .tabs :global(button) {
        width: 50%;
    } */

    .tabs .header {
        width: 100%;
        padding: 0.2em 0.8em;
        font-weight: 600;

        display: flex;
        justify-content: center;
        align-items: center;
    }

    .list {
        position: relative;
        display: flex;
        flex-direction: column;
        /* overflow-y: auto;
    overflow-x: hidden; */
        overflow: hidden;
        /* height: 100%; */
        flex: 1;
    }

    .list.projects :global(.droparea) {
        /* this is to be able to right click and add a folder/project at "root" level */
        padding-bottom: 10px;
    }

    .list :global(.section) {
        padding: 4px 40px;
        font-size: 0.8em;
        /* font-weight: bold; */
        width: 100%;
    }
    .list :global(.section.active) {
        outline-offset: -2px;
        outline: 2px solid var(--primary-lighter);
    }

    .projectTemplates {
        display: flex;
        flex-direction: column;

        max-height: calc(30px * 5);
        overflow-y: auto;

        border-top: 2px solid var(--primary-lighter);
    }
</style>
