<script lang="ts">
    import { activePage, activePopup, contextActive, contextData, os } from "../../stores"
    import { getEditItems } from "../edit/scripts/itemHelpers"
    import ContextChild from "./ContextChild.svelte"
    import ContextItem from "./ContextItem.svelte"
    import { contextMenuItems, contextMenuLayouts } from "./contextMenus"
    import { quickLoadItems } from "./loadItems"

    let contextElem: any = null
    let activeMenu: string[] = []
    let x: number = 0
    let y: number = 0
    let side: "right" | "left" = "right"
    let translate = 0

    function onContextMenu(e: MouseEvent) {
        let target: any = e.target
        if (!target) return

        let input = ["text", "textarea"].includes(target.type) && !target.closest(".numberInput")
        if ((!input && (target.closest(".contextMenu") || $activePopup)) || target.closest(".nocontext")) {
            contextActive.set(false)
            return
        }

        x = e.clientX
        y = e.clientY
        side = "right"
        translate = 0

        contextElem = target.closest(".context") || document.body
        let id: string | null = contextElem?.classList.length ? [...contextElem?.classList].find((c: string) => c.includes("#")) : null

        // don't show drawer context menu in search input
        if (id === "#drawer_top" && input) id = null
        // custom input (paste) menu on Windows
        if (!id && input && $os.platform === "win32") {
            id = "#input"
            contextElem = target
        }

        activeMenu = getContextMenu(id) || contextMenuLayouts.default

        let contextHeight = Object.keys(activeMenu).length * 30 + 10
        if (x + 250 > window.innerWidth) x -= 250
        if (y + contextHeight > window.innerHeight) translate = 100
        if (x + (250 + 150) > window.innerWidth) side = "left"

        contextActive.set(true)
    }

    function getContextMenu(id: string | null) {
        if (!id) return
        if (id.includes("__")) return combineMenus(id)

        let menu = contextMenuLayouts[id.slice(1, id.length)]
        if (id && menu) return menu

        return
    }

    function combineMenus(id: string) {
        let menus = id.slice(1, id.length).split("__")
        let menu: any[] = []

        menus.forEach((c2: string, i: number) => {
            if (contextMenuLayouts[c2]) menu.push(...contextMenuLayouts[c2])
            if (i < menus.length - 1) menu.push("SEPERATOR")
        })

        return menu
    }

    const click = (e: MouseEvent) => {
        if (!e.target?.closest(".contextMenu")) contextActive.set(false)
    }

    // preload data (to check if some of the buttons can be hidden)
    $: if (activeMenu) loadData()
    function loadData() {
        activeMenu.forEach((id) => {
            let items = contextMenuItems[id]?.items || []
            if (!items[0]?.includes("LOAD")) return

            let firstId = items[0].slice(5, items[0].length)
            quickLoadItems(firstId)
        })
    }

    // hide some context menu elements if they are not needed
    function shouldShowMenuWithItems(id: string) {
        if (id === "rearrange") return getEditItems().length > 1

        if (id === "bind_to") return $contextData.outputList
        if (id === "format") return $contextData.textContent || $activePage !== "show"
        if (id === "remove_layers") return $contextData.layers
        if (id === "tag_set" || id === "tag_filter") return $contextData.tags

        return true
    }

    let top = false
    $: if ($contextActive && contextElem) updateTop()
    function updateTop() {
        top = false
        // timeout to allow contextMenu to render/update
        setTimeout(() => {
            if (!document.querySelector(".contextMenu")) return
            top = document.querySelector(".contextMenu")!.getBoundingClientRect().top <= 0
        })
    }
</script>

<svelte:window on:contextmenu={onContextMenu} on:click={click} />

{#if $contextActive}
    <div class="contextMenu" style="left: {x}px; top: {y}px;transform: translateY(-{translate}%);" class:top>
        {#key activeMenu}
            {#each activeMenu as id}
                {#if id === "SEPERATOR"}
                    <hr />
                {:else if contextMenuItems[id]?.items}
                    <!-- conditional menus -->
                    {#if shouldShowMenuWithItems(id)}
                        <ContextChild {id} {contextElem} {side} translate={activeMenu.length > 2 ? 0 : translate} />
                    {/if}
                {:else}
                    <ContextItem {id} {contextElem} />
                {/if}
            {/each}
        {/key}
    </div>
{/if}

<style>
    .contextMenu {
        position: fixed;
        min-width: 250px;
        box-shadow: 1px 1px 3px 2px rgb(0 0 0 / 0.2);
        padding: 5px 0;
        z-index: 5001;

        border-radius: var(--border-radius);
        background-color: var(--primary);

        /* TODO: get rgb from theme primary color */
        /* background-color: rgb(41 44 54 / 0.8); */
        background: rgba(41, 44, 54, 0.98);
        background: linear-gradient(150deg, rgba(41, 44, 54, 0.98) 0%, rgba(41, 49, 59, 0.95) 100%);
        /* backdrop-filter: blur(8px); */
        backdrop-filter: blur(3px);

        /* background-image: url("../assets/frosted-glass.png");
        background-blend-mode: color-burn; */
        /* background-blend-mode: multiply; */

        border-radius: 4px;
    }

    .top {
        top: 0 !important;
        transform: none !important;
    }

    hr {
        margin: 5px 10px;
        height: 2px;
        border: none;
        background-color: var(--primary-lighter);
    }
</style>
