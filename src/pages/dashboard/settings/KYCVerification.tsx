import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Upload, CheckCircle2, Clock, AlertCircle, ChevronRight, FileText, Camera, User, Shield, Loader2, Hash, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const STEPS = ['Personal Details', 'ID Document', 'Selfie Verification', 'Review']

type DocType = 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE'
const DOC_TYPES: { id: DocType; label: string; icon: string; needsBack: boolean }[] = [
  { id: 'PASSPORT',        label: 'Passport',         icon: '🛂', needsBack: false },
  { id: 'NATIONAL_ID',     label: 'National ID',      icon: '🪪', needsBack: true  },
  { id: 'DRIVERS_LICENSE', label: "Driver's License", icon: '🚗', needsBack: true  },
]

const MAX_MB = 10
const DOC_ACCEPT    = 'image/jpeg,image/png,image/webp,application/pdf'
const SELFIE_ACCEPT = 'image/jpeg,image/png,image/webp'

interface MyKYC { status: string; submittedAt: string; reviewedAt: string | null; rejectionReason: string | null; docType: DocType }

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? 'rgba(96,165,250,0.15)' : active ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.05)',
      border: done ? '2px solid rgba(96,165,250,0.4)' : active ? '2px solid rgba(96,165,250,0.5)' : '2px solid rgba(255,255,255,0.08)',
      fontSize: 12, fontWeight: 800,
      color: done ? '#60a5fa' : active ? '#93c5fd' : 'hsl(240 5% 45%)',
    }}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  )
}

