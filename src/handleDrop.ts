import { Observable, Observer, from, EMPTY } from 'rxjs'
import { filter, map, concatMap, toArray, switchAll } from 'rxjs/operators'

import { excludeFolder } from './util'

export interface HandleDropOptions {
  directory: boolean
  onHover: (e: HTMLElement, hover: boolean) => void
  onDrop: (e: HTMLElement, files: File[]) => void
}

const scanFiles = (entry: any, isInsideDir = false): Observable<File> => {
  if (entry.isFile) {
    return new Observable((observer: Observer<any>) => {
      entry.file((file: Event) => {
        try {
          ;(<any>file).path = isInsideDir ? entry.fullPath.slice(1) : ''
        } catch {}
        observer.next(file)
        observer.complete()
      })
    })
  } else if (entry.isDirectory) {
    return new Observable((observer: Observer<Observable<any>>) => {
      entry.createReader().readEntries((entries: any) => {
        if (entries.length === 0) {
          observer.complete()
        } else {
          observer.next(from(entries).pipe(concatMap((file) => scanFiles(file, true))))
          observer.complete()
        }
      })
    }).pipe(switchAll())
  }
  return EMPTY
}

export const handleDrop = (dropElement: HTMLElement, options: Partial<HandleDropOptions> = {}): Observable<File[]> => {
  const onDrop = options.onDrop || (() => {})
  const onHover = options.onHover || (() => {})

  return new Observable((obs: Observer<File[]>) => {
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
      enterCount = 0
      onHover(dropElement, false)

      if (!e.dataTransfer) {
        return
      }

      e.preventDefault()

      const items = e.dataTransfer.items
      const files = e.dataTransfer.files
      let files$: Observable<File> | undefined
      if (items && items.length) {
        files$ = from(Array.prototype.slice.call(items)).pipe(
          filter((item: DataTransferItem) => {
            return item && item.kind === 'file' && !!item.webkitGetAsEntry
          }),
          map((item: DataTransferItem) => {
            return item.webkitGetAsEntry()
          }),
          concatMap((entry: any) => scanFiles(entry))
        )
      } else if (files && files.length) {
        files$ = from(Array.prototype.slice.call(files)).pipe(
          concatMap(excludeFolder),
          map((file: File) => {
            ;(<any>file).path = ''
            return file
          })
        )
      }
      if (files$) {
        files$.pipe(toArray()).subscribe((fs: File[]) => {
          obs.next(fs)
          onDrop(dropElement, fs)
        })
      }
    }
  })
}
