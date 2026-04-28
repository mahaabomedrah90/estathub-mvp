import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, Loader2, Edit2, Eye, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchJson } from '../../lib/api';

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
    <div className="min-h-screen bg-surface-base">
      <div className="bg-surface-muted py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold text-brand-primary">
              {userRole === 'owner'
                ? t('list.heroTitleOwner')
                : t('list.heroTitleInvestor')}
            </h1>

            <p className="mx-auto max-w-3xl text-xl text-gray-600">
              {userRole === 'owner'
                ? t('list.heroSubtitleOwner')
                : t('list.heroSubtitleInvestor')}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="space-y-3 text-center">
              <Loader2 className="mx-auto animate-spin text-brand-accent" size={40} />
              <div className="text-gray-600">{t('list.loading')}</div>
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
          <div className="rounded-lg bg-surface-muted py-12 text-center">
            <img
              src="/Full Logo 1.png"
              alt="الوسم"
              className="mx-auto mb-3 h-16 w-auto opacity-50"
            />
            <div className="text-gray-600">{t('list.empty')}</div>
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
                <div
                  key={p.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-surface-card transition-all duration-300 hover:shadow-lg"
                >
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <div className="absolute left-3 top-3 z-10">
                      <span className="inline-flex items-center rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm">
                        {getPropertyTypeLabel(p.propertyType)}
                      </span>
                    </div>

                    {userRole === 'owner' && (
                      <div className="absolute right-3 top-3 z-10">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                            status
                          )}`}
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
                          <Building2 className="text-gray-400" size={48} />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-muted to-surface-border">
                        <Building2 className="text-gray-400" size={48} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-6">
                    <div>
                      <h3 className="mb-2 text-xl font-semibold text-brand-primary">
                        {p.name ?? p.title}
                      </h3>

                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin size={14} />
                        <span>{p.city || t('list.locationFallback')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {t('list.card.startsFrom')}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {tokenPrice.toLocaleString()} SAR
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {t('list.card.annualYield')}
                        </span>
                        <span className="font-semibold text-brand-accent">
                          {annualYield}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {t('list.card.fundingProgress')}
                        </span>
                        <span className="font-medium text-gray-900">
                          {fundingProgress}%
                        </span>
                      </div>
                    </div>

                    <div>
  <div className="w-full h-2 rounded-full bg-surface-border overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: `${fundingProgress}%`,
        backgroundColor: '#48D1C5',
      }}
    />
  </div>
  <div className="text-xs text-gray-500 mt-1">
    {t('list.percentSold', { value: fundingProgress })}
  </div>
</div>

                    <div className="pt-2">
                      {userRole === 'owner' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/properties/${p.id}`)}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-medium text-white transition-colors hover:bg-brand-primary/90"
                          >
                            <Eye size={18} />
                            <span>{t('list.view')}</span>
                          </button>

                          {(status === 'PENDING' || status === 'REJECTED') && (
                            <button
                              onClick={() => navigate('/owner/properties')}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-accent px-4 py-2 font-medium text-white transition-colors hover:bg-brand-accent/90"
                            >
                              <Edit2 size={18} />
                              <span>{t('list.edit')}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={`/investor/properties/${p.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-primary/90 hover:scale-[1.02] hover:shadow-md"
                        >
                          <span>{t('list.viewDetails')}</span>
                          <ArrowRight
                            size={18}
                            className={isRtl ? 'rotate-180' : ''}
                          />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}