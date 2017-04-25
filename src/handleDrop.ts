import { Observable } from 'rxjs/Observable'

import 'rxjs/add/operator/reduce'
import 'rxjs/add/operator/switch'
import 'rxjs/add/operator/concatMap'

export interface HandleDropOptions {
  directory: boolean
  onHover: (e: HTMLElement, hover: boolean) => void
  onDrop: (e: HTMLElement, files: File[]) => void
}

const scanFiles = (entry) => {
  if (entry.isFile) {
    return Observable.create((observer) => {
      entry.file((file) => {
        observer.next({ file, entry })
        observer.complete()
      })
    })
  } else if (entry.isDirectory) {
    return Observable.create((observer) => {
      entry.createReader().readEntries((entries) => {
        if (entries.length === 0) {
          observer.complete()
        } else {
          observer.next(Observable.from(entries).concatMap(scanFiles))
          observer.complete()
        }
      })
    }).switch()
  }
}

export const handleDrop = (
  dropElement: HTMLElement,
  options: Partial<HandleDropOptions> = {}
): Observable<File[]> => {

  const onDrop = options.onDrop || (() => {}) // tslint:disable-line
  const onHover = options.onHover || (() => {}) // tslint:disable-line

  return Observable.create((obs) => {
    let enterCount = 0
    dropElement.ondragenter = (e) => {
      enterCount += 1
      e.preventDefault()
      onHover(dropElement, true)
    }
    dropElement.ondragleave = (e) => {
      enterCount -= 1
      if (enterCount === 0) {
        e.preventDefault()
        onHover(dropElement, false)
      }
    }
    dropElement.ondragover = (e) => {
      e.preventDefault()
    }
    dropElement.ondrop = (e) => {
      const items = e.dataTransfer.items
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry()
        if (item) {
          scanFiles(item)
            .reduce((arr, { file, entry }) => {
              file.path = options.directory ? entry.fullPath.slice(1) : ''
              arr.push(file)
              return arr
            }, [])
            .subscribe((files) => {
              onDrop(dropElement, files)
              obs.next(files)
              e.preventDefault()
            })
        }
      }
    }
  })

}
