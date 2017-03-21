require('mocha/mocha.css')
require('mocha/mocha.js')
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const expect = chai.expect
mocha.setup('bdd')

import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/observable/merge'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/mergeMap'

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

const runTest = () => {
  let oldMochaDiv = document.getElementById('mocha')
  if (oldMochaDiv) {
    document.body.removeChild(oldMochaDiv)
  }
  let mochaDiv = document.createElement('div')
  mochaDiv.id = 'mocha'
  document.body.appendChild(mochaDiv)
  mocha.checkLeaks()
  mocha.run()
}

const handleUpload = (files$) => {
  files$
    .map((file) => {
      it('file check', () => {
        expect(file).to.be.instanceof(Blob)
      })
      return chunkUpload(file, uploadConfig)
    })
    .mergeMap((controls) => {
      const { start, abort, pause, resume, retry, upload$ } = controls

      const list = document.getElementById('list')
      const li = document.createElement('li')
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

      li.appendChild($abort)
      li.appendChild($pause)
      li.appendChild($resume)
      li.appendChild($retry)
      li.appendChild($progress)
      list.appendChild(li)

      Observable.fromEvent($abort, 'click').subscribe(abort)
      Observable.fromEvent($pause, 'click').subscribe(pause)
      Observable.fromEvent($resume, 'click').subscribe(resume)
      Observable.fromEvent($retry, 'click').subscribe(retry)

      return upload$
        .do((d) => {
          let fileMeta
          switch (d.action) {
            case 'upload/start':
              fileMeta = d.payload
              console.info('create: ', fileMeta)
              it('start check', () => {
                expect(fileMeta).to.have.property('chunkSize').that.is.a('number')
                expect(fileMeta).to.have.property('chunks').that.is.a('number')
                expect(fileMeta).to.have.property('created').that.is.a('string')
                expect(fileMeta).to.have.property('downloadUrl').that.is.a('string')
                expect(fileMeta).to.have.property('fileCategory').that.is.a('string')
                expect(fileMeta).to.have.property('fileKey').that.is.a('string')
                expect(fileMeta).to.have.property('fileName').that.is.a('string')
                expect(fileMeta).to.have.property('fileSize').that.is.a('number')
                expect(fileMeta).to.have.property('fileType').that.is.a('string')
                expect(fileMeta).to.have.property('mimeType').that.is.a('string')
                expect(fileMeta).to.have.property('previewUrl').that.is.a('string')
                expect(fileMeta).to.have.property('thumbnailUrl').that.is.a('string')
                expect(fileMeta).to.have.property('uploadedChunks')
                  .that.is.an('array')
                  .that.have.lengthOf(0)
              })
              break
            case 'upload/progress':
              const p = d.payload
              $progress.value = p
              it('progress check', () => {
                expect(p).to.be.a('number')
                expect(p).to.be.at.least(0)
                expect(p).to.be.at.most(1)
              })
              break
            case 'upload/finish':
              fileMeta = d.payload
              console.info('finish: ', fileMeta)
              it('finish check', () => {
                expect(fileMeta).to.have.property('chunkSize').that.is.a('number')
                expect(fileMeta).to.have.property('chunks').that.is.a('number')
                expect(fileMeta).to.have.property('created').that.is.a('string')
                expect(fileMeta).to.have.property('downloadUrl').that.is.a('string')
                expect(fileMeta).to.have.property('fileCategory').that.is.a('string')
                expect(fileMeta).to.have.property('fileKey').that.is.a('string')
                expect(fileMeta).to.have.property('fileName').that.is.a('string')
                expect(fileMeta).to.have.property('fileSize').that.is.a('number')
                expect(fileMeta).to.have.property('fileType').that.is.a('string')
                expect(fileMeta).to.have.property('lastUploadTime').that.is.a('string')
                expect(fileMeta).to.have.property('mimeType').that.is.a('string')
                expect(fileMeta).to.have.property('thumbnailUrl').that.is.a('string')
                expect(fileMeta).to.have.property('uploadedChunks')
                  .that.is.an('array')
                  .that.have.lengthOf(fileMeta.chunks)
              })
              break
            default:
              break
          }
        }, (e) => {
          console.error('error: ', e)
          it('error check', () => {
            expect(e.status).to.be.a('number')
            expect(e.status).to.be.at.least(400)
          })
        })
    })
    .subscribe(
      console.info.bind(console, 'aa'),
      () => {
        console.info('error')
        runTest()
      },
      () => {
        console.info('done done')
        runTest()
      }
    )
}

handleUpload(
  handleClick(document.getElementById('click'), {
    multiple: true
  })
)

handleUpload(
  handlePaste(document.getElementById('paste'))
)

handleUpload(
  handleDrop(document.getElementById('drop'))
)
