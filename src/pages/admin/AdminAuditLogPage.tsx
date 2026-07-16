import { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { getRecentUsage, type AuditLogItem } from '../../services/adminAuditLogService';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getRecentUsage(50);
      setLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (action: string = '') => {
    const lower = action?.toLowerCase() || '';
    if (lower.includes('ban') || lower.includes('delete') || lower.includes('error') || lower.includes('fail')) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-red-900/30 text-red-400 uppercase">Warning</span>;
    }
    if (lower.includes('feature') || lower.includes('info') || lower.includes('update')) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-purple-900/30 text-purple-400 uppercase">Info</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-cyan-900/30 text-cyan-400 uppercase">Success</span>;
  };

  const getLocalDate = (dateString: string) => {
    if (!dateString) return new Date();
    // Ensure the date is parsed as UTC by appending 'Z' if missing
    const utcDateStr = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    return new Date(utcDateStr);
  };

  return (
    <AdminLayout activePage="audit-log">
      <div className="space-y-8 text-white">
        {/* Header & Export */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold" style={{ color: '#00bcd4', fontFamily: "'Outfit', sans-serif" }}>Audit Log</h2>
            <p className="text-gray-400 mt-1">System-wide activity and moderation history.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-cyan-900/20">
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export Logs</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Date Range</label>
            <div className="relative">
              <select className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none">
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Custom Range</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Admin User</label>
            <div className="relative">
              <select className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none">
                <option>All Users</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">expand_more</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Action Type</label>
            <div className="relative">
              <select className="w-full bg-[#0e0e0e] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none">
                <option>All Actions</option>
                <option>Approve Message</option>
                <option>Reject Message</option>
                <option>Ban User</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">expand_more</span>
            </div>
          </div>
          <div className="flex items-end">
            <button className="w-full py-2.5 border border-gray-600 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Activity Log Table */}
        <div className="rounded-xl overflow-hidden shadow-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="px-5 py-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">Timestamp</th>
                  <th className="px-5 py-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">User</th>
                  <th className="px-5 py-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">Action</th>
                  <th className="px-5 py-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">Details</th>
                  <th className="px-5 py-4 text-xs text-gray-400 uppercase tracking-wider font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">Loading audit logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">No activity logs found.</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-sm">
                            {getLocalDate(log.createdAt || (log as any).CreatedAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5">
                            {getLocalDate(log.createdAt || (log as any).CreatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {(log.user || (log as any).User)?.avatarUrl || (log.user || (log as any).User)?.AvatarUrl ? (
                            <img src={(log.user || (log as any).User)?.avatarUrl || (log.user || (log as any).User)?.AvatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-700 object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-800 flex items-center justify-center text-xs font-bold text-cyan-200">
                              {((log.user || (log as any).User)?.firstName || (log.user || (log as any).User)?.FirstName)?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">
                              {(log.user || (log as any).User)?.firstName || (log.user || (log as any).User)?.FirstName} {(log.user || (log as any).User)?.lastName || (log.user || (log as any).User)?.LastName}
                            </span>
                            {((log.user || (log as any).User)?.role || (log.user || (log as any).User)?.Role) && (
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{(log.user || (log as any).User)?.role || (log.user || (log as any).User)?.Role}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-sm">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          <span>{log.action || (log as any).Action}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div 
                          className="text-sm text-gray-300 max-w-xs truncate cursor-pointer hover:text-cyan-400 transition-colors underline decoration-dashed underline-offset-4" 
                          title="Click to view full details"
                          onClick={() => setSelectedDetail((log.metadata || (log as any).Metadata) || ((log.entityType || (log as any).EntityType) ? `${log.entityType || (log as any).EntityType} - ${log.entityId || (log as any).EntityId}` : 'N/A'))}
                        >
                          {(log.metadata || (log as any).Metadata) || ((log.entityType || (log as any).EntityType) ? `${log.entityType || (log as any).EntityType} - ${log.entityId || (log as any).EntityId}` : 'N/A')}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(log.action || (log as any).Action)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Footer */}
          <div className="px-5 py-4 flex items-center justify-between border-t border-white/10 bg-white/5">
            <p className="text-sm text-gray-400">Showing {logs.length} entries</p>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-white/10 text-gray-400 disabled:opacity-30" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-7 h-7 rounded bg-cyan-600 text-white font-bold text-xs flex items-center justify-center">1</button>
              <button className="w-7 h-7 rounded hover:bg-white/10 text-white text-xs flex items-center justify-center transition-colors">2</button>
              <span className="px-2 text-gray-400 text-xs">...</span>
              <button className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
          onClick={() => setSelectedDetail(null)}
        >
          <div 
            className="bg-[#0e0e0e] border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl shadow-cyan-900/20" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-cyan-400 font-outfit">Action Details</h3>
                <button 
                  onClick={() => setSelectedDetail(null)} 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <pre className="text-xs text-green-400 bg-black/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono border border-gray-800">
               {selectedDetail}
            </pre>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
