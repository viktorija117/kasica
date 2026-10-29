import { useEffect, useRef, useState, type RefObject } from 'react'

export type CameraStatus = 'starting' | 'scanning' | 'denied' | 'unavailable'

type Decoder = {
  decode: (video: HTMLVideoElement) => Promise<string | null>
  /** Pause between two reads: the browser's own reader is fast, jsQR is not. */
  everyMs: number
}

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}
type BarcodeDetectorClass = {
  new (options: { formats: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

const NATIVE_SCAN_EVERY_MS = 80
const JSQR_SCAN_EVERY_MS = 250
// Fiscal QR codes are dense; frames are scaled down to this size only for the jsQR fallback.
const MAX_FRAME_SIDE = 1280

/**
 * Fiscal QR codes are dense: at the default 640×480 a phone needs the receipt held just right
 * for seconds. A sharper picture reads at once.
 */
const CAMERA: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

/** Keeps refocusing while the receipt moves closer, where the camera supports it (Android). */
async function focusContinuously(stream: MediaStream) {
  const [track] = stream.getVideoTracks()
  const modes = (track?.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode
  if (!track || !modes?.includes('continuous')) return
  await track
    .applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
    .catch(() => undefined)
}

/**
 * The browser's own QR reader where there is one (Chrome on Android), else jsQR, which is only
 * downloaded when the camera is opened in a browser without it (Safari, Firefox).
 */
async function createDecoder(): Promise<Decoder> {
  const Detector = (window as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  const formats = await Detector?.getSupportedFormats?.().catch((): string[] => [])
  if (Detector && formats?.includes('qr_code')) {
    const detector = new Detector({ formats: ['qr_code'] })
    return {
      decode: async (video) => (await detector.detect(video))[0]?.rawValue ?? null,
      everyMs: NATIVE_SCAN_EVERY_MS,
    }
  }

  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const decode = async (video: HTMLVideoElement) => {
    if (!context || video.videoWidth === 0) return null
    const scale = Math.min(1, MAX_FRAME_SIDE / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const frame = context.getImageData(0, 0, canvas.width, canvas.height)
    return jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
  return { decode, everyMs: JSQR_SCAN_EVERY_MS }
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
        stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA, audio: false })
      } catch (error) {
        if (!stopped) setStatus((error as { name?: string }).name === 'NotAllowedError' ? 'denied' : 'unavailable')
        return
      }
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      video.srcObject = stream
      // The reader loads while the camera starts.
      const [decoder] = await Promise.all([
        createDecoder(),
        video.play().catch(() => undefined),
        focusContinuously(stream),
      ])
      if (stopped) return
      setStatus('scanning')

      const scan = async () => {
        if (stopped) return
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const text = await decoder.decode(video).catch(() => null)
          if (text && !stopped) onCodeRef.current(text)
        }
        timer = setTimeout(() => void scan(), decoder.everyMs)
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
