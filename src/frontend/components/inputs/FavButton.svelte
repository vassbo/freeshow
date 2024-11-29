<script lang="ts">
    import { fade } from "svelte/transition"

    export let active: boolean = false
    export let outlineColor: string | null = null
    export let outline: boolean = false
    export let title: string = ""
    export let zoom: number = 1
    export let center: boolean = false
    export let border: boolean = false
    export let dark: boolean = false
    export let red: boolean = false
    export let redHover: boolean = false
    export let brighterHover: boolean = false
    export let extra: boolean = false
    export let round: boolean = false

    let tooltipTime: number = 800
    let showTooltip: boolean = false
    let timeout: any = null
    let autoHideTimeout: any = null
    function startTimer() {
        if (timeout || !title?.length) return

        if (autoHideTimeout) clearTimeout(autoHideTimeout)
        timeout = setTimeout(() => {
            showTooltip = true
            timeout = null
            if (document)
                // hide after 5 seconds
                autoHideTimeout = setTimeout(() => {
                    if (!timeout) showTooltip = false
                    autoHideTimeout = null
                }, 5000)
        }, tooltipTime)
    }

    $: if ($$props.disabled) hideTooltip()
    function hideTooltip() {
        showTooltip = false
        clearTimeout(timeout)
        timeout = null
    }

    let tooltipStyle: string = ""
    let mouse: any = { x: 0, y: 0 }
    function mousemove(e: any) {
        if (!title?.length) return

        startTimer()
        mouse = { x: e.clientX, y: e.clientY }
        tooltipStyle = ""

        const RIGHT_CLIP = mouse.x + 250 > window.innerWidth
        const BOTTOM_CLIP = mouse.y + 80 > window.innerHeight
        if (RIGHT_CLIP) tooltipStyle += `transform: translate(-100%, ${BOTTOM_CLIP ? "-100%" : "0"});` + (title.length > 30 ? "width: 250px;" : "white-space: nowrap;")
        else if (BOTTOM_CLIP) tooltipStyle += "transform: translateY(-100%);"
    }

    // let openExtra: boolean = false
</script>

