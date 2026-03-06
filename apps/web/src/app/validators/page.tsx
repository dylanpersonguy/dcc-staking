// =============================================================================
// Validators Page
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { ValidatorState } from '@dcc-staking/sdk';
import { getReader } from '@/lib/protocol';
import { formatDcc, formatBps, shortenAddress } from '@/lib/format';

export default function ValidatorsPage() {
  const [validators, setValidators] = useState<ValidatorState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const reader = getReader();
        const vs = await reader.getAllValidators();
        setValidators(vs);
      } catch (err) {
        console.error('Failed to load validators:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Validators</h1>

      {loading ? (
        <div className="glass-card animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      ) : validators.length === 0 ? (
        <div className="glass-card">
          <p className="text-gray-400">No validators registered</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/5">
                <th className="pb-3">Address</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Weight</th>
                <th className="pb-3">Leased DCC</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {validators.map((v) => (
                <tr key={v.address} className="border-b border-white/5 last:border-0">
                  <td className="py-3 font-mono text-sm">{shortenAddress(v.address, 8)}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                        v.enabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {v.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3">{formatBps(v.weightBps)}</td>
                  <td className="py-3">{formatDcc(v.leasedDcc, 2)} DCC</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
