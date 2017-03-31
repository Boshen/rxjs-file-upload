import { Observable } from 'rxjs/Observable'
import * as FileAPI from 'fileapi'

export const handleDrop = (
  dropElement: HTMLElement,
  onHover?: (dropElement: HTMLElement, hover: boolean) => void
): Observable<File[]> => {

  onHover = onHover || (() => {}) // tslint:disable-line
  const onHoverElem = (hover) => onHover(dropElement, hover)

  return Observable.create((observer) => {
    const onDrop = (files) => {
      observer.next(files)
    }
    FileAPI.event.dnd(dropElement, onHoverElem, onDrop)
    return () => {
      FileAPI.event.dnd.off(dropElement, onHoverElem, onDrop)
    }
  })

}
