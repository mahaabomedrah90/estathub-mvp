import React from 'react'

export default function TimelineEvent({
  icon: Icon,
  title,
  eventType,
  description,
  timestamp,
  relativeTime,
  regulatorMode,
  regulatorDetails
}) {
  const badges = regulatorDetails?.badges || []

  return (
    <div className="relative flex gap-3">
      {/* timeline line */}
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
        <div className="flex-1 w-px bg-gray-200 mt-1" />
      </div>

      <div className="flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-50 p-2 text-blue-700">
              {Icon && <Icon className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {eventType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-medium">
                    {eventType}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-600">{description}</p>
            </div>
          </div>
          <div className="text-xs text-right text-gray-500">
            <div>{timestamp}</div>
            {relativeTime && (
              <div className="text-[11px] text-gray-400">{relativeTime}</div>
            )}
          </div>
        </div>

        {regulatorMode && (
          <div className="mt-3 border-t border-dashed border-gray-200 pt-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-700">
              {regulatorDetails?.propertyName && (
                <span>
                  Property:{' '}
                  <span className="font-medium">
                    {regulatorDetails.propertyName}
                  </span>
                </span>
              )}
              {regulatorDetails?.ownerName && (
                <span>
                  Owner:{' '}
                  <span className="font-medium">
                    {regulatorDetails.ownerName}
                  </span>
                </span>
              )}
              {regulatorDetails?.location && (
                <span>
                  Location:{' '}
                  <span className="font-medium">
                    {regulatorDetails.location}
                  </span>
                </span>
              )}
              {regulatorDetails?.legalDeedNumber && (
                <span>
                  Legal Deed:{' '}
                  <span className="font-medium">
                    {regulatorDetails.legalDeedNumber}
                  </span>
                </span>
              )}
              {regulatorDetails?.userEmail && (
                <span>
                  User:{' '}
                  <span className="font-medium">
                    {regulatorDetails.userEmail}
                  </span>
                </span>
              )}
            </div>
            {badges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}