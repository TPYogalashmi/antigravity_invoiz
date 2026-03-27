import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Info,
  Download
} from 'lucide-react'
import Button from '../components/ui/Button'
import { aiClient, backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import { InvoicePreview, generateInvoicePDF } from '../utils/InvoiceUtils'

// ── Recording state machine ───────────────────────────────────────────────────
const STATE = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  RECORDING: 'recording',
  STOPPING: 'stopping',
  TRANSCRIBING: 'transcribing',
  NLP: 'nlp',
  EDITING: 'editing',
  GENERATING: 'generating',
  DONE: 'done',
  ERROR: 'error',
}

const STATE_LABEL = {
  [STATE.IDLE]: 'Tap the microphone to begin',
  [STATE.REQUESTING]: 'Requesting microphone access…',
  [STATE.RECORDING]: 'Recording — tap again to stop',
  [STATE.STOPPING]: 'Stopping…',
  [STATE.TRANSCRIBING]: 'Transcribing audio…',
  [STATE.NLP]: 'Analysing intent…',
  [STATE.EDITING]: 'Review & edit details',
  [STATE.GENERATING]: 'Generating invoice…',
  [STATE.DONE]: 'Invoice generated',
  [STATE.ERROR]: 'An error occurred',
}

function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus', 'audio/webm',
    'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

