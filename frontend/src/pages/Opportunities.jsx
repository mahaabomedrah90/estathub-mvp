import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Loader2, Edit2, Eye } from 'lucide-react';
import { fetchJson } from '../lib/api';
import { useTranslation } from 'react-i18next';
import SectionCard from '../components/ui/SectionCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import StatCard from '../components/ui/StatCard';
import PageWrapper from '../components/ui/PageWrapper';
import HeroSection from '../components/ui/HeroSection';
import { PageTitle, SectionSubtitle, CardTitle, CardSubtitle, BodyText, MutedText, Caption } from '../components/ui/Typography';
import WaitlistSection from '../components/WaitlistSection';

export default function Opportunities() {
  const { t, i18n } = useTranslation('property');
  const isRtl = i18n.language === 'ar';
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('role');
    setUserRole(role);

    setLoading(true);
    setError('');

    fetchJson('/api/properties?status=APPROVED')
      .then(data => {
        setProperties(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(t('list.loadError'));
        setLoading(false);
      });
  }, []);

  const getPropertyTypeLabel = (type) => {
    if (!type) return 'Residential';

    const typeMap = {
      residential: 'Residential',
      commercial: 'Commercial',
      logistics: 'Logistics',
    };

    return typeMap[type.toLowerCase()] || 'Residential';
  };

  const getAnnualYield = (monthlyYield) => {
    return Number((monthlyYield || 0) * 12).toFixed(1);
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-amber-100 text-amber-700',
      APPROVED: 'bg-brand-accent/10 text-brand-accent',
      REJECTED: 'bg-red-100 text-red-700',
    };

    return styles[status] || 'bg-surface-muted text-gray-700';
  };

  return (
    <PageWrapper>
      {/* Hero Section */}
      <div className="bg-surface-muted -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <HeroSection 
          title={userRole === 'owner'
            ? t('list.heroTitleOwner')
            : t('list.heroTitleInvestor')}
          subtitle={userRole === 'owner'
            ? t('list.heroSubtitleOwner')
            : t('list.heroSubtitleInvestor')}
        />
      </div>

      {/* Temporary pre-launch mode: hide demo listings and collect waitlist leads. */}
      <div className="space-y-0">
        <SectionCard className="py-14 text-center">
          <img
            src="/Full Logo 1.png"
            alt="الوسم"
            className="mx-auto mb-6 h-16 w-auto opacity-40"
          />
          <h3 className="text-xl font-bold text-text-strong mb-2">
            {isRtl
              ? 'الفرص قيد التحديث… قريبًا تجد ما يناسبك'
              : 'Opportunities loading — find what suits you soon'}
          </h3>
          <p className="text-text-muted text-sm mb-6">
            {isRtl
              ? 'سجّل اهتمامك الآن وكن من أوائل المستثمرين عند الإطلاق.'
              : 'Register your interest now and be among the first investors at launch.'}
          </p>
        </SectionCard>
        <WaitlistSection source="opportunities" />
      </div>

      {/* Property grid — suppressed until launch. Remove `false &&` to restore. */}
      {false && (
        <div className="space-y-12">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="mx-auto animate-spin text-brand-accent" size={40} />
                <MutedText>{t('list.loading')}</MutedText>
              </div>
            </div>
          ) : error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
              role="alert"
            >
              {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="space-y-0">
              <SectionCard className="py-14 text-center" />
              <WaitlistSection source="opportunities" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => {
                const status = p.status || 'APPROVED';
                const tokenPrice = Number(p.tokenPrice ?? 0);
                const monthlyYield = p.monthlyYield ?? 0;
                const remainingTokens = p.remainingTokens ?? p.tokensAvailable ?? 0;
                const totalTokens = p.totalTokens ?? remainingTokens;

                const soldTokensCount = totalTokens - remainingTokens;
                const fundingProgress =
                  totalTokens > 0
                    ? Math.round((soldTokensCount / totalTokens) * 100)
                    : 0;

                const annualYield = getAnnualYield(monthlyYield);

                return (
                  <SectionCard
                    key={p.id}
                    hover
                    className="group relative overflow-hidden"
                    padding="md"
                  >
                    <div className="relative h-48 overflow-hidden bg-surface-muted">
                      <div className="absolute left-3 top-3 z-10">
                        <span className="inline-flex items-center rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-text-strong shadow-sm">
                          {getPropertyTypeLabel(p.propertyType)}
                        </span>
                      </div>

                      {userRole === 'owner' && (
                        <div className="absolute right-3 top-3 z-10">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(status)}`}
                          >
                            {status}
                          </span>
                        </div>
                      )}

                      {p.imageUrl ? (
                        <>
                          <img
                            src={p.imageUrl}
                            alt={p.name ?? p.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                              if (fallback) fallback.classList.add('flex');
                            }}
                          />
                          <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-surface-muted to-surface-border">
                            <Building2 className="text-text-muted" size={48} />
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-muted to-surface-border">
                          <Building2 className="text-text-muted" size={48} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <CardTitle className="mb-2">{p.name ?? p.title}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-text-muted">
                          <MapPin size={14} />
                          <span>{p.city || t('list.locationFallback')}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <MutedText>{t('list.card.startsFrom')}</MutedText>
                          <span className="font-semibold text-text-strong">
                            {tokenPrice.toLocaleString()} SAR
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <MutedText>{t('list.card.annualYield')}</MutedText>
                          <span className="font-semibold text-brand-accent">{annualYield}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <MutedText>{t('list.card.fundingProgress')}</MutedText>
                          <span className="font-medium text-text-strong">{fundingProgress}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="w-full h-2 rounded-full bg-surface-border overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${fundingProgress}%`, backgroundColor: '#48D1C5' }}
                          />
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {t('list.percentSold', { value: fundingProgress })}
                        </div>
                      </div>

                      <div className="pt-2">
                        {userRole === 'owner' ? (
                          <div className="flex gap-2">
                            <PrimaryButton
                              size="sm"
                              onClick={() => navigate(`/properties/${p.id}`)}
                              icon={Eye}
                            >
                              {t('list.view')}
                            </PrimaryButton>
                            {(status === 'PENDING' || status === 'REJECTED') && (
                              <PrimaryButton
                                variant="accent"
                                size="sm"
                                onClick={() => navigate('/owner/properties')}
                                icon={Edit2}
                              >
                                {t('list.edit')}
                              </PrimaryButton>
                            )}
                          </div>
                        ) : (
                          <a
                            href="/#waitlist"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-accent/40 text-brand-accent text-sm font-medium hover:bg-brand-accent/5 transition-colors duration-150"
                          >
                            {isRtl ? 'سجّل اهتمامك' : 'Register Interest'}
                            <ArrowRight size={14} className={isRtl ? 'rotate-180' : ''} />
                          </a>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  )
}