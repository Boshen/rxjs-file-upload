require('mocha/mocha.css')
require('mocha/mocha.js')
const chai = require('chai')
const expect = chai.expect
const Suite = (<any>Mocha).Suite // tslint:disable-line
const Test = (<any>Mocha).Test // tslint:disable-line
mocha.setup('bdd')

import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/observable/merge'
import 'rxjs/add/observable/empty'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/mergeAll'
import 'rxjs/add/operator/mergeMap'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/catch'

import { chunkUpload, handleClick, handlePaste, handleDrop } from '../src'

const HOST = ''

const uploadConfig = {
  headers: {
    Authorization: '' // tslint:disable-line
  },
  getChunkStartUrl: () => {
    return `${HOST}/upload/chunk`
  },
  getChunkUrl: (fileMeta, i) => {
    return `${HOST}/upload/chunk/${fileMeta.fileKey}?chunk=${i + 1}&chunks=${fileMeta.chunks}`
  },
  getChunkFinishUrl: (fileMeta) => {
    return `${HOST}/upload/chunk/${fileMeta.fileKey}`
  }
}

const handleUpload = (files$) => {
  files$.mergeAll().mergeMap((file) => {
    console.info('file:', file)

    const suite = Suite.create((<any>mocha).suite, file.name) // tslint:disable-line
    suite.addTest(new Test('should be blob', () => {
      expect(file).to.be.instanceof(Blob)
    }))

    const list = document.getElementById('list')
    const li = document.createElement('li')
    const $name = document.createElement('h1')
    $name.innerText = file.name
    const $abort = document.createElement('button')
    $abort.textContent = 'Abort'
    const $pause = document.createElement('button')
    $pause.textContent = 'Pause'
    const $resume = document.createElement('button')
    $resume.textContent = 'Resume'
    const $retry = document.createElement('button')
    $retry.textContent = 'Retry'
    const $progress = document.createElement('progress')
    $progress.setAttribute('value', '0')
    $progress.setAttribute('max', '1')

    li.appendChild($name)
    li.appendChild($abort)
    li.appendChild($pause)
    li.appendChild($resume)
    li.appendChild($retry)
    li.appendChild($progress)
    list.appendChild(li)

    const { abort, pause, resume, retry, upload$ } = chunkUpload(file, uploadConfig)

    Observable.fromEvent($abort, 'click').subscribe(abort)
    Observable.fromEvent($pause, 'click').subscribe(pause)
    Observable.fromEvent($resume, 'click').subscribe(resume)
    Observable.fromEvent($retry, 'click').subscribe(retry)

    return upload$
      .do(({ action, payload }) => {
        switch (action) {
          case 'upload/pausable':
            $pause.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
            break
          case 'upload/resumable':
            $resume.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
            break
          case 'upload/abortable':
            $abort.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
            break
          case 'upload/retryable':
            $retry.setAttribute('style', payload ? 'visibility: visible' : 'visibility: hidden')
            break
          case 'upload/start':
            let startFileMeta = payload
            console.info('start: ', startFileMeta)
            suite.addTest(new Test('should have start fileMeta', () => {
              expect(startFileMeta).to.have.property('chunkSize').that.is.a('number')
              expect(startFileMeta).to.have.property('chunks').that.is.a('number')
              expect(startFileMeta).to.have.property('created').that.is.a('string')
              expect(startFileMeta).to.have.property('downloadUrl').that.is.a('string')
              expect(startFileMeta).to.have.property('fileCategory').that.is.a('string')
              expect(startFileMeta).to.have.property('fileKey').that.is.a('string')
              expect(startFileMeta).to.have.property('fileName').that.is.a('string')
              expect(startFileMeta).to.have.property('fileSize').that.is.a('number')
              expect(startFileMeta).to.have.property('fileType').that.is.a('string')
              expect(startFileMeta).to.have.property('mimeType').that.is.a('string')
              expect(startFileMeta).to.have.property('previewUrl').that.is.a('string')
              expect(startFileMeta).to.have.property('thumbnailUrl').that.is.a('string')
              expect(startFileMeta).to.have.property('uploadedChunks')
                .that.is.an('array')
                .that.have.lengthOf(0)
            }))
            break
          case 'upload/progress':
            let p = payload
            $progress.value = p
            suite.addTest(new Test('should progress with percentage ' + p, () => {
              expect(p).to.be.a('number')
              expect(p).to.be.at.least(0)
              expect(p).to.be.at.most(1)
            }))
            break
          case 'upload/finish':
            let finishFileMeta = payload
            console.info('finish: ', finishFileMeta)
            suite.addTest(new Test('should have finish finishFileMeta', () => {
              expect(finishFileMeta).to.have.property('chunkSize').that.is.a('number')
              expect(finishFileMeta).to.have.property('chunks').that.is.a('number')
              expect(finishFileMeta).to.have.property('created').that.is.a('string')
              expect(finishFileMeta).to.have.property('downloadUrl').that.is.a('string')
              expect(finishFileMeta).to.have.property('fileCategory').that.is.a('string')
              expect(finishFileMeta).to.have.property('fileKey').that.is.a('string')
              expect(finishFileMeta).to.have.property('fileName').that.is.a('string')
              expect(finishFileMeta).to.have.property('fileSize').that.is.a('number')
              expect(finishFileMeta).to.have.property('fileType').that.is.a('string')
              expect(finishFileMeta).to.have.property('lastUploadTime').that.is.a('string')
              expect(finishFileMeta).to.have.property('mimeType').that.is.a('string')
              expect(finishFileMeta).to.have.property('thumbnailUrl').that.is.a('string')
              expect(finishFileMeta).to.have.property('uploadedChunks')
                .that.is.an('array')
                .that.have.lengthOf(finishFileMeta.chunks)
            }))
            break
          default:
            break
        }
      })
      .catch((e) => {
        suite.addTest(new Test('should catch error with status ' + e.status, () => {
          expect(e.status).to.be.a('number')
          expect(e.status).to.be.at.least(400)
        }))
        return Observable.empty()
      })
  })
  .subscribe(console.log.bind(console))
}

handleUpload(
  handleClick(document.getElementById('click1'),)
)

handleUpload(
  handleClick(document.getElementById('click2'), {
    multiple: true,
    accept: 'image/*'
  })
)

handleUpload(
  handlePaste(document.getElementById('paste'))
)

handleUpload(
  handleDrop(document.getElementById('drop'))
)

const testButton = document.getElementById('test')
Observable.fromEvent(testButton, 'click').take(1).subscribe(() => {
  let mochaDiv = document.createElement('div')
  mochaDiv.id = 'mocha'
  document.body.appendChild(mochaDiv)
  mocha.checkLeaks()
  mocha.run()
  testButton.remove()
})
