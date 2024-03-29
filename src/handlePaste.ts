import { Observable, fromEvent } from 'rxjs'
import { map } from 'rxjs/operators'

let uid = 0
const image = 'image/png'

const isBlob = (blob: Blob | null) => {
  if (!blob) {
    return false
  }
  const s = {}.toString.call(blob)
  return s === '[object Blob]' || s === '[object File]'
}

export const handlePasteEvent = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  const files: File[] = []
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const blob = items[i].getAsFile()
      if (isBlob(blob)) {
        let file
        const name = `Screenshot-${uid++}.png`
        try {
          file = blob && new File([blob], name, { type: image })
        } catch (_) {
          file = <any>blob
          file.lastModifiedDate = new Date()
          file.name = name
          file.type = image
        }
        files.push(file)
      }
    }
  }
  if (files.length) {
    e.preventDefault()
  }
  return files
}

export const handlePaste = (pasteElement: HTMLElement): Observable<File[]> => {
  return fromEvent(pasteElement, 'paste').pipe(map(handlePasteEvent))
}
