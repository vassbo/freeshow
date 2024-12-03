<script lang="ts">
    import MainLayout from "./MainLayout.svelte"
    import MainOutput from "./MainOutput.svelte"
    import ContextMenu from "./components/context/ContextMenu.svelte"
    import Pdf from "./components/export/Pdf.svelte"
    import Guide from "./components/guide/Guide.svelte"
    import { startEventTimer, startTimer } from "./components/helpers/timerTick"
    import Loader from "./components/main/Loader.svelte"
    import MenuBar from "./components/main/MenuBar.svelte"
    import Popup from "./components/main/Popup.svelte"
    import Recorder from "./components/main/Recorder.svelte"
    import Toast from "./components/main/Toast.svelte"
    import QuickSearch from "./components/quicksearch/QuickSearch.svelte"
    import Center from "./components/system/Center.svelte"
    import { activeTimers, autosave, closeAd, currentWindow, disabledServers, events, loaded, os, outputDisplay } from "./stores"
    import { focusArea, logerror, startAutosave, toggleRemoteStream } from "./utils/common"
    import { keydown } from "./utils/shortcuts"
    import { startup } from "./utils/startup"

    startup()

    $: isWindows = !$currentWindow && $os.platform === "win32"

    ///// UPDATERS /////

    // countdown timer tick
    $: if ($activeTimers.length) startTimer()

    // check for show event
    $: if (Object.keys($events).length) startEventTimer()

    // autosave
    $: if ($autosave) startAutosave()

    // stream to OutputShow
    $: if (($loaded && $disabledServers.output_stream !== "") || !$outputDisplay) setTimeout(toggleRemoteStream, 1000)

    // close youtube ad
    $: if ($closeAd) setTimeout(() => closeAd.set(false), 10)
</script>

<svelte:window on:keydown={keydown} on:mousedown={focusArea} on:error={logerror} on:unhandledrejection={logerror} />

{#if $currentWindow === "pdf"}
    <Pdf />
{:else}
    <!-- "isWindows" is only set in main window -->
    {#if isWindows}
        <MenuBar />
    {/if}

    <main style={isWindows ? "height: calc(100% - 25px);" : ""} class:closeAd={$closeAd} class:background={$currentWindow === "output"}>
        <ContextMenu />

        {#if $currentWindow === "output"}
            <MainOutput />
        {:else if $loaded}
            <Popup />
            <QuickSearch />
            <Toast />
            <Recorder />
            <Guide />

            <MainLayout />
        {:else}
            <Center>
                <Loader size={2} />
            </Center>
        {/if}
    </main>
{/if}

<style>
    main {
        height: 100%;
    }
    main:not(.background) {
        background-color: var(--primary);
        background: linear-gradient(130deg, var(--primary) 0%, rgb(42, 44, 62) 100%);
    }

    .closeAd {
        height: 1px;
    }
</style>