export default function VoiceBilling({ onSuccess }) {
  const [recState, setRecState] = useState(STATE.IDLE)
  const [transcript, setTranscript] = useState('')
  const [nlpResult, setNlpResult] = useState(null)
  const [editingData, setEditingData] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [showNlpSection, setShowNlpSection] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const mimeTypeRef = useRef('')

  function startWaveform(stream) {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setAudioLevel(avg / 255)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function stopWaveform() {
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopStream()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  async function transcribeAudio(blob, mimeType) {
    const form = new FormData()
    form.append('audio', blob, `recording.${mimeType.split('/')[1]?.split(';')[0] || 'webm'}`)
    form.append('mimeType', mimeType)
    const res = await aiClient.post('/voice/transcribe-form', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    const text = res.data?.transcript
    if (!text || text.trim() === '') {
      throw new Error('Transcription returned empty text. Please speak clearly.')
    }
    return text.trim()
  }

  async function detectIntent(text) {
    const res = await aiClient.post('/nlp/intent', { transcript: text })
    if (!res.data?.intent) throw new Error('NLP service returned an invalid response.')
    return res.data
  }

  async function generateInvoice(data) {
    let payload;
    if (typeof data === 'string') {
      payload = { transcript: data };
      const res = await backendClient.post('/ai/process-voice/generate-invoice', payload);
      const inv = res.data?.data;
      if (inv && inv.success === false) throw new Error(inv.errorMessage || 'Generation failed');
      if (!inv?.invoiceNumber) throw new Error('Invoice generation failed.');
      return inv;
    } else {
      payload = {
        customerName: data.customerName,
        items: data.items.map(item => ({
          productName: item.name,
          description: item.name,
          quantity: item.quantity,
        })),
        voiceTranscript: transcript,
        voiceGenerated: true,
      };
      const res = await backendClient.post('/invoices', payload);
      const inv = res.data?.data;
      if (inv && inv.success === false) throw new Error(inv.errorMessage || 'Generation failed');
      if (!inv?.invoiceNumber) throw new Error('Invoice generation failed.');
      return inv;
    }
  }

  const handleConfirmEdit = async () => {
    if (!editingData.customerName.trim() || editingData.items.length === 0) {
      toast.error('Customer name and items are required')
      return
    }
    setRecState(STATE.GENERATING)
    try {
      const inv = await generateInvoice(editingData)
      setInvoice(inv)
      setRecState(STATE.DONE)
      toast.success(`Invoice ${inv.invoiceNumber} created`)
      if (onSuccess) onSuccess(inv)
    } catch (err) {
      setErrorMsg(err.message)
      setRecState(STATE.ERROR)
    }
  }

  const handleReset = () => {
    setRecState(STATE.IDLE); setTranscript(''); setNlpResult(null);
    setEditingData(null); setInvoice(null); setErrorMsg('');
    stopWaveform(); stopStream();
  }

  const startRecording = useCallback(async () => {
    setErrorMsg(''); setTranscript(''); setNlpResult(null); setInvoice(null);
    setRecState(STATE.REQUESTING)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      mimeTypeRef.current = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeTypeRef.current ? { mimeType: mimeTypeRef.current } : {})
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stopWaveform(); stopStream();
        const mimeType = mimeTypeRef.current || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 1000) { setErrorMsg('Recording too short'); setRecState(STATE.ERROR); return; }
        setRecState(STATE.TRANSCRIBING)
        try {
          const text = await transcribeAudio(blob, mimeType)
          setTranscript(text)
          setRecState(STATE.NLP)
          const nlpData = await detectIntent(text)
          setNlpResult(nlpData)
          setShowNlpSection(true)
          if (nlpData.intent === 'CREATE_INVOICE') {
            setEditingData({
              customerName: nlpData.customerName || '',
              items: (nlpData.items || []).map(item => ({ ...item, id: Math.random() }))
            })
            setRecState(STATE.EDITING)
          } else {
            setRecState(STATE.DONE)
          }
        } catch (err) { setErrorMsg(err.message); setRecState(STATE.ERROR); }
      }
      recorder.start()
      setRecState(STATE.RECORDING)
      startWaveform(stream)
    } catch (err) { setErrorMsg(err.message); setRecState(STATE.ERROR); }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      setRecState(STATE.STOPPING)
      mediaRecorderRef.current.stop()
    }
  }, [])

  const isRecording = recState === STATE.RECORDING
  const isBusy = [STATE.REQUESTING, STATE.STOPPING, STATE.TRANSCRIBING, STATE.NLP, STATE.GENERATING].includes(recState)
  const isEditing = recState === STATE.EDITING
  const isDone = recState === STATE.DONE
  const isError = recState === STATE.ERROR

  return (
    <div className="space-y-6 font-dm w-full max-w-full">
      <div>
        <h1 className="font-syne text-2xl font-bold text-white">Voice Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Speak naturally to generate invoices instantly.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="relative flex flex-col items-center py-12 px-6 gap-6">
          <button
            onClick={isRecording ? stopRecording : (isDone || isError || recState === STATE.IDLE) ? startRecording : undefined}
            disabled={isBusy}
            className={`
              relative z-10 w-24 h-24 rounded-full flex items-center justify-center
              transition-all duration-300 shadow-2xl
              ${isRecording ? 'bg-rose-500' : isBusy ? 'bg-slate-700' : isError ? 'bg-rose-900' : isDone ? 'bg-emerald-600' : 'bg-cyan-500'}
            `}
          >
            {isBusy ? <Loader2 className="animate-spin text-white" /> : isRecording ? <MicOff className="text-white" /> : isDone ? <CheckCircle2 className="text-white" /> : isError ? <XCircle className="text-rose-300" /> : <Mic className="text-slate-950" />}
          </button>
          <div className="text-center">
            <p className={`text-sm font-medium ${isRecording ? 'text-rose-400' : 'text-slate-400'}`}>{STATE_LABEL[recState]}</p>
          </div>
        </div>

        <div className="border-t border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Transcript</p>
          <div className="min-h-[60px] rounded-xl p-4 bg-slate-800/40 border border-slate-800 text-sm text-slate-300">
            {transcript || 'No transcript yet...'}
          </div>
        </div>

        {recState === STATE.EDITING && editingData && (
          <div className="border-t border-slate-800 p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Review & Confirm</p>
            <input
              type="text"
              value={editingData.customerName}
              onChange={(e) => setEditingData({...editingData, customerName: e.target.value})}
              className="w-full bg-slate-800 border-slate-700 rounded-lg p-2 text-sm text-white"
            />
            <div className="space-y-2">
              {editingData.items.map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input className="flex-1 bg-slate-800 border-slate-700 rounded-lg p-2 text-sm text-white" value={it.name} onChange={(e) => {
                    const newItems = [...editingData.items];
                    newItems[idx].name = e.target.value;
                    setEditingData({...editingData, items: newItems});
                  }} />
                  <input className="w-16 bg-slate-800 border-slate-700 rounded-lg p-2 text-sm text-white" type="number" value={it.quantity} onChange={(e) => {
                    const newItems = [...editingData.items];
                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                    setEditingData({...editingData, items: newItems});
                  }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirmEdit} className="flex-1 bg-cyan-500 text-slate-950">Generate Invoice</Button>
              <Button onClick={() => setRecState(STATE.IDLE)} variant="ghost" className="text-slate-400">Cancel</Button>
            </div>
          </div>
        )}

        {isError && <div className="p-5 text-rose-400 text-sm border-t border-rose-900/30 font-medium">{errorMsg}</div>}

        {invoice && (
          <div className="p-8 border-t border-slate-800 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white font-syne uppercase">Tax Invoice</h2>
              <Button icon={Download} onClick={() => generateInvoicePDF(invoice)} className="bg-emerald-600">Download PDF</Button>
            </div>
            <InvoicePreview invoice={invoice} />
          </div>
        )}

        {(isDone || isError) && (
          <div className="border-t border-slate-800 p-4">
            <Button variant="ghost" className="text-slate-400" onClick={handleReset}>New Bill</Button>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex gap-3">
        <AlertCircle size={16} className="text-cyan-400 mt-1" />
        <p className="text-xs text-slate-400">Example: "Create invoice for Arun, 2 Laptops and 1 Mobile Phone"</p>
      </div>
    </div>
  )
}