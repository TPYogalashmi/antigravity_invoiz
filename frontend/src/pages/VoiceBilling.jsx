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
  Download,
  Building2,
  Search,
  Minus,
  Save,
  X,
  RotateCcw,
  Edit3,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Clock,
  MoreVertical,
  CheckCircle
} from 'lucide-react'
import Button from '../components/ui/Button'
import { aiClient, backendClient } from '../api/axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'
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
  const { user: seller } = useAuthStore()
  const [recState, setRecState] = useState(STATE.IDLE)
  const [transcript, setTranscript] = useState('')
  const [nlpResult, setNlpResult] = useState(null)
  const [editingData, setEditingData] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [showNlpSection, setShowNlpSection] = useState(false)
  const [billingType, setBillingType] = useState('B2C')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [frequentProducts, setFrequentProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productSuggestions, setProductSuggestions] = useState([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [dbProducts, setDbProducts] = useState([])
  const [oosVoiceItems, setOosVoiceItems] = useState([])
  const [unrecognizedVoiceItems, setUnrecognizedVoiceItems] = useState([])
  const [customerPage, setCustomerPage] = useState(0)
  const [customerTotalPages, setCustomerTotalPages] = useState(0)
  const [productPage, setProductPage] = useState(0)
  const [productTotalPages, setProductTotalPages] = useState(0)

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

  const fetchCustomerSuggestions = useCallback(async (query, page = 0) => {
    if (!query || query.length < 1) {
      setCustomerSuggestions([])
      setCustomerTotalPages(0)
      return
    }
    try {
      const resp = await backendClient.get('/customers', {
        params: { search: query, page, size: 5, hasTaxId: billingType === 'B2B' }
      })
      const data = resp.data?.data;
      setCustomerSuggestions(data?.content || [])
      setCustomerTotalPages(data?.totalPages || 0)
      setCustomerPage(page)
      setShowCustomerDropdown(true)
    } catch (err) {
      console.error('Customer fetch failed', err)
    }
  }, [billingType])

  const fetchFrequentProducts = useCallback(async (customerId) => {
    try {
      const resp = await backendClient.get('/products/frequent', {
        params: { customerId, limit: 3 }
      })
      setFrequentProducts(resp.data?.data || [])
    } catch (err) {
      console.error('Frequent products fetch failed', err)
    }
  }, [])

  const fetchCustomerDetails = useCallback(async (customerId) => {
    try {
      const resp = await backendClient.get(`/customers/${customerId}/profile`)
      setSelectedCustomer(prev => ({ ...prev, ...resp.data?.data }))
    } catch (err) {
      console.error('Failed to fetch customer profile', err)
    }
  }, [])

  const handleWalkInSelect = async () => {
    try {
      const resp = await backendClient.get('/customers', {
        params: { search: '1111111111', size: 1 }
      })
      const found = resp.data?.data?.content?.find(c => c.phone === '1111111111')

      if (found) {
        setSelectedCustomer(found)
        fetchCustomerDetails(found.id)
        toast.success('Walk-in selected')
      } else {
        if (window.confirm('Walk-in Customer record not found. Create it now?')) {
          const createResp = await backendClient.post('/customers', {
            name: 'Walk-in Customer',
            phone: '1111111111',
            status: 'ACTIVE'
          })
          const newCust = createResp.data?.data
          if (newCust) {
            setSelectedCustomer(newCust)
            fetchCustomerDetails(newCust.id)
            toast.success('Walk-in record created')
          }
        }
      }
    } catch (err) {
      toast.error('Failed to select walk-in customer')
    }
  }

  const handleUpdateDiscount = async (productId, val) => {
    if (!selectedCustomer) return
    try {
      if (productId) {
        await backendClient.patch(`/customers/${selectedCustomer.id}/specific-discounts/${productId}`, null, {
          params: { discount: parseFloat(val) || 0 }
        })
      } else {
        await backendClient.patch(`/customers/${selectedCustomer.id}/overall-discount`, null, {
          params: { discount: parseFloat(val) || 0 }
        })
      }
      fetchCustomerDetails(selectedCustomer.id)
      toast.success('Reward percentage updated')
    } catch (err) {
      toast.error('Failed to update discount')
    }
  }

  const fetchProductSuggestions = useCallback(async (query, page = 0) => {
    if (!query || query.length < 1) {
      setProductSuggestions([])
      setProductTotalPages(0)
      return
    }
    try {
      const resp = await backendClient.get('/products', {
        params: { search: query, page, size: 5, onlyName: true }
      })
      const data = resp.data?.data;
      setProductSuggestions(data?.content || [])
      setProductTotalPages(data?.totalPages || 0)
      setProductPage(page)
      setShowProductDropdown(true)
    } catch (err) {
      console.error('Product fetch failed', err)
    }
  }, [])

  const fetchAllProducts = useCallback(async () => {
    try {
      const resp = await backendClient.get('/products', { params: { size: 1000 } })
      setDbProducts(resp.data?.data?.content || [])
    } catch (err) {
      console.error('All products fetch failed', err)
    }
  }, [])

  useEffect(() => {
    fetchAllProducts()
  }, [fetchAllProducts])

  useEffect(() => {
    const delay = setTimeout(() => {
      if (customerSearch && !selectedCustomer) fetchCustomerSuggestions(customerSearch)
    }, 300)
    return () => clearTimeout(delay)
  }, [customerSearch, fetchCustomerSuggestions, selectedCustomer])

  useEffect(() => {
    const delay = setTimeout(() => {
      if (productSearch) fetchProductSuggestions(productSearch)
    }, 300)
    return () => clearTimeout(delay)
  }, [productSearch, fetchProductSuggestions])

  useEffect(() => {
    if (selectedCustomer) {
      fetchFrequentProducts(selectedCustomer.id)
    } else {
      setFrequentProducts([])
    }
  }, [selectedCustomer, fetchFrequentProducts])

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
    const res = await aiClient.post('/nlp/intent', {
      transcript: text,
      inventory: dbProducts.map(p => p.name || p.rawName)
    })
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

  const handleUpdateStatus = async (status) => {
    if (!invoice) return;
    try {
      const resp = await backendClient.patch(`/invoices/${invoice.id}/status`, null, {
        params: { status }
      })
      const updatedInv = resp.data?.data;
      if (updatedInv) {
        setInvoice(updatedInv);
        toast.success(`Invoice marked as ${status.toLowerCase()}`);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  }

  const handleReset = () => {
    setRecState(STATE.IDLE); setTranscript(''); setNlpResult(null);
    setEditingData(null); setInvoice(null); setErrorMsg('');
    setCustomerSearch(''); setBillingType('B2C');
    setSelectedCustomer(null); setFrequentProducts([]);
    setProductSearch(''); setProductSuggestions([]);
    setOosVoiceItems([]);
    setUnrecognizedVoiceItems([]);
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

          const nlpItems = nlpData.items || [];
          const normalItems = [];
          const oosItemsFound = [];
          const unrecItemsFound = [];

          nlpItems.forEach(item => {
            const itemName = item.name || item.rawName;
            const dbProd = dbProducts.find(p => p.name?.toLowerCase() === itemName?.toLowerCase() || p.alias?.toLowerCase() === itemName?.toLowerCase());

            if (!dbProd) {
              unrecItemsFound.push({ ...item, name: itemName });
            } else if (dbProd.status === 'OUT_OF_STOCK') {
              oosItemsFound.push({ ...item, name: dbProd.name });
            } else {
              normalItems.push({
                ...item,
                name: dbProd.name,
                unit: item.unit || dbProd.unit || 'PCS',
                id: Math.random()
              });
            }
          });

          setOosVoiceItems(oosItemsFound);
          setUnrecognizedVoiceItems(unrecItemsFound);

          // Check for intent or at least some items
          if (nlpData.intent === 'CREATE_INVOICE' || (normalItems.length > 0)) {
            setEditingData({
              customerName: (selectedCustomer ? (selectedCustomer.name || selectedCustomer.company) : customerSearch) || nlpData.customerName || '',
              items: normalItems
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
  }, [customerSearch, selectedCustomer, billingType, dbProducts])

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
        <h1 className="font-syne text-2xl text-white">Voice Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Speak naturally to generate invoices instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection Card */}
        <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 backdrop-blur-md relative z-30 overflow-visible shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="px-1 mt-1 text-lg font-bold text-white font-syne">Customer Selection</h2>
            </div>

            {/* B2B / B2C Toggle and Walk-in */}
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={handleWalkInSelect}
                className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-95"
              >
                Walk-in
              </button>
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  onClick={() => setBillingType('B2C')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${billingType === 'B2C' ? 'bg-cyan-500 text-slate-950 shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}
                >B2C</button>
                <button
                  onClick={() => setBillingType('B2B')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 ${billingType === 'B2B' ? 'bg-amber-500 text-slate-950 shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}
                >B2B</button>
              </div>
            </div>
          </div>

          <div className="mt-2 relative group">
            <input
              type="text"
              placeholder={billingType === 'B2B' ? "Enter Company Name..." : "Enter Customer Name..."}
              value={selectedCustomer ? (selectedCustomer.name || selectedCustomer.company) : customerSearch}
              readOnly={!!selectedCustomer}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && selectedCustomer) {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }
              }}
              className="w-full px-6 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500/50 ring-4 ring-cyan-500/0 focus:ring-cyan-500/5 transition-all text-sm font-medium"
            />
            {showCustomerDropdown && !selectedCustomer && (
              <div className="absolute z-50 top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200">
                {customerSuggestions.map(c => (
                  <button
                    key={c.id}
                    disabled={c.status === 'SUSPENDED'}
                    onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); fetchCustomerDetails(c.id); }}
                    className={`w-full text-left px-5 py-3 border-b border-slate-800/50 last:border-0 transition-all ${c.status === 'SUSPENDED'
                      ? 'opacity-60 cursor-not-allowed bg-slate-950/30'
                      : 'hover:bg-slate-800'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`text-sm font-bold ${c.status === 'SUSPENDED' ? 'text-slate-500' : 'text-white'}`}>{c.name || c.company}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{c.taxId ? 'B2B' : 'B2C'}</p>
                          {c.phone && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-800" />
                              <p className="text-[9px] text-cyan-500/60 font-mono italic">{c.phone}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {c.status === 'SUSPENDED' && (
                        <span className="text-[8px] font-black text-rose-500 border border-rose-500/20 bg-rose-500/5 px-2 py-0.5 rounded-full uppercase tracking-wider">Suspended</span>
                      )}
                    </div>
                  </button>
                ))}

                {customerTotalPages > 1 && (
                  <div className="px-5 py-2.5 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
                    <button
                      disabled={customerPage === 0}
                      onClick={(e) => { e.stopPropagation(); fetchCustomerSuggestions(customerSearch, customerPage - 1); }}
                      className="p-1 px-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 text-slate-400 transition flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {customerPage + 1} / {customerTotalPages}
                    </span>
                    <button
                      disabled={customerPage >= customerTotalPages - 1}
                      onClick={(e) => { e.stopPropagation(); fetchCustomerSuggestions(customerSearch, customerPage + 1); }}
                      className="p-1 px-2 rounded-lg hover:bg-slate-700 disabled:opacity-30 text-slate-400 transition flex items-center gap-1 text-[10px] font-bold uppercase"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recording Visualizer/Status Card */}
        <div className="rounded-[2.5rem] bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="relative flex flex-col items-center py-8 px-6 gap-4">
            <button
              onClick={isRecording ? stopRecording : (isDone || isError || recState === STATE.IDLE) ? startRecording : undefined}
              disabled={isBusy}
              className={`
                relative z-10 w-20 h-20 rounded-full flex items-center justify-center
                transition-all duration-300 shadow-2xl
                ${isRecording ? 'bg-rose-500 animate-pulse' : isBusy ? 'bg-slate-700' : isError ? 'bg-rose-900' : isDone ? 'bg-emerald-600' : 'bg-cyan-500'}
              `}
            >
              {isBusy ? <Loader2 className="animate-spin text-white" /> : isRecording ? <MicOff className="text-white" /> : isDone ? <CheckCircle2 className="text-white" /> : isError ? <XCircle className="text-rose-300" /> : <Mic className="text-slate-950" />}
            </button>
            <div className="text-center">
              <p className={`text-xs font-bold uppercase tracking-widest ${isRecording ? 'text-rose-400' : 'text-slate-400'}`}>{STATE_LABEL[recState]}</p>
            </div>

            {/* Audio Waveform effect */}
            {isRecording && (
              <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div
                  className="w-48 h-48 rounded-full border border-cyan-500"
                  style={{ transform: `scale(${1 + audioLevel})` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Out of Stock Alert - Floating Popup Version */}
      {oosVoiceItems.length > 0 && (
        <div className="fixed bottom-8 right-8 z-[100] w-80 p-5 rounded-[2rem] bg-slate-950/90 border border-rose-500/30 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-500 group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/20" />
          <button
            onClick={() => setOosVoiceItems([])}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-lg"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-rose-500 tracking-[0.2em] mb-0.5">Inventory Warning</p>
              <h3 className="text-xs font-bold text-white tracking-tight">Spoken Items Out of Stock</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 mb-2">
            {oosVoiceItems.map((item, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/10 text-[10px] font-bold text-rose-400 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-rose-500" />
                {item.name}
              </div>
            ))}
          </div>
          <p className="text-[8px] text-slate-500 mt-3 font-medium border-t border-slate-800/50 pt-3 italic">
            * These items were automatically excluded from the bill.
          </p>
        </div>
      )}

      {/* Unrecognized Items - Floating Popup Version */}
      {unrecognizedVoiceItems.length > 0 && (
        <div className="fixed bottom-8 right-8 z-[110] w-80 p-5 rounded-[2rem] bg-slate-950/90 border border-amber-500/30 backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-500 group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-amber-500/20" />
          <button
            onClick={() => setUnrecognizedVoiceItems([])}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-lg"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
              <Search size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] mb-0.5">Missing Inventory</p>
              <h3 className="text-xs font-bold text-white tracking-tight">Products Not Found</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2 mb-2">
            {unrecognizedVoiceItems.map((item, idx) => (
              <div key={idx} className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/10 text-[10px] font-bold text-amber-400 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                {item.name}
              </div>
            ))}
          </div>
          <p className="text-[8px] text-slate-500 mt-3 font-medium border-t border-slate-800/50 pt-3 italic leading-relaxed">
            * These items are not in your inventory and were skipped. You can add them manually if needed.
          </p>
        </div>
      )}

      {selectedCustomer && selectedCustomer.phone !== '1111111111' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Smart Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                {frequentProducts.length > 0 ? "Smart Suggestions" : "Suggestions"}
              </p>
            </div>

            {frequentProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {frequentProducts.map((p) => {
                  const isOutOfStock = p.status === 'OUT_OF_STOCK';
                  return (
                    <button
                      key={p.id}
                      disabled={isOutOfStock}
                      onClick={() => {
                        if (recState === STATE.EDITING) {
                          const qty = p.suggestedQuantity > 0 ? p.suggestedQuantity : 1;
                          const newItem = {
                            name: p.name,
                            quantity: qty,
                            unit: p.unit || 'PCS',
                            id: Math.random()
                          };
                          setEditingData({ ...editingData, items: [...editingData.items, newItem] });
                          toast.success(`Added ${p.name}`);
                        } else {
                          toast.info(`Speak to add ${p.name}`);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all text-left group ${isOutOfStock
                        ? 'bg-rose-500/5 border-rose-500/20 cursor-not-allowed opacity-60'
                        : 'bg-slate-900/40 border-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800'
                        }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <p className={`text-[11px] font-bold truncate ${isOutOfStock ? 'text-rose-400' : 'text-slate-300 group-hover:text-cyan-400'}`}>
                          {p.name}
                        </p>
                        {isOutOfStock && <span className="text-[7px] font-black text-rose-500 uppercase shrink-0">OOS</span>}
                      </div>
                      <p className="text-[9px] text-slate-600 mt-1 uppercase font-black truncate">{p.alias || ' '}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900/20 border border-dashed border-slate-800 text-center">
                <p className="text-[11px] text-slate-600 italic">No historical data found.</p>
              </div>
            )}
          </div>

          {/* Approved Discounts */}
          <div className="space-y-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-500 rounded-full" />
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Approved Discounts</p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
              {billingType === 'B2B' ? (
                <div className="min-w-[280px] p-1 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 flex flex-col justify-center snap-start">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-300 px-2">Corporate Flat Discount</p>
                    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-2 py-1 focus-within:border-indigo-500 transition">

                      <input
                        type="number"
                        defaultValue={selectedCustomer.customer?.agreedDiscount || 0}
                        onBlur={(e) => handleUpdateDiscount(null, e.target.value)}
                        className="w-12 bg-transparent text-indigo-400 font-semibold outline-none text-right placeholder:text-slate-500"
                      />

                      <span className="text-xs font-semibold text-slate-400">%</span>

                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-tight font-medium px-2">Standard approved for {selectedCustomer.customer?.company || 'B2B Customer'}</p>
                </div>
              ) : (
                selectedCustomer.configuredDiscounts && selectedCustomer.configuredDiscounts.filter(d => d.agreedDiscount > 0).length > 0 ? (
                  selectedCustomer.configuredDiscounts.filter(d => d.agreedDiscount > 0).map(disc => (
                    <div key={disc.productId} className="min-w-[200px] p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 snap-start group/disc hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center justify-between gap-2 overflow-hidden">
                        <p className="text-[11px] font-bold text-slate-200 truncate flex-1">{disc.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            defaultValue={disc.agreedDiscount}
                            onBlur={(e) => handleUpdateDiscount(disc.productId, e.target.value)}
                            className="w-10 bg-slate-950/50 border border-slate-800 rounded-lg text-[10px] text-center font-black text-indigo-400 focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-[10px] font-bold text-slate-600">%</span>
                        </div>
                      </div>
                      {disc.alias && <p className="text-[9px] text-slate-600 font-mono italic mt-1.5 truncate">{disc.alias}</p>}
                    </div>
                  ))
                ) : (
                  <div className="flex-1 p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">No active rewards set yet for this customer</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">

        <div className="border-t border-slate-800 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Transcript</p>
          <div className="min-h-[60px] rounded-xl p-4 bg-slate-800/40 border border-slate-800 text-sm text-slate-300">
            {transcript || 'No transcript yet...'}
          </div>
        </div>

        {recState === STATE.EDITING && editingData && (
          <div className="border-t border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Review & Edit Bill</p>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                <FileText size={12} className="text-slate-400" />
                <span className="text-[10px] text-slate-300 font-bold uppercase">{selectedCustomer ? 'Registered' : 'New Customer'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Billed To</label>
                <input
                  type="text"
                  value={editingData.customerName}
                  onChange={(e) => setEditingData({ ...editingData, customerName: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-cyan-500/50 rounded-2xl p-3.5 text-sm text-white font-bold transition-all"
                  placeholder="Customer Name"
                />
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Add Product Manually</label>
                <div className="relative group">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/50 border border-slate-800 focus:border-emerald-500/50 rounded-2xl text-sm text-white placeholder-slate-600 transition-all"
                    placeholder="Search by name..."
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  {showProductDropdown && productSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                      {productSuggestions.map(p => {
                        const isOos = p.status === 'OUT_OF_STOCK';
                        return (
                          <button
                            key={p.id}
                            disabled={isOos}
                            onClick={() => {
                              const newItem = { name: p.name, quantity: 1, unit: p.unit || 'PCS', id: Math.random() };
                              setEditingData({ ...editingData, items: [...editingData.items, newItem] });
                              setProductSearch('');
                              setShowProductDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3 border-b border-slate-800/50 last:border-0 flex justify-between items-center transition-all ${isOos ? 'bg-rose-500/5 opacity-60 cursor-not-allowed' : 'hover:bg-slate-800'
                              }`}
                          >
                            <div>
                              <p className={`text-sm font-bold ${isOos ? 'text-rose-400' : 'text-white'}`}>{p.name}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-black">{p.unit || 'PCS'}</p>
                            </div>
                            {isOos && (
                              <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">OOS</span>
                            )}
                          </button>
                        );
                      })}

                      {productTotalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/20">
                          <button
                            disabled={productPage === 0}
                            onClick={(e) => { e.stopPropagation(); fetchProductSuggestions(productSearch, productPage - 1); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase transition hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ChevronLeft size={14} /> Prev
                          </button>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            {productPage + 1} / {productTotalPages}
                          </span>
                          <button
                            disabled={productPage >= productTotalPages - 1}
                            onClick={(e) => { e.stopPropagation(); fetchProductSuggestions(productSearch, productPage + 1); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold uppercase transition hover:bg-slate-700 disabled:opacity-30"
                          >
                            Next <ChevronRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase font-black text-slate-500 ml-1">Items List</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {editingData.items.map((it, idx) => {
                  const isDecimal = ['kg', 'g', 'mg', 'ltr', 'ml'].includes(it.unit?.toLowerCase());
                  const step = isDecimal ? 0.1 : 1;

                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/30 border border-slate-800/50 rounded-2xl group/item hover:border-slate-700 transition-all">
                      <div className="flex-1 min-w-0">
                        <input
                          className="w-full bg-transparent border-none p-0 text-sm font-bold text-white focus:outline-none"
                          value={it.name}
                          onChange={(e) => {
                            const newItems = [...editingData.items];
                            newItems[idx].name = e.target.value;
                            setEditingData({ ...editingData, items: newItems });
                          }}
                        />
                        <p className="text-[8px] font-black uppercase text-slate-600 tracking-tighter mt-0.5">{it.unit || 'PCS'}</p>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800">
                        <button
                          onClick={() => {
                            const newItems = [...editingData.items];
                            newItems[idx].quantity = Math.max(step, (parseFloat(it.quantity) || 0) - step);
                            setEditingData({ ...editingData, items: newItems });
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          className="w-12 bg-transparent text-center text-xs font-black text-cyan-400 focus:outline-none"
                          type="number"
                          value={it.quantity}
                          step={step}
                          onChange={(e) => {
                            const newItems = [...editingData.items];
                            const val = parseFloat(e.target.value) || 0;
                            newItems[idx].quantity = isDecimal ? val : Math.round(val);
                            setEditingData({ ...editingData, items: newItems });
                          }}
                        />

                        <button
                          onClick={() => {
                            const newItems = [...editingData.items];
                            newItems[idx].quantity = (parseFloat(it.quantity) || 0) + step;
                            setEditingData({ ...editingData, items: newItems });
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          const newItems = editingData.items.filter((_, i) => i !== idx);
                          setEditingData({ ...editingData, items: newItems });
                        }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmEdit}
                className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Save size={14} /> Generate Invoice
              </button>
              <button
                onClick={() => setRecState(STATE.IDLE)}
                className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {invoice && (
          <div className="p-8 border-t border-slate-800 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900/50 border border-slate-800 rounded-[2rem] gap-4">
              <h2 className="text-white font-syne text-xl"> Invoice Generated</h2>
              <div className="flex flex-wrap gap-2">
                <Button icon={Download} onClick={() => generateInvoicePDF({ ...invoice, seller })} className="bg-emerald-600 shadow-lg shadow-emerald-500/20">PDF</Button>
                <Button icon={RotateCcw} onClick={handleReset} variant="ghost" className="bg-slate-800 text-slate-300 hover:text-white border border-slate-700">New Bill</Button>
                {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                  <>
                    <Button
                      icon={CheckCircle2}
                      onClick={() => handleUpdateStatus('PAID')}
                      className="bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-semibold"
                    >
                      Mark Paid
                    </Button>
                    <Button
                      icon={XCircle}
                      onClick={() => handleUpdateStatus('CANCELLED')}
                      className="bg-rose-500/30 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 font-semibold"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
            <InvoicePreview invoice={{ ...invoice, seller }} />
          </div>
        )}

        {isError && <div className="p-5 text-rose-400 text-sm border-t border-rose-900/30 font-medium">{errorMsg}</div>}

        {(isDone || isError) && !invoice && (
          <div className="border-t border-slate-800 p-4 text-center">
            <Button variant="ghost" className="text-slate-400" onClick={handleReset}>New Bill</Button>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex gap-3">
        <AlertCircle size={16} className="text-cyan-400 mt-1" />
        <p className="text-xs text-slate-400">Example: "Create invoice for Arun, 2 Pineapple, 1 Onion or select the customer in serach bar and then speak 2 mango, 10 kiwi. Don't use conjunctions like 'and' etc."</p>
      </div>
    </div>
  )
}