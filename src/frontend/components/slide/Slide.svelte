<script lang="ts">
    import { onMount } from "svelte"
    import { MAIN } from "../../../types/Channels"
    import type { MediaStyle } from "../../../types/Main"
    import type { Media, Show, Slide, SlideData } from "../../../types/Show"
    import {
        activePage,
        activeTimers,
        audioFolders,
        checkedFiles,
        dictionary,
        driveData,
        focusMode,
        fullColors,
        groups,
        media,
        mediaFolders,
        outputs,
        overlays,
        refreshListBoxes,
        refreshSlideThumbnails,
        showsCache,
        slidesOptions,
        styles,
    } from "../../stores"
    import { wait } from "../../utils/common"
    import { send } from "../../utils/request"
    import { slideHasAction } from "../actions/actions"
    import MediaLoader from "../drawer/media/MediaLoader.svelte"
    import Editbox from "../edit/editbox/Editbox.svelte"
    import { getItemText } from "../edit/scripts/textStyle"
    import { clone } from "../helpers/array"
    import { getContrast, hexToRgb, splitRgb } from "../helpers/color"
    import { checkMedia, getFileName, getMediaStyle, getThumbnailPath, loadThumbnail, mediaSize, splitPath } from "../helpers/media"
    import { getActiveOutputs, getResolution } from "../helpers/output"
    import { getGroupName } from "../helpers/show"
    import SelectElem from "../system/SelectElem.svelte"
    import Actions from "./Actions.svelte"
    import Icons from "./Icons.svelte"
    import Textbox from "./Textbox.svelte"
    import Zoomed from "./Zoomed.svelte"
    import { removeTagsAndContent } from "../drawer/bible/scripture"

    export let showId: string
    export let slide: Slide
    export let layoutSlide: SlideData
    export let layoutSlides: any[] = []
    export let show: Show
    export let color: string | null = slide.color
    export let index: number
    export let columns: number = 1
    export let output: any = null
    export let active: boolean = false
    export let focused: boolean = false
    export let list: boolean = false
    export let endIndex: null | number = null
    export let icons: boolean = false
    export let noQuickEdit: boolean = false
    export let altKeyPressed: boolean = false
    export let disableThumbnails: boolean = false

    $: viewMode = $slidesOptions.mode || "grid"
    $: background = layoutSlide.background ? show.media[layoutSlide.background] : null

    let ghostBackground: Media | null = null
    let bgIndex: number = -1
    let isFirstGhost: boolean = false
    // don't show ghost backgrounds if more than 50 slides (because of loading!)
    $: if (!background && layoutSlides.length < 50) {
        ghostBackground = null
        layoutSlides.forEach((a, i) => {
            if (i > index) return

            if (slideHasAction(a.actions, "clear_background") && (!a.disabled || i === index)) ghostBackground = null
            else if (a.background && !a.disabled) {
                ghostBackground = show.media[a.background]
                bgIndex = i
            }
            if (a.background && show.media[a.background]?.loop === false) ghostBackground = null

            if (ghostBackground && i === index && bgIndex === i - 1) isFirstGhost = true
        })
    }

    // show loop icon if many backgruounds
    $: backgroundCount = layoutSlides.reduce((count, layoutRef) => (count += layoutRef.background ? 1 : 0), 0)

    // auto find media
    $: bg = clone(background || ghostBackground)
    $: cloudId = $driveData.mediaId
    $: if (bg) locateBackground()
    function locateBackground() {
        if (!background || !bg?.path) return

        let mediaId = layoutSlide.background!
        let folders = Object.values($mediaFolders).map((a) => a.path!)
        locateFile(mediaId, bg.path, folders, bg)
    }

    // auto find audio
    $: audioIds = clone(layoutSlide.audio || [])
    $: if (audioIds.length) locateAudio()
    function locateAudio() {
        let showMedia = $showsCache[showId]?.media
        let folders = Object.values($audioFolders).map((a) => a.path!)

        audioIds.forEach(async (audioId) => {
            let audio = showMedia[audioId]
            if (!audio?.path) return
            locateFile(audioId, audio.path, folders, audio)
        })
    }

    async function locateFile(fileId: string, path: string, folders: string[], mediaObj: any) {
        if (!path) return

        if (checkCloud) {
            let cloudBg = mediaObj.cloud?.[cloudId]
            if (cloudBg) path = cloudBg
        }

        let id = `${path}_${fileId}`
        if ($checkedFiles.includes(id)) return

        checkedFiles.set([...$checkedFiles, id])
        let exists = await checkMedia(path)

        // check for other potentially mathing mediaFolders
        if (!exists) {
            let fileName = getFileName(path)
            send(MAIN, ["LOCATE_MEDIA_FILE"], { fileName, splittedPath: splitPath(path), folders, ref: { showId, mediaId: fileId, cloudId: checkCloud ? cloudId : "" } })
            return
        }

        if (!checkCloud || !$showsCache[showId]?.media?.[fileId] || $showsCache[showId].media[fileId].cloud?.[cloudId] === path) return

        // set cloud path to path
        showsCache.update((a) => {
            let media = a[showId].media[fileId]
            if (!media.cloud) a[showId].media[fileId].cloud = {}
            a[showId].media[fileId].cloud![cloudId] = path

            return a
        })
    }

    let duration: number = 0

    // CLOUD BG
    let cloudBg = ""
    $: checkCloud = cloudId && cloudId !== "default"
    $: if (checkCloud) cloudBg = bg?.cloud?.[cloudId] || ""

    // LOAD BACKGROUND
    $: bgPath = cloudBg || bg?.path || bg?.id || ""
    $: if (bgPath && !disableThumbnails) loadBackground()
    let thumbnailPath: string = ""
    async function loadBackground() {
        if (ghostBackground) {
            if (isFirstGhost) {
                // create image (if not created) when it's first slide after actual background
                thumbnailPath = await loadThumbnail(bgPath, mediaSize.drawerSize)
            } else {
                await wait(100)

                // load ghost thumbnails (wait a bit to reduce loading lag)
                thumbnailPath = getThumbnailPath(bgPath, mediaSize.drawerSize)
            }
            return
        }

        // when zoomed in show the full res image
        // if (columns < 3 && $activePage !== "edit") {
        //     backgroundPath = bgPath
        //     return
        // }

        let newPath = await loadThumbnail(bgPath, mediaSize.slideSize)
        if (newPath) thumbnailPath = newPath
    }

    let mediaStyle: MediaStyle = {}
    $: if (bg?.path) mediaStyle = getMediaStyle($media[bg.path], currentStyle)

    $: group = slide.group
    $: if (slide.globalGroup && $groups[slide.globalGroup]) {
        group = $groups[slide.globalGroup].default ? $dictionary.groups?.[$groups[slide.globalGroup].name] : $groups[slide.globalGroup].name
        color = $groups[slide.globalGroup].color
        // history({ id: "UPDATE", save: false, newData: { data: group, key: "slides", keys: [layoutSlide.id], subkey: "group" }, oldData: { id: showId }, location: { page: "show", id: "show_key" } })
        // history({ id: "UPDATE", save: false, newData: { data: color, key: "slides", keys: [layoutSlide.id], subkey: "color" }, oldData: { id: showId }, location: { page: "show", id: "show_key" } })
    }

    $: name = getGroupName({ show, showId }, layoutSlide.id, group, index, true)

    // quick edit
    let html: string = ""
    let previousHTML: string = ""
    let longest: any = null

    onMount(() => {
        let texts: any[] = slide.items?.map((item) => getItemText(item))
        if (!texts) return
        let prev: any = null
        texts.forEach((a, i) => {
            if (!prev || a.length > prev) {
                prev = a.length
                longest = i
            }
        })
        if (longest !== null) update()
    })

    function update() {
        // html = `<div class="align" style="${item.align}">`
        html = ""
        slide.items[longest]?.lines?.forEach((line) => {
            line.text?.forEach((a) => {
                html += a.value
            })
        })
        previousHTML = html
    }

    // || $showsCache[active].slides
    let textElem: any
    $: if (textElem && html !== previousHTML) {
        previousHTML = html
        setTimeout(() => {
            showsCache.update((a) => {
                let lines = a[showId].slides[layoutSlide.id].items[longest]?.lines || []
                let textItems = getItems(textElem.children)
                if (textItems.length) {
                    lines.forEach((line) => {
                        line.text?.forEach((a, i) => (a.value = textItems[i]))
                    })
                }
                return a
            })
        }, 10)
    }

    function getItems(children: any): any[] {
        let textItems: any[] = []
        new Array(...children).forEach((child: any) => {
            if (child.innerHTML) textItems.push(child.innerHTML)
        })
        return textItems
    }

    let timer: number[] = []
    $: if ($activeTimers) {
        timer = []
        slide.items?.forEach(checkItem)
    }
    function checkItem(item: any) {
        if (item?.type !== "timer") return

        $activeTimers.forEach((a, i) => {
            if (a.showId === showId && a.slideId === layoutSlide.id && a.id === item.timer.id) timer.push(i)
        })
    }

    $: resolution = getResolution(slide?.settings?.resolution, { $outputs, $styles })

    $: currentOutput = $outputs[getActiveOutputs()[0]]
    $: currentStyle = $styles[currentOutput?.style || ""] || {}

    let colorStyle: string = ""
    let style: string = ""
    $: {
        colorStyle = ""
        style = ""
        // $fullColors &&
        if (viewMode !== "lyrics" || noQuickEdit) colorStyle += `background-color: ${color};`
        if (!$fullColors && (viewMode !== "lyrics" || noQuickEdit)) colorStyle += `color: ${color};`
        if (viewMode === "lyrics" && !noQuickEdit) colorStyle += "background-color: transparent;"
        if (viewMode !== "grid" && viewMode !== "simple" && !noQuickEdit && viewMode !== "lyrics") style += `width: calc(${100 / columns}% - 6px)`
    }

    $: slideFilter = ""
    $: if (!layoutSlide.filterEnabled || layoutSlide.filterEnabled?.includes("background")) getSlideFilter()
    else slideFilter = ""
    function getSlideFilter() {
        slideFilter = ""
        if (layoutSlide.filter) slideFilter += "filter: " + layoutSlide.filter + ";"
        if (layoutSlide["backdrop-filter"]) slideFilter += "backdrop-filter: " + layoutSlide["backdrop-filter"] + ";"
    }

    function getOutputColor(color: string) {
        if (output?.cached) {
            let rgb = color.includes("rgb") ? splitRgb(color) : hexToRgb(color)
            return "rgb(" + [rgb.r, rgb.g, rgb.b].join(" ") + " / 0.5);"
        }

        return color
    }

    $: if ($refreshListBoxes >= 0) {
        setTimeout(() => {
            refreshListBoxes.set(-1)
        }, 100)
    }

    // correct view order based on arranged order in Items.svelte (?.reverse())
    $: itemsList = clone(slide.items) || []