<div class="buttonContent">
    <button
        on:mousemove={mousemove}
        on:mousedown={hideTooltip}
        on:mouseleave={hideTooltip}
        id={$$props.id}
        data-testid={$$props["data-testid"]}
        style="{outlineColor ? 'outline-offset: -2px;outline: 2px solid ' + outlineColor + ' !important;' : ''}{$$props.style || ''}"
        class:active
        class:outline
        class:center
        class:border
        class:dark
        class:red
        class:redHover
        class:brighterHover
        class:extraBtn={extra}
        class:round
        class={$$props.class}
        on:click
        on:dblclick
        disabled={$$props.disabled}
        tabindex={active ? -1 : 0}
    >
        {#if showTooltip}
            <div class="tooltip" transition:fade={{ duration: 200 }} style="left: {mouse.x}px;top: {mouse.y}px;{tooltipStyle};zoom: {1 / zoom};">
                {title}
            </div>
        {/if}
        <slot />
    </button>

    <!-- {#if openExtra}
        <div class="extra" transition:slide={{ duration: 200 }}>
            <slot name="extraCnt" />
        </div>
    {/if}

    {#if extra}
        <button class="right" on:click={() => (openExtra = !openExtra)}>
            <Icon id="arrow_forward" white />
        </button>
    {/if} -->

    {#if extra}
        <div class="right">
            <slot name="extraCnt" />
        </div>
    {/if}
</div>

<style>
    .buttonContent {
        display: flex;

        position: absolute;
        bottom: 12px;
        right: 12px;

        background-color: var(--primary-darker);
        border-radius: 99px;

        box-shadow: 1px 1px 3px 2px rgb(0 0 0 / 0.2);
    }

    button {
        position: relative;
        background-color: transparent;
        color: inherit;
        font-family: inherit;
        /* font-size: inherit; */
        font-size: 0.9em;
        border: none;
        display: flex;
        align-items: center;
        padding: 0.2em 0.8em;

        /* border-radius: var(--border-radius); */

        font-weight: 600;
        letter-spacing: 0.5px;

        transition:
            background-color 0.2s,
            border 0.2s;

        border-radius: 99px;

        padding: 0.8em 1.1em;
        padding-left: 1.3em;
    }
    button.round {
        padding: 0.9em;
    }

    .extra {
        position: absolute;
        top: 0;
        transform: translateY(-100%);
        background-color: var(--primary-darker);
        border-radius: 99px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: 100%;
        /* border-bottom-right-radius: 0; */
        /* border-bottom-left-radius: 0; */
        padding-left: 0;
    }
    .buttonContent :global(.extraCnt) {
        /* display: contents; */
        width: 100%;
        height: 100%;
    }
    .extra :global(button) {
        padding: 0.8em 1.1em !important;
        border-radius: 99px;
        width: 100%;
    }

    button.extraBtn {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
    }
    .right {
        border-left: 2px solid var(--primary-lighter);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        /* padding-left: 0.8em; */
    }
    .right :global(button) {
        border-radius: 99px;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        height: 100%;
        padding: 0.8em 1.1em !important;
        padding-right: 1.3em !important;
    }
    .right :global(button p) {
        display: none;
    }
    .right :global(button svg) {
        margin-right: 0;
    }

    /* ... */

    button.dark {
        background-color: var(--primary-darker);
    }
    button.center {
        justify-content: center;
        text-align: center;
    }
    button.center :global(p) {
        text-align: center;
    }

    /* red */
    button.red:not(:disabled) {
        background-color: rgb(255 0 0 / 0.25);
    }
    button.red:hover:not(:disabled):not(.active) {
        background-color: rgb(255 0 0 / 0.35);
    }
    button.red:active:not(:disabled):not(.active),
    button.red:focus:not(:disabled):not(.active) {
        background-color: rgb(255 0 0 / 0.3);
    }
    button.red:not(:disabled) :global(svg) {
        fill: var(--text);
    }

    button:not(:disabled):not(.active) {
        cursor: pointer;
    }
    button:hover:not(:disabled):not(.active) {
        background-color: var(--hover);
    }
    button:hover.brighterHover:not(:disabled):not(.active) {
        background-color: rgb(255 255 255 / 0.3);
    }
    button:hover.redHover:not(:disabled):not(.active) {
        background-color: rgb(255 0 0 / 0.3);
    }
    button:active:not(:disabled):not(.active),
    button:focus:not(.active) {
        background-color: var(--focus);
    }
    button.active {
        /* background-color: var(--secondary-opacity); */
        /* background-color: var(--primary-darkest); */
        background-color: var(--primary-darker);
        color: var(--secondary-text);
        outline: none;
    }
    button.dark.active {
        background-color: var(--primary-darkest);
    }
    button.active.border {
        outline-offset: -2px;
        /* outline: 2px solid var(--secondary); */
        outline: 2px solid var(--primary-lighter);
    }

    button.outline {
        outline-offset: -2px;
        outline: 2px solid var(--secondary) !important;
    }

    button :global(div) {
        padding-left: 0.8em;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow-x: hidden;
        line-height: 150%;
    }

    button :global(svg) {
        /* padding: 0 0.5em; */
        /* padding-left: 0.2em; */
        box-sizing: content-box;
        border: 0 !important; /* remove CombinedInput border */
    }
    button.active :global(svg) {
        fill: var(--text);
    }

    button:disabled {
        opacity: 0.5;
        /* this is to prevent interfearing with mouse event listeners */
        pointer-events: none;
    }

    /* tooltip */
    /* WIP clipping on right side & placed under (Slice icons) */
    button:hover > .tooltip {
        /* display: block; */
        display: table;
    }
    .tooltip {
        z-index: 30;
        pointer-events: none;
        position: fixed;
        background-color: var(--primary-darkest);
        border: 2px solid var(--primary-lighter);
        border-radius: var(--border-radius);
        padding: 5px 10px;
        top: 0;
        left: 0;
        max-width: 250px;
        text-align: left;
        white-space: normal;
    }
</style>
