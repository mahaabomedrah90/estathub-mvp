import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, DollarSign, Clock, AlertCircle, Loader2, ClipboardList, Plus, Pencil, FileCheck2, CheckCircle2 } from 'lucide-react'
import { fetchJson, authHeader } from '../../lib/api'

// Preliminary opportunity submissions (PropertyLead) — owner-facing labels.
// These are NOT approved properties. Owner-safe API excludes internal scoring fields.
const LEAD_STATUS = {
  NEW:                   { label: 'جديد',                 cls: 'bg-blue-100 text-blue-700' },
  UNDER_REVIEW:          { label: 'قيد المراجعة',         cls: 'bg-amber-100 text-amber-700' },
  NEEDS_INFO:            { label: 'مطلوب معلومات إضافية', cls: 'bg-orange-100 text-orange-700' },
  ACCEPTED:              { label: 'قبول مبدئي',           cls: 'bg-green-100 text-green-700' },
  READY_FOR_FINAL_REVIEW:{ label: 'قيد التجهيز للاعتماد النهائي', cls: 'bg-teal-100 text-teal-700' },
  AWAITING_OWNER_FINAL_ACCEPTANCE: { label: 'بانتظار موافقتك النهائية', cls: 'bg-purple-100 text-purple-700' },
  OWNER_FINAL_ACCEPTED:  { label: 'اكتملت موافقتك النهائية', cls: 'bg-sky-100 text-sky-700' },
  FINAL_APPROVED:        { label: 'اعتماد نهائي',         cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED:              { label: 'مرفوض',                cls: 'bg-red-100 text-red-700' },
  CONVERTED_TO_PROPERTY: { label: 'تم تحويله إلى عقار',   cls: 'bg-indigo-100 text-indigo-700' },
}
const LEAD_PROPERTY_TYPES = { land: 'أرض', apartment: 'شقة', building: 'عمارة', villa: 'فيلا', warehouse: 'مستودع', farm: 'مزرعة', commercial: 'تجاري', other: 'أخرى' }
const LEAD_CITIES = { riyadh: 'الرياض', jeddah: 'جدة', dammam: 'الدمام', khobar: 'الخبر', mecca: 'مكة المكرمة', medina: 'المدينة المنورة' }
const leadType = (v) => v ? (LEAD_PROPERTY_TYPES[v] || v) : ''
const leadCity = (v) => v ? (LEAD_CITIES[v] || v) : ''
const leadStatusOf = (l) => l.adminStatus || l.status || 'NEW'
const fmtLeadSar = (n) => (n || n === 0) ? Number(n).toLocaleString('en-US') + ' ر.س' : '—'
const fmtLeadDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
const IN_REVIEW = ['NEW', 'UNDER_REVIEW', 'NEEDS_INFO']

export default function OwnerRequests() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    setLoading(true); setError('')
    try {
      const data = await fetchJson('/api/property-leads/mine', { headers: { ...authHeader() } })
      setLeads(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Failed to load property leads:', e)
      setError('تعذّر تحميل طلباتي. حاول مرة أخرى.')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  // Once a lead is converted to a Property it should leave the active "طلباتي"
  // list (the owner follows it from "عقاراتي"); we still show it in a small
  // completed section for history — records are never deleted.
  const activeLeads = leads.filter((l) => leadStatusOf(l) !== 'CONVERTED_TO_PROPERTY')
  const convertedLeads = leads.filter((l) => leadStatusOf(l) === 'CONVERTED_TO_PROPERTY')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-primary">طلباتي</h1>
          <p className="text-text-muted mt-1">
            تابع طلبات التقديم المبدئي للعقارات وحالة مراجعتها من فريق الوسم.
          </p>
        </div>
        <button
          onClick={() => navigate('/owner/opportunities/new')}
          className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
        >
          <Plus size={20} />
          تقديم طلب جديد
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-accent" size={44} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 bg-surface-muted rounded-2xl border border-border-soft">
          <ClipboardList className="mx-auto text-brand-coral/30 mb-6" size={64} />
          <h3 className="text-xl font-semibold text-brand-primary mb-3">لا توجد طلبات تقديم مبدئي حتى الآن.</h3>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            قدّم طلب فرصة عقارية مبدئية ليقوم فريق الوسم بدراسته.
          </p>
          <button
            onClick={() => navigate('/owner/opportunities/new')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-accent text-white rounded-xl font-semibold hover:bg-brand-accent/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            تقديم طلب جديد
          </button>
        </div>
      ) : (
        <>
          {activeLeads.length === 0 ? (
            <div className="text-center py-10 bg-surface-muted rounded-2xl border border-border-soft">
              <p className="text-text-muted">لا توجد طلبات قيد المتابعة حالياً.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeLeads.map((lead) => {
            const statusKey = leadStatusOf(lead)
            const st = LEAD_STATUS[statusKey] || LEAD_STATUS.NEW
            const place = [leadCity(lead.city), lead.district].filter(Boolean).join(' - ')
            return (
              <div key={lead.id} className="bg-white border border-border-soft rounded-2xl shadow-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-brand-primary">{lead.propertyName || '—'}</h3>
                    <p className="text-sm text-text-muted mt-0.5 flex items-center gap-1 flex-wrap">
                      {leadType(lead.propertyType) && <span>{leadType(lead.propertyType)}</span>}
                      {leadType(lead.propertyType) && place && <span>•</span>}
                      {place && (
                        <span className="inline-flex items-center gap-1"><MapPin size={13} />{place}</span>
                      )}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${st.cls}`}>
                    {st.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm border-t border-border-soft pt-3">
                  <div className="flex items-center gap-1">
                    <DollarSign size={15} className="text-brand-accent" />
                    <span className="font-semibold text-brand-primary">{fmtLeadSar(lead.requestedPrice)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted">
                    <Clock size={14} />
                    <span>{fmtLeadDate(lead.createdAt)}</span>
                  </div>
                </div>

                {/* NEEDS_INFO — prominent box + review notes + update action */}
                {statusKey === 'NEEDS_INFO' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-orange-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-orange-800">مطلوب معلومات إضافية من فريق الوسم</p>
                    </div>
                    {lead.reviewNotes && (
                      <p className="text-xs text-orange-800 leading-relaxed pr-6">{lead.reviewNotes}</p>
                    )}
                    <button
                      onClick={() => navigate(`/owner/requests/${lead.id}/edit`)}
                      className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
                    >
                      <Pencil size={15} />
                      تحديث الطلب
                    </button>
                  </div>
                )}

                {/* READY_FOR_FINAL_REVIEW — owner may supplement info/documents during final review */}
                {statusKey === 'READY_FOR_FINAL_REVIEW' && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-teal-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-teal-800">قيد التجهيز للاعتماد النهائي</p>
                    </div>
                    {lead.reviewNotes && (
                      <p className="text-xs text-teal-800 leading-relaxed pr-6">{lead.reviewNotes}</p>
                    )}
                    <button
                      onClick={() => navigate(`/owner/requests/${lead.id}/edit`)}
                      className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
                    >
                      <Pencil size={15} />
                      إضافة معلومات للاعتماد النهائي
                    </button>
                  </div>
                )}

                {/* AWAITING_OWNER_FINAL_ACCEPTANCE — owner must review the agreement, pay preparation fee if any, and accept */}
                {statusKey === 'AWAITING_OWNER_FINAL_ACCEPTANCE' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileCheck2 size={16} className="text-purple-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-purple-800">مطلوب موافقتك النهائية</p>
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed pr-6">
                      يرجى مراجعة اتفاقية الإدراج والإقرار وسداد رسوم تجهيز العقار إن وجدت.
                    </p>
                    <button
                      onClick={() => navigate(`/owner/requests/${lead.id}/final-acceptance`)}
                      className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                    >
                      <FileCheck2 size={15} />
                      مراجعة الاتفاقية والدفع
                    </button>
                  </div>
                )}

                {/* OWNER_FINAL_ACCEPTED — read-only confirmation, no action */}
                {statusKey === 'OWNER_FINAL_ACCEPTED' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-sky-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-sky-800">اكتملت موافقتك النهائية</p>
                    </div>
                    <p className="text-xs text-sky-800 leading-relaxed pr-6">
                      تم إرسال موافقتك النهائية لفريق الوسم. سيقوم الفريق باستكمال الاعتماد النهائي.
                    </p>
                  </div>
                )}

                {/* Review notes for other statuses (the interactive states above handle their own) */}
                {!['NEEDS_INFO', 'READY_FOR_FINAL_REVIEW', 'AWAITING_OWNER_FINAL_ACCEPTANCE', 'OWNER_FINAL_ACCEPTED'].includes(statusKey) && lead.reviewNotes && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">{lead.reviewNotes}</p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1">
                  <Clock size={13} />
                  {IN_REVIEW.includes(statusKey)
                    ? 'قيد الدراسة من فريق الوسم — طلب تقديم مبدئي'
                    : 'طلب تقديم مبدئي'}
                </div>
              </div>
            )
          })}
          </div>
          )}

          {convertedLeads.length > 0 && (
            <div className="mt-8 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-brand-primary">طلبات تم تحويلها إلى عقارات</h2>
                <p className="text-sm text-text-muted mt-1">
                  تم تحويل هذه الطلبات إلى عقارات ويمكنك متابعتها من صفحة عقاراتي.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {convertedLeads.map((lead) => {
                  const place = [leadCity(lead.city), lead.district].filter(Boolean).join(' - ')
                  return (
                    <div key={lead.id} className="bg-white border border-border-soft rounded-2xl shadow-card p-5 opacity-90">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold text-brand-primary">{lead.propertyName || '—'}</h3>
                          <p className="text-sm text-text-muted mt-0.5 flex items-center gap-1 flex-wrap">
                            {leadType(lead.propertyType) && <span>{leadType(lead.propertyType)}</span>}
                            {leadType(lead.propertyType) && place && <span>•</span>}
                            {place && (
                              <span className="inline-flex items-center gap-1"><MapPin size={13} />{place}</span>
                            )}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${LEAD_STATUS.CONVERTED_TO_PROPERTY.cls}`}>
                          {LEAD_STATUS.CONVERTED_TO_PROPERTY.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate('/owner/properties')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-brand-primary/90 transition-colors"
              >
                عرض عقاراتي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
