<script lang="ts">
    import { fade, scale } from "svelte/transition"
    import { activePopup, dictionary, os } from "../../stores"
    import { MENU_BAR_HEIGHT } from "../../utils/common"
    import { disablePopupClose } from "../../utils/shortcuts"
    import Icon from "../helpers/Icon.svelte"
    import T from "../helpers/T.svelte"
    import Button from "../inputs/Button.svelte"
    import { popups } from "../../utils/popup"

    function mousedown(e: any) {
        if (disablePopupClose.includes(popupId)) return

        if (e.target.classList.contains("popup")) activePopup.set(null)
    }

    // prevent svelte transition lock
    let popupId: any = null
    let popupTimeout: any = null
    $: if ($activePopup !== undefined) updatePopup()
    function updatePopup() {
        if (popupTimeout) return

        popupTimeout = setTimeout(() => {
            popupId = $activePopup
            popupTimeout = null
        }, 100)
    }
</script>

{#if popupId !== null}
    {#key popupId}
        <div style={$os.platform === "win32" ? `height: calc(100% - ${MENU_BAR_HEIGHT}px);` : null} class="popup" transition:fade={{ duration: 100 }} on:mousedown={mousedown}>
            <div class="card" class:fill={popupId === "import_scripture"} transition:scale={{ duration: 200 }}>
                <div style="position: relative;">
                    {#if popupId !== "alert"}
                        {#key popupId}
                            <h2 style="text-align: center;padding: 10px 50px;"><T id="popup.{popupId}" /></h2>
                        {/key}
                    {/if}

                    {#if popupId !== "alert" && !disablePopupClose.includes(popupId)}
                        <Button style="position: absolute;right: 0;top: 0;height: 100%;min-height: 40px;border-radius: 8px;" title={$dictionary.actions?.close} on:click={() => activePopup.set(null)}>
                            <Icon id="close" size={2} />
                        </Button>
                    {/if}
                </div>
                <div style="display: flex;flex-direction: column;margin: 20px;min-width: 38vw;">
                    <svelte:component this={popups[popupId]} />
                </div>
            </div>
        </div>
    {/key}
{/if}

<style>
    h2 {
        color: var(--text);
    }

    .popup {
        position: absolute;
        background-color: rgb(0 0 0 / 0.8);
        /* very laggy */
        /* backdrop-filter: blur(4px); */
        /* background-image: url("../assets/grainy-texture.png");
        background-blend-mode: multiply; */
        /* pointer-events: none; */
        width: 100%;
        height: 100%;
        padding: 20px var(--navigation-width);
        z-index: 5000;

        font-size: 1.2em;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    @media screen and (max-width: 1000px) {
        .popup {
            padding: 20px;
            position: absolute;
            left: 50%;
            top: 50%;
            /* 12px for windows menu bar */
            transform: translate(-50%, calc(-50% + 12px));
        }
    }

    .card {
        position: relative;
        background-color: var(--primary);
        /* border-radius: var(--border-radius); */
        border-radius: 10px;
        overflow-y: auto;
        /* overflow-x: hidden; */

        min-width: 50%;
        min-height: 50px;
        max-width: 100%;
        max-height: 100%;
    }

    .fill {
        width: 100%;
        height: 100%;
    }

    /* WIP dropdown */
    /* .popup :global(.dropdown) {
        position: fixed !important;
        width: fit-content;
        max-height: 150px;
    } */
</style>
