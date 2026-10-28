import { useEffect, useRef, useState, type RefObject } from 'react'

export type CameraStatus = 'starting' | 'scanning' | 'denied' | 'unavailable'

type Decode = (video: HTMLVideoElement) => Promise<string | null>

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

const SCAN_EVERY_MS = 250
// Fiscal QR codes are dense; frames are scaled down to this size only for the jsQR fallback.
const MAX_FRAME_SIDE = 1280

/**
 * The browser's own QR reader where there is one (Chrome on Android), else jsQR, which is only
 * downloaded when the camera is opened in a browser without it (Safari, Firefox).
 */
async function createDecoder(): Promise<Decode> {
  const Detector = (window as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  const formats = await Detector?.getSupportedFormats?.().catch((): string[] => [])
  if (Detector && formats?.includes('qr_code')) {
    const detector = new Detector({ formats: ['qr_code'] })
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null
  }

  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  return async (video) => {
    if (!context || video.videoWidth === 0) return null
    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

function cameraSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Shows the back camera in `videoRef` and calls `onCode` with the text of every QR code it
 * sees, until the component unmounts (which also turns the camera off).
 */
export function useQrScanner(videoRef: RefObject<HTMLVideoElement>, onCode: (text: string) => void): CameraStatus {
  const [status, setStatus] = useState<CameraStatus>(() => (cameraSupported() ? 'starting' : 'unavailable'))
  const onCodeRef = useRef(onCode)

  useEffect(() => {
    onCodeRef.current = onCode
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video || !cameraSupported()) return

    let stopped = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (error) {
        if (!stopped) setStatus((error as { name?: string }).name === 'NotAllowedError' ? 'denied' : 'unavailable')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      video.srcObject = stream
      await video.play().catch(() => undefined)
      const decode = await createDecoder()
      if (stopped) return
      setStatus('scanning')

      const scan = async () => {
        if (stopped) return
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const text = await decode(video).catch(() => null)
          if (text && !stopped) onCodeRef.current(text)
        }
        timer = setTimeout(() => void scan(), SCAN_EVERY_MS)
      }
      void scan()
    }
    void start()

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [videoRef])

  return status
}