</script>

<div class="main" class:active class:focused style="{output?.color ? 'outline: 2px solid ' + getOutputColor(output.color) + ';' : ''}width: {viewMode === 'grid' || viewMode === 'simple' || noQuickEdit ? 100 / columns : 100}%;">
    <!-- group box -->
    {#if $fullColors}
        <div class="group_box" style="background-color: {color};" />
    {/if}
    <!-- icons -->
    {#if icons && !altKeyPressed && viewMode !== "simple"}
        <Icons {timer} {layoutSlide} {background} {backgroundCount} {duration} {columns} {index} style={viewMode === "lyrics" ? "padding-top: 23px;" : ""} />
        <Actions {columns} {index} actions={layoutSlide.actions || {}} />
    {/if}
    <!-- content -->
    <div class="slide context #{show.locked ? 'default' : $focusMode ? 'slideFocus' : name === null ? 'slideChild' : 'slide'}" class:disabled={layoutSlide.disabled} class:afterEnd={endIndex !== null && index > endIndex} {style} tabindex={0} on:click>
        <div class="hover overlay" />
        <!-- <DropArea id="slide" hoverTimeout={0} file> -->
        <div style="width: 100%;height: 100%;">
            <SelectElem
                style={colorStyle}
                id="slide"
                data={{ index, showId }}
                draggable={!$focusMode && !show.locked}
                shiftRange={layoutSlides.map((_, index) => ({ index, showId }))}
                onlyRightClickSelect={$focusMode}
                selectable={!show.locked}
                trigger={list ? "column" : "row"}
            >
                <!-- TODO: tab select on enter -->
                {#if viewMode === "lyrics" && !noQuickEdit}
                    <!-- border-bottom: 1px dashed {color}; -->
                    <div class="label" title={removeTagsAndContent(name || "")} style="color: {color};margin-bottom: 5px;">
                        <span style="position: absolute;display: contents;">{index + 1}</span>
                        <span class="text">{@html name === null ? "" : name || "—"}</span>
                    </div>
                {/if}
                <Zoomed
                    background={slide.items?.length && (viewMode !== "lyrics" || noQuickEdit) ? slide.settings.color || currentStyle.background || "black" : (viewMode !== "lyrics" || noQuickEdit ? color : "") || "transparent"}
                    let:ratio
                    {resolution}
                    zoom={viewMode !== "lyrics" || noQuickEdit}
                    aspectRatio={viewMode !== "lyrics" || noQuickEdit}
                    disableStyle={viewMode === "lyrics" && !noQuickEdit}
                    relative={viewMode === "lyrics" && !noQuickEdit}
                >
                    <!-- backgrounds -->
                    {#if !altKeyPressed && bg && (viewMode !== "lyrics" || noQuickEdit)}
                        {#key $refreshSlideThumbnails}
                            <div class="background" style="zoom: {1 / ratio};{slideFilter}" class:ghost={!background}>
                                <MediaLoader name={$dictionary.error?.load} ghost={!background} path={bgPath} {thumbnailPath} cameraGroup={bg.cameraGroup || ""} type={bg.type !== "player" ? bg.type : null} {mediaStyle} bind:duration getDuration />
                                <!-- loadFullImage={!!(bg.path || bg.id)} -->
                            </div>
                        {/key}
                    {/if}

                    <!-- "underlays" -->
                    {#if !altKeyPressed && layoutSlide.overlays?.length && (viewMode !== "lyrics" || noQuickEdit)}
                        {#each layoutSlide.overlays as id}
                            {#if $overlays[id]?.placeUnderSlide === true}
                                {#each $overlays[id].items as item}
                                    <Textbox {item} ref={{ type: "overlay", id }} />
                                {/each}
                            {/if}
                        {/each}
                    {/if}

                    <!-- text content -->
                    {#if slide.items}
                        {#each itemsList as item, i}
                            {#if item && (viewMode !== "lyrics" || item.type === undefined || ["text", "events", "list"].includes(item.type))}
                                <Textbox
                                    filter={layoutSlide.filterEnabled?.includes("foreground") ? layoutSlide.filter : ""}
                                    backdropFilter={layoutSlide.filterEnabled?.includes("foreground") ? layoutSlide["backdrop-filter"] : ""}
                                    disableListTransition
                                    {item}
                                    itemIndex={i}
                                    {ratio}
                                    slideIndex={index}
                                    ref={{
                                        showId,
                                        slideId: layoutSlide.id,
                                        id: layoutSlide.id,
                                    }}
                                    style={viewMode !== "lyrics" || noQuickEdit}
                                    smallFontSize={viewMode === "lyrics" && !noQuickEdit}
                                />
                            {/if}
                        {/each}
                    {/if}

                    <!-- overlays -->
                    {#if !altKeyPressed && layoutSlide.overlays?.length && (viewMode !== "lyrics" || noQuickEdit)}
                        {#each layoutSlide.overlays as id}
                            {#if $overlays[id] && !$overlays[id]?.placeUnderSlide}
                                {#each $overlays[id].items as item}
                                    <Textbox {item} ref={{ type: "overlay", id }} />
                                {/each}
                            {/if}
                        {/each}
                    {/if}
                </Zoomed>
                {#if viewMode === "simple"}
                    <!-- WIP get any enabled output with maxLines, not just first one... -->
                    <!-- Object.values($outputs).find((a) => $styles[a.style || ""]?.lines) -->
                    {#if output?.maxLines}
                        <div class="lineProgress">
                            <!-- WIP line custom cleared slide cache color does not work -->
                            <div class="fill" style="width: {((output.line + 1) / output.maxLines) * 100}%;background-color: {getOutputColor(output.color)};" />
                        </div>
                    {/if}

                    <div title={name || ""} style="height: 2px;" />
                {:else if viewMode !== "lyrics" || noQuickEdit}
                    <!-- style="width: {resolution.width * zoom}px;" -->
                    <div class="label" title={removeTagsAndContent(name || "")} style={$fullColors ? `background-color: ${color};color: ${getContrast(color || "")};` : `border-bottom: 2px solid ${color || "var(--primary-darkest)"};`}>
                        {#if name === null && $fullColors && $activePage === "show"}
                            <!-- WIP this works fine without full colors, but is it neccesary? (UI vs UX) -->
                            <div class="childLink" style="background-color: {color};" class:full={$fullColors} />
                        {/if}
                        {#if output?.maxLines}
                            <div class="lineProgress">
                                <div class="fill" style="width: {((output.line + 1) / output.maxLines) * 100}%;background-color: {getOutputColor(output.color)};" />
                            </div>
                        {/if}
                        {#if slide.notes && icons}<p class="notes" title={slide.notes}>{slide.notes}</p>{/if}
                        <!-- <div class="label" title={name || ""} style="border-bottom: 2px solid {color};"> -->
                        <!-- font-size: 0.8em; -->
                        <span style="position: absolute;display: contents;">{index + 1}</span>
                        <span class="text">{@html name === null ? "" : name || "—"}</span>
                    </div>
                {/if}
            </SelectElem>
        </div>
        <!-- </DropArea> -->
    </div>
    {#if viewMode === "list" && !noQuickEdit}
        <hr />
        <!-- <div bind:this={textElem} class="quickEdit edit" tabindex={0} contenteditable bind:innerHTML={html}>
      {@html html}
    </div> -->
        <div class="quickEdit" style="font-size: {(-1.1 * $slidesOptions.columns + 12) / 6}em;" data-index={index}>
            {#key $refreshListBoxes >= 0 && $refreshListBoxes !== index}
                {#if slide.items}
                    {#each itemsList as item, itemIndex}
                        {#if item.lines}
                            <Editbox {item} ref={{ showId, id: layoutSlide.id }} editIndex={index} index={itemIndex} plain />
                        {/if}
                    {/each}
                {/if}
            {/key}
        </div>
    {/if}
</div>

<style>
    .main {
        display: flex;
        position: relative;
        padding: 2px;
        /* height: fit-content; */
    }

    .slide {
        /* padding: 3px; */
        background-color: var(--primary-darkest);
        z-index: 0;
        outline-offset: 0;
        width: 100%;

        position: relative;
        display: flex;

        border-radius: 4px;

        /* height: fit-content; */
        /* border: 2px solid var(--primary-lighter); */
    }
    .slide :global(.selectElem#slide) {
        border-radius: 4px;
    }
    .slide :global(.zoomed .slide) {
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
    }

    .slide :global(.isSelected) {
        outline: 5px solid var(--secondary-text) !important;
    }

    .main.focused {
        outline: 2px solid var(--secondary-opacity);
        outline-offset: -1px;
        z-index: 2;
    }
    .main.active {
        /* outline: 3px solid var(--secondary); */
        outline: 2px solid var(--secondary);
        outline-offset: -1px;
        /* this z-index causes the button title to show behind! */
        /* z-index: 2; */
    }

    .group_box {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;

        opacity: 0.25;
    }

    .slide.afterEnd {
        opacity: 0.7;
    }
    .slide.disabled {
        opacity: 0.2;
    }

    .slide:hover > .hover {
        /* background-color: var(--primary-lighter); */
        /* filter: brightness(1.1); */
        opacity: 1;
    }
    .hover {
        pointer-events: none;
        width: 100%;
        height: 100%;
        opacity: 0;
        background-color: rgb(255 255 255 / 0.05);
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
    }

    .background {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
    }
    .background.ghost {
        opacity: 0.4;
    }
    .background :global(img) {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .label {
        position: relative;
        background-color: var(--primary-darkest);
        display: flex;
        padding: 5px;
        padding-bottom: 3px;
        font-size: 0.8em;
        font-weight: bold;
        align-items: center;
        /* opacity: 0.8; */

        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
    }

    .label .text {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
    }

    .label .text :global(.group_count) {
        color: var(--text);
        opacity: 0.3;
        /* opacity: 0.8; */
        font-size: 0.8em;
    }

    .childLink {
        position: absolute;
        left: 0;
        bottom: 0;
        transform: translate(-100%, 100%);
        width: 8px;
        height: 2px;
    }
    .childLink.full {
        transform: translate(-100%, 0);
        height: 24px;
    }

    .lineProgress {
        position: absolute;
        top: 0;
        left: 0;
        transform: translateY(-100%);
        width: 100%;
        height: 2px;
        z-index: 2;
        background-color: var(--primary-darkest);
    }
    .lineProgress .fill {
        width: 0;
        height: 100%;
        background-color: var(--secondary);
    }

    .notes {
        position: absolute;
        top: 0;
        left: 0;
        transform: translateY(-100%);
        width: 100%;
        padding: 4px 8px;
        background-color: rgb(0 0 0 / 0.5);
        color: white;
        font-weight: normal;
    }

    .label .text {
        width: 100%;
        margin: 0 15px;
        text-align: center;
        overflow-x: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    hr {
        height: 100%;
        width: 3px;
        border: none;
        margin: 0 10px;
        background-color: var(--primary-lighter);
    }

    .quickEdit {
        display: flex;
        flex-direction: column;
        gap: 10px;
        justify-content: space-between;

        background-color: rgb(0 0 0 / 0.8);
        color: white;
        padding: 10px;
        flex: 1;

        z-index: 2;
    }
    .quickEdit :global(.editItem) {
        height: 100%;
    }

    .quickEdit :global(.placeholder) {
        top: 0;
        height: 100%;
        padding: 15px 0;
        width: unset !important;
        /* font-size: 1.5em; */
    }
</style>
