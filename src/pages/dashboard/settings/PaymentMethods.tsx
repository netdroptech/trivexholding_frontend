import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock, AlertCircle, Wallet, Loader2, X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

interface UserWallet { id: string; network: string; label: string | null; address: string; createdAt: string }

// Must match USER_WALLET_NETWORKS on the backend
const NETWORKS = [
  'BTC', 'ETH (ERC-20)', 'USDT (TRC-20)', 'USDT (ERC-20)', 'USDT (BEP-20)',
  'USDC (ERC-20)', 'BNB (BEP-20)', 'SOL', 'LTC', 'TRX', 'XRP', 'DOGE',
]

const NETWORK_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', USDT: '#26a17b', USDC: '#2775ca', BNB: '#f3ba2f',
  SOL: '#9945ff', LTC: '#345d9d', TRX: '#ef0027', XRP: '#23292f', DOGE: '#c2a633',
}
const colorFor = (network: string) => NETWORK_COLORS[network.split(' ')[0]] ?? '#60a5fa'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, padding: '0 14px',
  borderRadius: 10, fontSize: 13, fontWeight: 500,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  color: 'hsl(40 6% 90%)', outline: 'none', boxSizing: 'border-box',
}

function Section({ title, sub, action, children }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'hsl(222 60% 5%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(40 10% 94%)' }}>{title}</p>
          {sub && <p style={{ fontSize: 12, color: 'hsl(240 5% 52%)', marginTop: 2 }}>{sub}</p>}
        </div>
        {action}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(240 5% 50%)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>{children}</label>
}

