import { getStyles } from "../../helpers/style"
import { getItemLines, getItemText } from "./textStyle"

// TODO: check line length
export function getAutoSize(item: any, styles: any = null, oneLine: boolean = false): number {
    let size: number = 0

    if (styles === null) styles = getStyles(item.style, true)

    let lines: string[] = getItemLines(item)
    if (!lines.length) lines = ["0000000"]

    let itemHeight = styles.height
    let itemWidth = styles.width

    let fullTextLength = getItemText(item).length
    // TODO: this is not much in use:
    if (!oneLine && fullTextLength > 10) {
        // dont ask me how this works

        // this is very hacky, shouldn't be this complicated
        size = ((itemHeight * itemWidth) / 3500000 / (fullTextLength + fullTextLength)) * 14000

        // get low value to multiply by value
        let hmm = Math.max(1.8, fullTextLength / 200)
        // increased by higher values
        let idk = Math.max(220, fullTextLength * hmm)
        // get lower values with higher length
        let inverter = Math.max(1, (1.8 / fullTextLength) * idk)
        // divide on higher values as length grows
        let reducer = Math.max(40, fullTextLength / inverter)
        // slowly increment as text grows
        let divider = Math.max(1, fullTextLength / reducer)

        size *= 1.5 * divider

        return size
    }

    let longestLine: number = lines.sort((a, b) => b.length - a.length)[0].length

    // TODO: letter spacing....?
    if (itemHeight / lines.length / itemWidth > 1.8 / longestLine) {
        size = (itemWidth / longestLine) * 1.5
    } else {
        size = (itemHeight / lines.length) * 0.6
    }

    return size
}

export function getMaxBoxTextSize(elem: any, parentElem: HTMLElement) {
    const MAX_FONT_SIZE = 800 // WIP CUSTOM TEXT FIT
    const MIN_FONT_SIZE = 10

    // shrinkToFit: text is font size by default, but can become smaller if text does not fit in textbox
    // growToFit: text will fill the entire textbox, but maximum the set font size

    let invisibleBox = elem.cloneNode(true)
    invisibleBox.classList.add("invisible")
    parentElem.append(invisibleBox)

    let fontSize = MAX_FONT_SIZE
    addStyleToElemText(fontSize)

    // quick search (double divide)
    let lowestValue = MIN_FONT_SIZE
    let highestValue = MAX_FONT_SIZE
    let biggerThanSize = true
    while (highestValue - lowestValue > 3) {
        let difference = (highestValue - lowestValue) / 2
        if (biggerThanSize) {
            highestValue = fontSize
            fontSize -= difference
        } else {
            lowestValue = fontSize
            fontSize += difference
        }

        addStyleToElemText(fontSize)
        biggerThanSize = invisibleBox.scrollHeight > invisibleBox.offsetHeight || invisibleBox.scrollWidth > invisibleBox.offsetWidth
    }
    fontSize = lowestValue // prefer lowest value
    if (fontSize > MAX_FONT_SIZE) fontSize = MAX_FONT_SIZE

    function addStyleToElemText(fontSize) {
        for (let breakElem of invisibleBox.children) {
            for (let txt of breakElem.children) {
                txt.style.fontSize = fontSize + "px"
            }
        }
    }

    invisibleBox.remove()

    return fontSize
}