/** Real file picker with drag & drop. */
function UploadZone({ label, hint, accept, file, onFile }: {
  label: string; hint: string; accept: string; file: File | null; onFile: (f: File | null, err?: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pick(f?: File) {
    if (!f) return
    if (!accept.split(',').includes(f.type)) { onFile(null, 'Unsupported file type.'); return }
    if (f.size > MAX_MB * 1024 * 1024) { onFile(null, `File must be ${MAX_MB}MB or smaller.`); return }
    onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${file ? 'rgba(96,165,250,0.4)' : dragging ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14, padding: '24px 20px', textAlign: 'center',
        background: file ? 'rgba(96,165,250,0.04)' : dragging ? 'rgba(96,165,250,0.05)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', transition: 'all 0.2s', marginBottom: 16,
      }}
    >
      <input ref={ref} type="file" accept={accept} hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
      {file ? (
        <>
          <CheckCircle2 size={26} style={{ color: '#60a5fa', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa' }}>{label} — added</p>
          <p style={{ fontSize: 11, color: 'hsl(240 5% 55%)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
          <p style={{ fontSize: 11, color: 'hsl(240 5% 45%)', marginTop: 2 }}>Tap to replace</p>
        </>
      ) : (
        <>
          <Upload size={26} style={{ color: 'hsl(240 5% 42%)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(40 6% 85%)' }}>{label}</p>
          <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', marginTop: 4 }}>{hint}</p>
          <span style={{ display: 'inline-block', marginTop: 12, fontSize: 12, fontWeight: 600, padding: '7px 18px', borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#93c5fd' }}>
            Browse files
          </span>
        </>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px',
  borderRadius: 10, fontSize: 13, background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)', color: 'hsl(40 6% 90%)',
  outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(240 5% 50%)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }
const cardStyle: React.CSSProperties = { background: 'hsl(222 60% 5%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export function KYCVerification() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [step, setStep] = useState(0)

  const [myKyc, setMyKyc] = useState<MyKYC | null>(null)
  const [kycLoading, setKycLoading] = useState(true)
  const [resubmitting, setResubmitting] = useState(false)

  const [saving, setSaving]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Step 1 — personal details (prefilled from the account)
  const [details, setDetails] = useState({ firstName: '', lastName: '', dateOfBirth: '', nationality: '' })
  // Steps 2 & 3 — documents
  const [docType, setDocType]     = useState<DocType>('PASSPORT')
  const [docNumber, setDocNumber] = useState('')
  const [front, setFront]   = useState<File | null>(null)
  const [back, setBack]     = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)

  const docMeta = DOC_TYPES.find(d => d.id === docType)!
  const status  = user?.kycStatus ?? 'NOT_SUBMITTED'

  useEffect(() => {
    if (!user) return
    setDetails({
      firstName:   user.firstName ?? '',
      lastName:    user.lastName  ?? '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
      nationality: user.nationality ?? '',
    })
  }, [user])

  // Latest submission (dates, rejection reason)
  useEffect(() => {
    api.get<{ success: boolean; data: MyKYC | null }>('/kyc/my')
      .then(res => setMyKyc(res.data))
      .catch(() => {})
      .finally(() => setKycLoading(false))
  }, [status])

  const setDetail = (k: keyof typeof details) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setDetails(d => ({ ...d, [k]: e.target.value }))
  }
  const fileSetter = (set: (f: File | null) => void) => (f: File | null, err?: string) => {
    setError(err ?? '')
    if (f) set(f)
  }
  const fullName = `${details.firstName} ${details.lastName}`.trim()

  // ── Step navigation ─────────────────────────────────────────────────────────
  async function saveDetailsAndContinue() {
    if (!details.firstName.trim() || !details.lastName.trim()) { setError('First and last name are required.'); return }
    if (!details.dateOfBirth)        { setError('Date of birth is required.'); return }
    if (!details.nationality.trim()) { setError('Nationality is required.'); return }
    const unchanged =
      details.firstName   === (user?.firstName ?? '') &&
      details.lastName    === (user?.lastName  ?? '') &&
      details.dateOfBirth === (user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '') &&
      details.nationality === (user?.nationality ?? '')
    if (!unchanged) {
      setSaving(true)
      try {
        await api.patch('/user/profile', details)
        await refreshUser()
      } catch (e: any) {
        setError(e?.message ?? 'Could not save your details.'); return
      } finally {
        setSaving(false)
      }
    }
    setStep(1)
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('docType',     docType)
      form.append('docNumber',   docNumber.trim())
      form.append('firstName',   details.firstName.trim())
      form.append('lastName',    details.lastName.trim())
      form.append('dateOfBirth', details.dateOfBirth)
      form.append('nationality', details.nationality.trim())
      if (user?.address) form.append('address', user.address)
      form.append('front', front!)
      if (back && docMeta.needsBack) form.append('back', back)
      form.append('selfie', selfie!)
      await api.upload('/kyc/submit', form)
      await refreshUser()
      setResubmitting(false)
      setStep(0)
    } catch (e: any) {
      setError(e?.message ?? 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext() {
    setError('')
    if (step === 0) { saveDetailsAndContinue(); return }
    if (step === 1) {
      if (docNumber.trim().length < 4) { setError('Enter your document number.'); return }
      if (!front) { setError('Upload the front of your document.'); return }
      if (docMeta.needsBack && !back) { setError('Upload the back of your document.'); return }
    }
    if (step === 2 && !selfie) { setError('Upload your selfie photo.'); return }
    if (step === STEPS.length - 1) { submit(); return }
    setStep(s => s + 1)
  }

  // ── Verification levels (real status) ───────────────────────────────────────
  const kycBadge: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    APPROVED:      { label: 'Verified',      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: CheckCircle2 },
    PENDING:       { label: 'Under Review',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
    REJECTED:      { label: 'Rejected',      color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: XCircle },
    NOT_SUBMITTED: { label: 'Not Submitted', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: AlertCircle },
  }
  const k = kycBadge[status] ?? kycBadge.NOT_SUBMITTED
  const LEVEL_STATUS = [
    user?.emailVerified
      ? { level: 'Level 1 — Email Verified', status: 'Verified',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: CheckCircle2 }
      : { level: 'Level 1 — Email Verified', status: 'Not Verified', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: AlertCircle },
    { level: 'Level 2 — Identity (KYC)', status: k.label, color: k.color, bg: k.bg, icon: k.icon },
    { level: 'Level 3 — Enhanced Due Diligence', status: 'Locked', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Shield },
  ]

  const showForm = status === 'NOT_SUBMITTED' || (status === 'REJECTED' && resubmitting)

  return (
    <div className="p-4 md:p-6 max-w-[760px] mx-auto overflow-x-hidden">
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(240 5% 60%)', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(40 10% 96%)' }}>KYC Verification</h1>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 52%)' }}>Verify your identity to unlock full account features</p>
        </div>
      </div>

      {/* Verification Levels */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 14 }}>Verification Levels</p>
        {LEVEL_STATUS.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '12px 0', borderBottom: i < LEVEL_STATUS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: l.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <l.icon size={15} style={{ color: l.color }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(40 6% 85%)' }}>{l.level}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: l.color, background: l.bg, whiteSpace: 'nowrap' }}>{l.status}</span>
          </div>
        ))}
      </div>

      {/* ── Approved ── */}
      {status === 'APPROVED' && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: '#60a5fa', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(40 10% 94%)' }}>Your identity is verified</p>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 55%)', marginTop: 6 }}>
            You have full access to your account{myKyc?.reviewedAt ? ` · Approved ${fmtDate(myKyc.reviewedAt)}` : ''}.
          </p>
        </div>
      )}

      {/* ── Pending review ── */}
      {status === 'PENDING' && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <Clock size={40} style={{ color: '#f59e0b', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(40 10% 94%)' }}>Your documents are under review</p>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 55%)', marginTop: 6, lineHeight: 1.6 }}>
            {myKyc?.submittedAt ? `Submitted ${fmtDate(myKyc.submittedAt)}. ` : ''}Our team will review your submission, usually within 24–48 hours. You'll be notified once it's approved.
          </p>
        </div>
      )}

      {/* ── Rejected (before choosing to resubmit) ── */}
      {status === 'REJECTED' && !resubmitting && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <XCircle size={40} style={{ color: '#f87171', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(40 10% 94%)' }}>Your verification was not approved</p>
          {!kycLoading && myKyc?.rejectionReason && (
            <p style={{ fontSize: 13, color: '#fca5a5', marginTop: 8, lineHeight: 1.6 }}>Reason: {myKyc.rejectionReason}</p>
          )}
          <button onClick={() => { setResubmitting(true); setStep(0) }} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Resubmit documents <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Submission form ── */}
      {showForm && (
        <>
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => i < step && setStep(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: i < step ? 'pointer' : 'default' }}>
                  <StepBadge n={i + 1} active={i === step} done={i < step} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: i === step ? '#93c5fd' : i < step ? '#60a5fa' : 'hsl(240 5% 45%)', whiteSpace: 'nowrap' }}>{s}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 36, height: 2, background: i < step ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.07)', margin: '0 6px', marginBottom: 18, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            {/* Step 0 — Personal Details */}
            {step === 0 && (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 4 }}>Personal Details</p>
                <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginBottom: 20 }}>Enter your details exactly as they appear on your government-issued ID.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {([
                    { key: 'firstName',   label: 'Legal First Name', type: 'text' },
                    { key: 'lastName',    label: 'Legal Last Name',  type: 'text' },
                    { key: 'dateOfBirth', label: 'Date of Birth',    type: 'date' },
                    { key: 'nationality', label: 'Nationality',      type: 'text' },
                  ] as const).map(({ key, label, type }) => (
                    <div key={key}>
                      <label style={labelStyle}>{label}</label>
                      <input type={type} style={inputStyle} value={details[key]} onChange={setDetail(key)} maxLength={type === 'text' ? 60 : undefined} max={type === 'date' ? new Date().toISOString().slice(0, 10) : undefined} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 1 — ID Document */}
            {step === 1 && (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 4 }}>Upload Identity Document</p>
                <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginBottom: 20 }}>Select document type and upload a clear, unobstructed photo.</p>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  {DOC_TYPES.map(d => (
                    <button key={d.id} onClick={() => { setDocType(d.id); setError('') }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, cursor: 'pointer', border: docType === d.id ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.08)', background: docType === d.id ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)', color: docType === d.id ? '#93c5fd' : 'hsl(240 5% 60%)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                      <span>{d.icon}</span> {d.label}
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>Document Number</label>
                  <input style={inputStyle} value={docNumber} onChange={e => { setDocNumber(e.target.value); setError('') }} maxLength={40} autoComplete="off" />
                </div>
                <UploadZone label="Front of Document" hint={`JPG, PNG, WebP or PDF · Max ${MAX_MB}MB`} accept={DOC_ACCEPT} file={front} onFile={fileSetter(setFront)} />
                {docMeta.needsBack && (
                  <UploadZone label="Back of Document" hint={`JPG, PNG, WebP or PDF · Max ${MAX_MB}MB`} accept={DOC_ACCEPT} file={back} onFile={fileSetter(setBack)} />
                )}
              </>
            )}

            {/* Step 2 — Selfie */}
            {step === 2 && (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 4 }}>Selfie Verification</p>
                <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginBottom: 20 }}>Take a clear photo of your face to verify it matches your document.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {['✅ Good lighting', '✅ Face fully visible', '❌ No sunglasses', '❌ No hat or cap'].map(tip => (
                    <div key={tip} style={{ padding: '10px 14px', borderRadius: 10, background: tip.startsWith('✅') ? 'rgba(96,165,250,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${tip.startsWith('✅') ? 'rgba(96,165,250,0.15)' : 'rgba(248,113,113,0.15)'}`, fontSize: 12, color: tip.startsWith('✅') ? '#60a5fa' : '#f87171' }}>
                      {tip}
                    </div>
                  ))}
                </div>
                <UploadZone label="Selfie Photo" hint={`Hold your ID next to your face · JPG, PNG or WebP · Max ${MAX_MB}MB`} accept={SELFIE_ACCEPT} file={selfie} onFile={fileSetter(setSelfie)} />
              </>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)', marginBottom: 4 }}>Review & Submit</p>
                <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginBottom: 20 }}>Please review your information before sending it for approval.</p>
                {[
                  { label: 'Full Name',       value: fullName,         icon: User },
                  { label: 'Document Type',   value: docMeta.label,    icon: FileText },
                  { label: 'Document Number', value: docNumber.trim(), icon: Hash },
                  { label: 'Documents',       value: docMeta.needsBack ? 'Front and back uploaded' : 'Front uploaded', icon: FileText },
                  { label: 'Selfie',          value: '1 photo uploaded', icon: Camera },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <row.icon size={14} style={{ color: '#60a5fa' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)' }}>{row.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(40 6% 88%)', wordBreak: 'break-word' }}>{row.value}</p>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.6 }}>By submitting, you confirm all provided information is accurate. False information may result in account suspension.</p>
                </div>
              </>
            )}
          </div>

          {error && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'right', marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button
              onClick={() => { setError(''); if (step > 0) setStep(s => s - 1); else if (resubmitting) setResubmitting(false); else navigate(-1) }}
              disabled={saving || submitting}
              style={{ padding: '10px 22px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            <button onClick={handleNext} disabled={saving || submitting} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 10, background: step === STEPS.length - 1 ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || submitting ? 'default' : 'pointer', opacity: saving || submitting ? 0.7 : 1 }}>
              {saving       ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
               : submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
               : step === STEPS.length - 1 ? '🚀 Submit Verification'
               : <>Continue <ChevronRight size={14} /></>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
