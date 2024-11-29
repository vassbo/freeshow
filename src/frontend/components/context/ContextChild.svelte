<script lang="ts">
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import ContextItem from "./ContextItem.svelte"
    import { ContextMenuItem, contextMenuItems } from "./contextMenus"
    import { loadItems } from "./loadItems"

    export let contextElem: any = null
    export let topBar: boolean = false
    export let id: string
    export let menu: ContextMenuItem = contextMenuItems[id]
    export let translate: number = 0
    export let side: "right" | "left" = "right"

    $: transform = side === "right" ? "100%" : "-100%"

    let open: boolean = false
    let elem: HTMLDivElement
    let timeout: any = null
    let duration: number = 200

    function onMouseOver(e: any) {
        if (elem.contains(e.target)) {
            clearTimeout()
            if (open) return

            timeout = setTimeout(() => {
                open = true
                timeout = null
            }, duration)

            return
        }

        if (open && e.target?.closest(".contextMenu") !== null) {
            if (timeout !== null) return

            timeout = setTimeout(() => {
                open = false
                timeout = null
            }, duration / 2)

            return
        }

        clearTimeout()
    }

    function clearTimeout() {
        if (timeout === null) return

        window.clearTimeout(timeout)
        timeout = null
    }

    function click(e: any) {
        if (e.target?.closest(".submenu") === null) open = true
    }

    function keydown(e: any) {
        if (e.key === "Enter") open = !open
    }
</script>

<svelte:window on:mouseover={onMouseOver} />

<div bind:this={elem} class="item" on:click={click} tabindex={0} on:keydown={keydown}>
    <span style="display: flex;gap: 10px;justify-content: space-between;width: 100%;">
        <div class="left" style="display: flex;align-items: center;gap: 10px;">
            {#if menu?.icon}<Icon id={menu.icon} />{/if}
            {#key menu}
                <T id={menu?.label || id} />
            {/key}
        </div>
        <div class="right" style="display: flex;align-self: center;opacity: 0.7;">
            <Icon id="arrow_right" size={1.2} white />
        </div>
    </span>

    {#if open}
        <div class="submenu" style="{side}: 0; transform: translate({transform}, {translate ? `calc(-${translate}% + 32px)` : '-10px'});">
            {#if menu?.items?.length}
                {#each menu.items as itemId}
                    {#if itemId === "SEPERATOR"}
                        <hr />
                    {:else if itemId.includes("LOAD_")}
                        {#each loadItems(itemId.slice(5, itemId.length)) as [id, menu]}
                            {#if id === "SEPERATOR"}
                                <hr />
                            {:else}
                                <ContextItem {id} {contextElem} {menu} disabled={menu.disabled === true} {topBar} />
                            {/if}
                        {/each}
                    {:else}
                        <ContextItem id={itemId} {contextElem} {topBar} />
                    {/if}
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .item {
        padding: 5px 20px;
        display: flex;
        justify-content: space-between;
    }
    .item:hover {
        background-color: rgb(0 0 0 / 0.2);
    }

    hr {
        margin: 5px 10px;
        height: 2px;
        border: none;
        background-color: var(--primary-lighter);
    }

    .submenu {
        min-width: 150px;
        max-height: 300px;
        overflow: auto;
        position: absolute;
        transform: translate(100%, -10px);
        box-shadow: 2px 2px 3px rgb(0 0 0 / 0.2);
        padding: 5px 0;
        z-index: 5000;

        border-radius: var(--border-radius);
        background-color: var(--primary);

        /* get rgb from theme primary color */
        background: rgba(41, 44, 54, 0.98);
        background: linear-gradient(150deg, rgba(41, 44, 54, 0.98) 0%, rgba(41, 49, 59, 0.95) 100%);
        backdrop-filter: blur(3px);
        border-radius: 4px;
    }
</style>
