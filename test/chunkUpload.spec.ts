const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const path = require('path')

chai.use(sinonChai)
const expect = chai.expect

import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'
import { createMockFile } from './util'

import {
  startChunkUpload,
  finishChunkUpload,
  chunkUpload,
  uploadAllChunks,
  ChunkProgress
} from '../src/chunkUpload'

const config = {
  getChunkStartUrl: () => '/upload/chunk',
  getChunkUrl: (_, i) => '/url' + i,
  getChunkFinishUrl: (fileMeta) => `/uploadchunk/${fileMeta.fileKey}`
}

const createChunks = (n) => {
  return Array.apply(null, Array(n)).map((i: number) => {
    return 'chunk ' + i
  })
}

const chunkTests = [1, 2, 3, 10, 100].map(createChunks)

chunkTests.forEach((chunks) => {

  const file = createMockFile('test.txt', chunks.map(() => 'x').join(''))

  const fileMeta: any = {
    fileSize: file.size,
    fileKey: 'fileKey',
    chunks: chunks.length,
    chunkSize: file.size / chunks.length,
    uploadedChunks: []
  }

  describe(`chunkUpload ${chunks.length} chunks`, () => {

    let server

    beforeEach(() => {
      server = sinon.fakeServer.create()
      chunks.forEach((_: Blob, i: number) => {
        const chunkUrl = config.getChunkUrl(fileMeta, i)
        server.respondWith('POST', chunkUrl, [200, {}, ''])
      })
      server.respondWith('POST', config.getChunkStartUrl(), [200, {}, JSON.stringify(fileMeta)])
      server.respondWith('POST', config.getChunkFinishUrl(fileMeta), [200, {}, JSON.stringify(fileMeta)])
    })

    afterEach(() => {
      server.restore()
    })

    it('should startChunkUpload -> uploadAllChunks -> finishChunkUpload', () => {
      const { start } = chunkUpload(file, config)
      start()

      server.respondImmediately = true
      server.respond()

      expect(server.requests.length).to.equal(chunks.length + 2)
      expect(server.requests[0].url).to.equal(config.getChunkStartUrl())
      expect(server.requests[0].status).to.equal(200)
      for (let i = 0; i < chunks.length; i++) {
        expect(server.requests[i + 1].url).to.equal(config.getChunkUrl(fileMeta, i))
        expect(server.requests[i + 1].status).to.equal(200)
      }
      expect(server.requests[chunks.length + 1].url).to.equal(config.getChunkFinishUrl(fileMeta))
      expect(server.requests[chunks.length + 1].status).to.equal(200)

    })

    describe('memory', () => {

      it('should not leak when complete', () => {
        const controlSubjects = {
          retrySubject: new Subject<void>(),
          abortSubject: new Subject<void>(),
          progressSubject: new Subject<ChunkProgress>(),
          controlSubject: new Subject<boolean>()
        }
        const { start } = chunkUpload(file, config, controlSubjects)
        start()
        server.respondImmediately = true
        server.respond()
        for (let subject in controlSubjects) {
          expect(controlSubjects[subject].isStopped).to.equal(true)
          expect(controlSubjects[subject].closed).to.equal(true)
        }
      })

      it('should not leak when error', () => {
        const controlSubjects = {
          retrySubject: new Subject<void>(),
          abortSubject: new Subject<void>(),
          progressSubject: new Subject<ChunkProgress>(),
          controlSubject: new Subject<boolean>()
        }
        const { start } = chunkUpload(file, config, controlSubjects)
        start()
        server.requests[0].respond(401)
        for (let subject in controlSubjects) {
          expect(controlSubjects[subject].isStopped).to.equal(true)
          expect(controlSubjects[subject].closed).to.equal(true)
        }
      })

    })

    describe('startChunkUpload', () => {

      it('should post', () => {
        startChunkUpload(file, config).subscribe()
        server.respond()
        const request = server.requests[0]
        const requestBody = JSON.parse(request.requestBody)
        expect(request.url).to.equal(config.getChunkStartUrl())
        expect(request.status).to.equal(200)
        expect(requestBody).to.have.all.keys('fileName', 'fileSize', 'lastUpdated')
        expect(requestBody.fileName).to.equal(file['name'])
        expect(requestBody.fileSize).to.equal(file['size'])
        expect(requestBody.lastUpdated).to.equal(file['lastModifiedDate'])
      })

      it('should cache', () => {
        const s$ = startChunkUpload(file, config)
        s$.subscribe()
        server.respond()
        s$.subscribe()
        server.respond()
        expect(server.requests.length).to.equal(1)
      })

    })

    describe('finishChunkUpload', () => {

      it('should post', () => {
        finishChunkUpload(fileMeta, config).subscribe()
        server.respond()
        const request = server.requests[0]
        expect(request.url).to.equal(config.getChunkFinishUrl(fileMeta))
      })

    })

    describe('on create', () => {

      it('should push fileMeta to create$ after startChunkUpload', () => {
        const create = sinon.spy()

        const { start, create$ } = chunkUpload(file, config)
        start()

        create$.subscribe(create)

        server.requests[0].respond(200, {}, JSON.stringify(fileMeta))

        expect(create).calledOnce
        expect(create.getCall(0).args[0]).to.eql(fileMeta)
      })

    })

    describe('on progress', () => {

      it('should report progress', () => {
        const progress = sinon.spy()

        const { start, progress$ } = chunkUpload(file, config)
        start()

        progress$.subscribe(progress)

        server.requests[0].respond(200, {}, JSON.stringify(fileMeta))
        for (let i = 1; i < chunks.length + 1; i++) {
          server.requests[i].upload.onprogress({ loaded: 1, total: fileMeta.chunkSize })
          server.requests[i].upload.onprogress({ loaded: fileMeta.chunkSize, total: fileMeta.chunkSize })
          server.requests[i].respond(200)
        }
        server.requests[chunks.length + 1].respond(200, {}, JSON.stringify(fileMeta))

        expect(progress.callCount).to.equal(chunks.length * 2)
        for (let i = 0; i < chunks.length; i++) {
          expect(progress.getCall(i * 2).args[0]).to.be.closeTo((1 + (i * fileMeta.chunkSize)) / fileMeta.fileSize, 1e-6)
          expect(progress.getCall(i * 2 + 1).args[0]).to.be.closeTo((i + 1) * fileMeta.chunkSize / fileMeta.fileSize, 1e-6)
        }
        expect(progress.getCall(progress.callCount - 1).args[0]).to.be.closeTo(1, 1e-6)
      })

      it('should not rewind progress after pause resume', () => {
        const progress = sinon.spy()

        const { start, pause, resume, progress$ } = chunkUpload(file, config)
        start()

        progress$.subscribe(progress)

        server.requests[0].respond(200, {}, JSON.stringify(fileMeta))
        server.requests[1].upload.onprogress({ loaded: 0.1, total: fileMeta.chunkSize })

        pause()
        resume()

        server.requests[2].upload.onprogress({ loaded: 0.05, total: fileMeta.chunkSize })

        server.respondImmediately = true
        server.respond()

        expect(progress.callCount).to.equal(1)
        expect(progress.getCall(0).args[0]).to.equal(0.1 / fileMeta.fileSize)
      })

    })

    describe('on complete', () => {

      it('should send completed fileMeta', () => {
        const complete = sinon.spy()
        const error = sinon.spy()

        const { start, complete$, error$ } = chunkUpload(file, config)
        start()

        complete$.subscribe(complete)
        error$.subscribe(error)

        server.respondImmediately = true
        server.respond()

        expect(complete).calledOnce
        expect(complete.getCall(0).args[0]).to.eql(fileMeta)
        expect(error).not.called
      })

    })

    describe('on error', () => {

      it('should error if ajax errors', () => {
        const error = sinon.spy()

        const { start, error$ } = chunkUpload(file, config)
        start()

        error$.subscribe(error)

        server.respondImmediately = true
        server.requests[0].respond(401)

        expect(error).calledOnce
        expect(error.getCall(0).args[0].status).to.eql(401)
      })

      it('should not retry after ajax error', () => {
        const error = sinon.spy()

        const { start, retry, error$ } = chunkUpload(file, config)
        start()

        error$.subscribe(error)

        server.respondImmediately = true
        server.requests[0].respond(401)

        expect(() => {
          retry()
        }).to.throw()

        expect(server.requests.length).to.equal(1)
        expect(error).calledOnce
        expect(error.getCall(0).args[0].status).to.eql(401)
      })

    })

    describe('uploadAllChunks', () => {

      let startChunkUploadStub
      let finishChunkUploadStub

      beforeEach(() => {
        const chunkUploadModule = require('../src/chunkUpload')
        startChunkUploadStub = sinon.stub(chunkUploadModule, 'startChunkUpload')
        startChunkUploadStub.returns(Observable.of(fileMeta))
        finishChunkUploadStub = sinon.stub(chunkUploadModule, 'finishChunkUpload')
        finishChunkUploadStub.returns(Observable.empty())
      })

      afterEach(() => {
        startChunkUploadStub.restore()
        finishChunkUploadStub.restore()
      })

      it('should make request for each chunk url', () => {
        const { start } = chunkUpload(file, config)
        start()
        server.respondImmediately = true
        server.respond()
        expect(server.requests.length).to.equal(chunks.length)
        server.requests.forEach((r, i) => {
          expect(r.url).to.equal(config.getChunkUrl(fileMeta, i))
          expect(r.status).to.equal(200)
        })
      })

      it('should abort all chunk uploads', () => {
        const { start, abort } = chunkUpload(file, config)
        start()
        abort()

        server.respondImmediately = true
        server.respond()


        expect(server.requests.length).to.equal(Math.min(3, chunks.length))
        server.requests.forEach((request: any) => {
          expect(request.readyState).to.equal(0)
          expect(request.aborted).to.equal(true)
        })
      })

      if (chunks.length <= 3) {

        it('should pause and resume chunk upload', () => {
          const { start, pause, resume } = chunkUpload(file, config)
          start()

          const numbRequests = chunks.length
          expect(server.requests.length).to.equal(numbRequests)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          pause()


          expect(server.requests.length).to.equal(numbRequests)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          resume()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for (let i = 0; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = numbRequests; i < numbRequests; i++) {
            expect(server.requests[numbRequests + i].readyState).to.equal(4)
            expect(server.requests[numbRequests + i].status).to.equal(200)
            expect(server.requests[numbRequests + i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
        })

        it('should be able to retry after error', () => {
          const { start, retry } = chunkUpload(file, config)
          start()

          server.requests[0].respond(404)

          const numbRequests = chunks.length
          expect(server.requests.length).to.equal(numbRequests)

          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].status).to.equal(404)
          expect(server.requests[0].url).to.equal(config.getChunkUrl(fileMeta, 0))
          for (let i = 1; i < numbRequests; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          retry()

          expect(server.requests.length).to.equal(numbRequests * 2)
          for(let i = 0; i < numbRequests; i++) {
            expect(server.requests[numbRequests + i].url).to.equal(config.getChunkUrl(fileMeta, i))
            expect(server.requests[numbRequests + i].status).to.equal(200)
            expect(server.requests[numbRequests + i].readyState).to.equal(4)
          }
        })
      }

      if (chunks.length > 3) {

        it('should pause and resume chunk upload', () => {
          const { start, pause, resume } = chunkUpload(file, config)
          start()

          expect(server.requests.length).to.equal(Math.min(3, chunks.length))
          for (let i = 0; i < 3; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.requests[0].respond()

          expect(server.requests.length).to.equal(4)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(1)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          pause()

          expect(server.requests.length).to.equal(4)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          resume()

          expect(server.requests.length).to.equal(7)
          expect(server.requests[0].readyState).to.equal(4)
          expect(server.requests[0].url).to.equal('/url0')
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i + 3].readyState).to.equal(1)
            expect(server.requests[i + 3].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          expect(server.requests.length).to.equal(chunks.length + 3)
          expect(server.requests[0].readyState).to.equal(4)
          for (let i = 1; i < 4; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for (let i = 1; i < chunks.length; i++) {
            expect(server.requests[i + 3].readyState).to.equal(4)
            expect(server.requests[i + 3].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
        })

        it('should be able to retry after 3 errors', () => {
          const { start, retry } = chunkUpload(file, config)
          start()

          server.requests[0].respond(404)
          server.requests[1].respond(404)
          server.requests[2].respond(404)

          expect(server.requests.length).to.equal(5)
          for(let i = 0; i < 3; i++) {
            expect(server.requests[i].readyState).to.equal(4)
            expect(server.requests[i].status).to.equal(404)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }
          for(let i = 3; i < 5; i++) {
            expect(server.requests[i].readyState).to.equal(0)
            expect(server.requests[i].url).to.equal(config.getChunkUrl(fileMeta, i))
          }

          server.respondImmediately = true
          server.respond()

          retry()

          expect(server.requests.length).to.equal(chunks.length + 5)
          for(let i = 0; i < chunks.length; i++) {
            expect(server.requests[i + 5].url).to.equal(config.getChunkUrl(fileMeta, i))
            expect(server.requests[i + 5].status).to.equal(200)
            expect(server.requests[i + 5].readyState).to.equal(4)
          }
        })

      }

      it('should not pause, resume or retry after completion', () => {
          const { start, pause, resume, retry } = chunkUpload(file, config)
          start()

          pause()
          pause()
          pause()

          resume()
          resume()
          resume()

          server.respondImmediately = true
          server.respond()

          pause()
          pause()
          pause()

          resume()
          resume()
          resume()

          retry()
          retry()
          retry()

          if (chunks.length < 3) {
            expect(server.requests.length).to.equal(chunks.length * 2)
          } else {
            expect(server.requests.length).to.equal(chunks.length + 3)
          }
      })

      it('should not upload already uploaded chunks', () => {
          const uploadedFileMeta = {
            ...fileMeta,
            uploadedChunks: [0]
          }
          startChunkUploadStub.returns(Observable.of(uploadedFileMeta))

          const { start, pause, resume, retry } = chunkUpload(file, config)
          start()

          server.respondImmediately = true
          server.respond()

          expect(server.requests.length).to.equal(chunks.length - 1)
          server.requests.forEach((r, i) => {
            expect(r.url).to.equal(config.getChunkUrl(fileMeta, i + 1))
            expect(r.status).to.equal(200)
          })
      })

      it.skip('should timeout requests', () => {
      })

      it.skip('should automatically retry failed requests by 3 times', () => {
      })

    })

  })

})