function KycBanner({ status }: { status?: string }) {
  const navigate = useNavigate()
  const map: Record<string, { title: string; text: string; color: string; icon: React.ElementType; action?: string }> = {
    APPROVED:      { title: 'Identity Verified',        text: 'Your identity has been verified.',                                  color: '#60a5fa', icon: CheckCircle2 },
    PENDING:       { title: 'Verification Under Review', text: 'Your documents have been submitted and are being reviewed.',       color: '#f59e0b', icon: Clock },
    REJECTED:      { title: 'Verification Rejected',     text: 'Your verification was not approved. Please resubmit your documents.', color: '#f87171', icon: AlertCircle, action: 'Resubmit' },
    NOT_SUBMITTED: { title: 'Identity Not Verified',     text: 'Verify your identity to unlock all account features.',             color: '#f59e0b', icon: AlertCircle, action: 'Verify now' },
  }
  const b = map[status ?? 'NOT_SUBMITTED'] ?? map.NOT_SUBMITTED
  const Icon = b.icon
  return (
    <div style={{ background: `${b.color}0f`, border: `1px solid ${b.color}33`, borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <Icon size={18} style={{ color: b.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: b.color }}>{b.title}</p>
        <p style={{ fontSize: 11, color: 'hsl(240 5% 55%)' }}>{b.text}</p>
      </div>
      {b.action && (
        <button onClick={() => navigate('/dashboard/settings/kyc')} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, background: `${b.color}1f`, border: `1px solid ${b.color}4d`, color: b.color, cursor: 'pointer' }}>
          {b.action} <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}

export function PaymentMethods() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [wallets, setWallets]   = useState<UserWallet[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  const [adding, setAdding]     = useState(false)
  const [network, setNetwork]   = useState('')
  const [address, setAddress]   = useState('')
  const [label, setLabel]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')

  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ success: boolean; data: UserWallet[] }>('/user/wallets')
      .then(res => setWallets(res.data))
      .catch((e: any) => setLoadError(e?.message ?? 'Could not load your wallets.'))
      .finally(() => setLoading(false))
  }, [])

  function closeForm() {
    setAdding(false); setNetwork(''); setAddress(''); setLabel(''); setFormError('')
  }

  async function handleAdd() {
    setFormError('')
    if (!network) { setFormError('Choose a network.'); return }
    if (!address.trim()) { setFormError('Enter your wallet address.'); return }
    setSaving(true)
    try {
      const res = await api.post<{ success: boolean; data: UserWallet }>('/user/wallets', { network, address: address.trim(), label: label.trim() })
      setWallets(w => [...w, res.data])
      closeForm()
    } catch (e: any) {
      setFormError(e?.message ?? 'Could not add wallet.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/user/wallets/${id}`)
      setWallets(w => w.filter(x => x.id !== id))
    } catch (e: any) {
      setLoadError(e?.message ?? 'Could not remove wallet.')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-[760px] mx-auto overflow-x-hidden">
      <div className="flex items-center gap-3 mb-7">
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(240 5% 60%)', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(40 10% 96%)' }}>Payment Methods</h1>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 52%)' }}>Manage your crypto wallets</p>
        </div>
      </div>

      <KycBanner status={user?.kycStatus} />

      {/* Crypto Wallets */}
      <Section
        title="Crypto Wallets"
        sub="Save the wallet addresses you want to use for withdrawals"
        action={!adding && (
          <button onClick={() => setAdding(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)', color: '#93c5fd', cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={13} /> Add Wallet
          </button>
        )}
      >
        {/* Add form */}
        {adding && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(40 6% 88%)' }}>Add a wallet</p>
              <button onClick={closeForm} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(240 5% 55%)', display: 'flex' }}><X size={16} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4" style={{ marginBottom: 14 }}>
              <div>
                <Label>Network</Label>
                <select value={network} onChange={e => { setNetwork(e.target.value); setFormError('') }} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="" style={{ background: 'hsl(222 87% 6%)' }}></option>
                  {NETWORKS.map(n => <option key={n} value={n} style={{ background: 'hsl(222 87% 6%)' }}>{n}</option>)}
                </select>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <input value={label} onChange={e => setLabel(e.target.value)} maxLength={40} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label>Wallet Address</Label>
              <input value={address} onChange={e => { setAddress(e.target.value); setFormError('') }} maxLength={120} spellCheck={false} autoComplete="off" style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }} />
              <p style={{ fontSize: 11, color: 'hsl(240 5% 45%)', marginTop: 6 }}>Double-check the address and network. Funds sent to a wrong address can't be recovered.</p>
            </div>
            {formError && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{formError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={closeForm} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving && <Loader2 size={13} className="animate-spin" />} {saving ? 'Saving…' : 'Save Wallet'}
              </button>
            </div>
          </div>
        )}

        {loadError && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{loadError}</p>}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', color: 'hsl(240 5% 55%)' }}>
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : wallets.length === 0 && !adding ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Wallet size={26} style={{ color: 'hsl(240 5% 40%)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: 'hsl(240 5% 55%)' }}>No wallets saved yet.</p>
            <p style={{ fontSize: 11, color: 'hsl(240 5% 45%)', marginTop: 3 }}>Click "Add Wallet" to save your first address.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {wallets.map(w => {
              const c = colorFor(w.network)
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c}1a`, border: `1px solid ${c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wallet size={17} style={{ color: c }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(40 6% 88%)' }}>
                      {w.network}{w.label && <span style={{ fontWeight: 500, color: 'hsl(240 5% 55%)' }}> · {w.label}</span>}
                    </p>
                    <p title={w.address} style={{ fontSize: 11, color: 'hsl(240 5% 48%)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{w.address}</p>
                  </div>
                  {confirmId === w.id ? (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setConfirmId(null)} disabled={deletingId === w.id} style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'hsl(240 5% 55%)', cursor: 'pointer' }}>Keep</button>
                      <button onClick={() => handleDelete(w.id)} disabled={deletingId === w.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer' }}>
                        {deletingId === w.id && <Loader2 size={11} className="animate-spin" />} Remove
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(w.id)} aria-label="Remove wallet" style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} style={{ color: '#f87171' }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
