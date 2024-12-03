<script lang="ts">
    export let style: string = ""
    export let title: string = ""
    export let textWidth: number = 50 // %

    $: customStyle = style + ";--text-width: " + textWidth + "%"
</script>

<div class="input" {title} style={customStyle}>
    <slot />
</div>

<style>
    .input {
        position: relative;

        display: flex;
        align-items: center;
        width: 100%;
        min-height: 40px;
        /* margin: 2px 0; */

        background-color: var(--primary-darker);
        border-bottom: 2px solid var(--primary-lighter);
        border-radius: var(--border-radius);
        /* border-radius: 8px; */
    }

    .input :global(*:not(:first-child)) {
        border-left: 1px solid var(--primary);
    }
    .input :global(*:not(:last-child)) {
        border-right: 1px solid var(--primary);
    }
    .input :global(*:not(:first-child):not(:last-child)) {
        border-left: 1px solid var(--primary);
        border-right: 1px solid var(--primary);
    }

    .input :global(input),
    .input :global(button),
    .input :global(p),
    .input :global(div:not(.loader)),
    .input :global(span) {
        min-height: inherit;
        min-width: inherit;
    }

    /* .input :global(input:not([type="checkbox"])) {
        background-color: var(--primary-darker);
    } */
    /* .input :global(input[type="text"]) {
        flex: 3;
    } */
    .input :global(input[type="text"]:not(:disabled)),
    .input :global(input[type="date"]:not(:disabled)),
    .input :global(input[type="time"]:not(:disabled)),
    .input :global(.dropdownElem:not(:disabled)) {
        background-color: var(--primary-darkest);
    }
    .input :global(input[type="text"]:hover:not(:disabled)),
    .input :global(input[type="date"]:hover:not(:disabled)),
    .input :global(input[type="time"]:hover:not(:disabled)) {
        background-color: var(--hover);
    }

    .input :global(button) {
        white-space: nowrap;
        padding: 0 10px !important;
    }
    .input :global(button p) {
        border: none !important;
    }

    .input :global(.dropdownElem button),
    .input :global(.numberInput *) {
        border: none !important;
    }
    .input :global(.color) {
        border: none;
        border-left: 1px solid var(--primary);
    }

    .input :global(.switch) {
        min-width: initial !important;
    }
    .input :global(.alignRight) {
        display: flex;
        align-items: center;
        justify-content: end;
        padding-right: 10px;
    }
    .input :global(.alignLeft) {
        display: flex;
        align-items: center;
        justify-content: start;
        padding-left: 10px;
    }

    .input :global(:nth-child(2):not(.switch):not(.numberInput)) {
        flex: 1;
    }

    .input :global(.numberInput) {
        width: 100%;
    }
    .input :global(.numberInput span.input) {
        flex: 5 !important;
    }

    .input :global(p) {
        display: flex;
        align-items: center;

        padding: 0 10px;
        overflow: initial;
        min-width: var(--text-width);
        width: var(--text-width);
    }
</style>
