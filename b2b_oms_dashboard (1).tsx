import React, { useState, useEffect } from 'react';
import { 
  Database, FileCode2, Smartphone, Printer, ShieldCheck, 
  CheckCircle2, XCircle, AlertCircle, Camera, MapPin, 
  Search, Bell, User, LayoutDashboard, ShoppingCart, 
  Package, FileText, Settings, LogOut, ChevronRight,
  TrendingUp, Users, Box, CreditCard, X, Clock, ArrowRight,
  ChevronLeft, Activity, Filter, Download
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  // Add a subtle shadow to header on scroll
  useEffect(() => {
    const handleScroll = (e) => {
      setIsScrolled(e.target.scrollTop > 10);
    };
    const mainArea = document.getElementById('main-scroll-area');
    if (mainArea) mainArea.addEventListener('scroll', handleScroll);
    return () => mainArea && mainArea.removeEventListener('scroll', handleScroll);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboardView />;
      case 'schema': return <PrismaSchemaView />;
      case 'logic': return <BusinessLogicView />;
      case 'vendor': return <VendorMobilePortal />;
      case 'invoice': return <GSTInvoiceEngine />;
      default: return <AdminDashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">
      
      {/* Sidebar */}
      <aside className={`bg-white border-r border-slate-200/60 w-72 flex-shrink-0 flex flex-col transition-transform duration-300 z-30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full absolute h-full shadow-2xl'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100/80 bg-gradient-to-r from-white to-slate-50/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3.5 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="text-white" size={20} strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">ChainSync</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-8">
          <nav className="space-y-1.5 px-4">
            <NavItem icon={<LayoutDashboard size={18} />} label="Overview" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            
            <div className="pt-8 pb-3">
              <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-px bg-slate-200"></span> Architecture
              </p>
            </div>
            <NavItem icon={<Database size={18} />} label="Data Schema" isActive={activeTab === 'schema'} onClick={() => setActiveTab('schema')} />
            <NavItem icon={<FileCode2 size={18} />} label="Business Logic" isActive={activeTab === 'logic'} onClick={() => setActiveTab('logic')} />
            
            <div className="pt-8 pb-3">
              <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-4 h-px bg-slate-200"></span> Interfaces
              </p>
            </div>
            <NavItem icon={<Smartphone size={18} />} label="Vendor Portal" isActive={activeTab === 'vendor'} onClick={() => setActiveTab('vendor')} />
            <NavItem icon={<Printer size={18} />} label="Print Engine" isActive={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')} />
          </nav>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2.5 hover:bg-white hover:shadow-sm rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200/60 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-105 transition-transform">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">Admin Ops</p>
              <p className="text-xs text-slate-500 truncate font-medium">admin@chainsync.co.in</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className={`h-20 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-10 z-20 print:hidden transition-all duration-300 ${isScrolled ? 'border-b border-slate-200/80 shadow-sm shadow-slate-200/20 bg-white/90' : ''}`}>
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-400 hover:text-indigo-600 focus:outline-none p-2 mr-4 -ml-2 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div className="relative hidden md:block group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search POs, Invoices, SKUs..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-80 transition-all font-medium text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all bg-slate-100/50">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-white"></span>
            </button>
          </div>
        </header>

        <main id="main-scroll-area" className="flex-1 overflow-auto bg-slate-50 print:bg-white print:overflow-visible">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
        isActive 
          ? 'text-indigo-700 shadow-sm border border-indigo-100/50 bg-white' 
          : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm border border-transparent'
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/80 to-purple-50/30 -z-10"></div>
      )}
      <span className={`transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
        {icon}
      </span>
      {label}
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-md"></div>}
    </button>
  );
}

function AdminDashboardView() {
  const [selectedPO, setSelectedPO] = useState(null);

  // Mock Data for interactions
  const recentOrders = [
    { id: "PO-2026-089", vendor: "TechCorp India", status: "PENDING_APPROVAL", amount: "₹ 1,24,500", date: "2 mins ago", items: 2, moqAlert: true, score: 98, type: 'DROP_SHIP' },
    { id: "PO-2026-088", vendor: "Global Supply Ltd.", status: "DISPATCHED", amount: "₹ 45,000", date: "1 hr ago", items: 5, moqAlert: false, score: 100, type: 'HYBRID' },
    { id: "PO-2026-087", vendor: "Acme Electronics", status: "DELIVERED", amount: "₹ 89,990", date: "3 hrs ago", items: 1, moqAlert: false, score: 92, type: 'DROP_SHIP' },
    { id: "PO-2026-086", vendor: "Mega Distributors", status: "DISPUTED", amount: "₹ 12,500", date: "5 hrs ago", items: 10, moqAlert: false, score: 74, type: 'WAREHOUSE' },
    { id: "PO-2026-085", vendor: "TechCorp India", status: "CLEARED", amount: "₹ 3,40,000", date: "Yesterday", items: 12, moqAlert: false, score: 98, type: 'HYBRID' },
  ];

  return (
    <div className="relative min-h-full">
      <div className={`p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 transition-all ${selectedPO ? 'lg:pr-[450px]' : ''}`}>
        
        {/* Page Header with Gradients */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-indigo-50/80 via-purple-50/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
          
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Command Center</h1>
            <p className="text-slate-500 text-sm font-medium">Real-time dropshipping routing & vendor performance.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
              <Download size={16} /> Export
            </button>
            <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 border border-indigo-500/50">
              <Package size={16} /> New Order
            </button>
          </div>
        </div>

        {/* Gradient KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard title="Total Volume" value="₹ 45.2M" trend="+20.1%" type="primary" icon={<TrendingUp size={20} />} />
          <KpiCard title="Active POs" value="2,350" trend="+12.5%" type="success" icon={<ShoppingCart size={20} />} />
          <KpiCard title="Pending Review" value="12" trend="Action Needed" type="warning" icon={<AlertCircle size={20} />} />
          <KpiCard title="Vendor Disputes" value="3" trend="-2.1%" type="danger" icon={<XCircle size={20} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Interactive Orders Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col relative z-10">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Box size={18} className="text-indigo-500" /> Recent Purchase Orders
              </h3>
              <button className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg">
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto flex-1 p-3">
              <table className="w-full text-sm text-left border-separate border-spacing-y-1.5">
                <thead className="text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Order ID</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Amount</th>
                  </tr>
                </thead>
                <tbody className="mt-2">
                  {recentOrders.map((po) => (
                    <TableRow 
                      key={po.id} 
                      data={po} 
                      isSelected={selectedPO?.id === po.id}
                      onClick={() => setSelectedPO(po)} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity size={18} className="text-rose-500" /> System Alerts
              </h3>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">4 New</span>
            </div>
            <div className="p-5 space-y-2 flex-1 overflow-y-auto">
              <AlertItem type="error" title="MOQ Conflict Halted Order" time="10m ago" />
              <AlertItem type="warning" title="Dispute Window Expiring" time="1h ago" />
              <AlertItem type="info" title="SmartTech Ltd onboarded" time="3h ago" />
              <AlertItem type="success" title="3-Way Match Successful" time="5h ago" />
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel for PO Details - Slide in from right */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] border-l border-slate-200 transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-40 ${selectedPO ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedPO && (
          <div className="h-full flex flex-col relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-b from-indigo-50 to-white rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                  <X size={18} />
                </button>
                <span className="font-mono text-base font-bold text-slate-800">{selectedPO.id}</span>
              </div>
              <StatusBadge status={selectedPO.status} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24 custom-scrollbar">
              
              {/* Routing Type Tag */}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 w-max px-3 py-1.5 rounded-lg border border-indigo-100">
                <Filter size={14} /> {selectedPO.type.replace('_', ' ')} ROUTE
              </div>

              {/* Vendor Info */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Users size={14} /> Assigned Vendor
                </h4>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg shadow-inner group-hover:scale-105 transition-transform">
                      {selectedPO.vendor.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm mb-0.5">{selectedPO.vendor}</p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        Performance: <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">{selectedPO.score}/100</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>

              {/* Order Details & Warnings */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <FileText size={14} /> Order Context
                </h4>
                <div className="space-y-3 bg-slate-50 rounded-2xl p-2 border border-slate-100">
                  <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <span className="text-slate-500 font-medium">Items Count</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">{selectedPO.items} SKUs</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                    <span className="text-slate-500 font-medium">Total Value</span>
                    <span className="font-extrabold text-slate-800 text-lg">{selectedPO.amount}</span>
                  </div>
                  
                  {selectedPO.moqAlert && (
                    <div className="mt-2 p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                      <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-bold text-amber-900">MOQ Override Requested</h5>
                        <p className="text-xs text-amber-700/90 mt-1.5 leading-relaxed font-medium">
                          Customer requested qty below vendor minimum. Manual approval required before sending draft.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Routing Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <Clock size={14} /> Routing Activity
                </h4>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent">
                  <TimelineItem title="Order Received" time="10:00 AM" done />
                  <TimelineItem title="Dropship Route Selected" time="10:02 AM" desc={`Selected ${selectedPO.vendor} (Lowest bid)`} done />
                  <TimelineItem title="Maker-Checker Review" time="Pending" active={selectedPO.status === 'PENDING_APPROVAL'} />
                </div>
              </div>

            </div>

            {/* Action Footer fixed at bottom */}
            {selectedPO.status === 'PENDING_APPROVAL' && (
              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200 bg-white/90 backdrop-blur-md grid grid-cols-2 gap-4">
                <button className="py-3 px-4 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all active:scale-95">
                  Reject Route
                </button>
                <button className="py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-95 border border-indigo-500/50">
                  Approve & Send
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

function KpiCard({ title, value, trend, type, icon }) {
  const styles = {
    primary: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100', icon: 'text-blue-600 bg-white shadow-sm border-blue-50', text: 'text-blue-700 bg-blue-100/50' },
    success: { bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-100', icon: 'text-emerald-600 bg-white shadow-sm border-emerald-50', text: 'text-emerald-700 bg-emerald-100/50' },
    warning: { bg: 'from-amber-50 to-orange-50', border: 'border-amber-100', icon: 'text-amber-600 bg-white shadow-sm border-amber-50', text: 'text-amber-700 bg-amber-100/50' },
    danger: { bg: 'from-rose-50 to-red-50', border: 'border-rose-100', icon: 'text-rose-600 bg-white shadow-sm border-rose-50', text: 'text-rose-700 bg-rose-100/50' }
  };
  const style = styles[type] || styles.primary;

  return (
    <div className={`p-6 rounded-3xl border ${style.border} bg-gradient-to-br ${style.bg} flex flex-col justify-between group hover:shadow-md transition-all relative overflow-hidden`}>
      <div className="absolute right-0 top-0 w-24 h-24 bg-white/40 rounded-bl-full -mr-4 -mt-4 z-0"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-2.5 rounded-xl border ${style.icon}`}>
          {icon}
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-lg border border-transparent ${style.text}`}>
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <h4 className="text-sm font-semibold text-slate-500 mb-1">{title}</h4>
        <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function TableRow({ data, isSelected, onClick }) {
  return (
    <tr 
      onClick={onClick}
      className={`group cursor-pointer transition-all ${
        isSelected ? 'bg-indigo-50/50 shadow-sm' : 'hover:bg-slate-50'
      }`}
    >
      <td className={`px-4 py-4 font-mono text-sm rounded-l-xl border-y border-l ${isSelected ? 'border-indigo-100 text-indigo-700 font-bold' : 'border-transparent text-slate-600 group-hover:text-slate-900 font-medium'}`}>
        {data.id}
      </td>
      <td className={`px-4 py-4 text-sm font-medium border-y ${isSelected ? 'border-indigo-100 text-slate-800' : 'border-transparent text-slate-600 group-hover:text-slate-900'} transition-colors`}>
        {data.vendor}
      </td>
      <td className={`px-4 py-4 border-y ${isSelected ? 'border-indigo-100' : 'border-transparent'}`}>
        <StatusBadge status={data.status} />
      </td>
      <td className={`px-4 py-4 text-right font-bold text-sm border-y border-r rounded-r-xl ${isSelected ? 'border-indigo-100 text-slate-900' : 'border-transparent text-slate-700'}`}>
        {data.amount}
      </td>
    </tr>
  );
}

function StatusBadge({ status }) {
  const configs = {
    PENDING_APPROVAL: { color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200/60', label: 'Review Required', dot: 'bg-amber-500' },
    DISPATCHED: { color: 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200/60', label: 'Dispatched', dot: 'bg-blue-500' },
    DELIVERED: { color: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200/60', label: 'Delivered', dot: 'bg-emerald-500' },
    DISPUTED: { color: 'bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border-rose-200/60', label: 'Disputed', dot: 'bg-rose-500' },
    CLEARED: { color: 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-slate-200/60', label: 'Cleared', dot: 'bg-slate-500' }
  };
  const conf = configs[status] || configs.CLEARED;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border ${conf.color} shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} animate-pulse`}></span>
      {conf.label}
    </span>
  );
}

function AlertItem({ type, title, time }) {
  const bgs = {
    error: 'bg-gradient-to-br from-rose-100 to-red-50 text-rose-600 border-rose-100',
    warning: 'bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600 border-amber-100',
    info: 'bg-gradient-to-br from-blue-100 to-indigo-50 text-blue-600 border-blue-100',
    success: 'bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-600 border-emerald-100'
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group border border-transparent hover:border-slate-100">
      <div className={`p-2.5 rounded-xl border ${bgs[type]} shadow-sm group-hover:scale-110 transition-transform`}>
        <Activity size={16} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{title}</h4>
      </div>
      <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">{time}</span>
    </div>
  );
}

function TimelineItem({ title, time, desc, done, active }) {
  return (
    <div className="relative flex items-start gap-5 group">
      <div className={`absolute left-0 mt-1 w-3.5 h-3.5 rounded-full border-[3px] shadow-sm ${
        done ? 'bg-indigo-600 border-indigo-200' : 
        active ? 'bg-white border-blue-500 ring-4 ring-blue-50 animate-pulse' : 
        'bg-slate-100 border-slate-300'
      } z-10`}></div>
      <div className="pl-8 pb-3">
        <div className="flex items-center gap-3">
          <h5 className={`text-sm font-bold ${active ? 'text-indigo-600' : 'text-slate-800'}`}>{title}</h5>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold">{time}</span>
        </div>
        {desc && <p className="text-xs text-slate-500 font-medium mt-1.5 bg-white p-2 rounded-lg border border-slate-100 shadow-sm inline-block">{desc}</p>}
      </div>
    </div>
  );
}

function CodeBlock({ code, language = 'typescript' }) {
  return (
    <div className="bg-[#0f172a] rounded-3xl overflow-hidden shadow-xl shadow-slate-900/10 my-8 border border-slate-800">
      <div className="flex items-center px-5 py-3 bg-[#1e293b] border-b border-slate-800 text-slate-300 text-xs font-mono justify-between font-semibold tracking-wider">
        <span className="flex items-center gap-2">
          <FileCode2 size={16} className="text-indigo-400" />
          {language}
        </span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>
      </div>
      <div className="p-6 overflow-x-auto text-[13px] font-mono text-slate-300 leading-relaxed custom-code-scrollbar">
        <pre><code dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }}></code></pre>
      </div>
      <style>{`
        .custom-code-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-code-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-code-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .keyword { color: #c678dd; } .type { color: #e5c07b; } .string { color: #98c379; } .comment { color: #5c6370; font-style: italic; } .func { color: #61afef; }
      `}</style>
    </div>
  );
}

// Simple regex highlighter for visual flair
function highlightSyntax(code) {
  return code
    .replace(/\/\/.*/g, '<span class="comment">$&</span>')
    .replace(/(const|let|var|function|async|await|return|if|throw|new|for|of|enum|model|generator|datasource)/g, '<span class="keyword">$1</span>')
    .replace(/(String|Float|Int|Boolean|DateTime|Product|Order|VendorCatalog|PurchaseOrder)/g, '<span class="type">$1</span>')
    .replace(/(['"`].*?['"`])/g, '<span class="string">$1</span>')
    .replace(/(\w+)(?=\()/g, '<span class="func">$1</span>');
}

function PrismaSchemaView() {
  const schemaCode = `// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum FulfillmentType { WAREHOUSE_ONLY, DROP_SHIP_ONLY, HYBRID }
enum OrderStatus { DRAFT, PAYMENT_PENDING, PROCESSING, SHIPPED, DELIVERED, DISPUTED, COMPLETED }

model Product {
  id                 String          @id @default(uuid())
  sku                String          @unique
  name               String
  fulfillmentType    FulfillmentType @default(WAREHOUSE_ONLY)
  gstRate            Float           
  minCustomerMoq     Int             @default(1)
  warehouseStock     Int             @default(0)
  vendorCatalogs     VendorCatalog[]
}

model VendorCatalog {
  id           String   @id @default(uuid())
  vendorId     String
  productId    String
  price        Float
  vendorMoq    Int      @default(1)
  stock        Int      @default(0)
  @@unique([vendorId, productId])
}

model PurchaseOrder {
  id                String   @id @default(uuid())
  status            String   // PENDING_APPROVAL, DISPATCHED...
  totalAmount       Float
  requiresApproval  Boolean  @default(false)
  isApproved        Boolean  @default(false)
  shipments         Shipment[]
}

model Shipment {
  id                  String         @id @default(uuid())
  trackingLink        String?        
  dispatchType        String         // 3PL, VENDOR_VEHICLE
  status              String         
  disputeWindowEndsAt DateTime?      // 24hr TTL after delivery
}`;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <Database className="text-indigo-600" /> Database Architecture
        </h2>
        <p className="text-slate-500 font-medium text-sm mt-3 max-w-2xl leading-relaxed">
          Production Prisma schema enforcing B2B relationships. Features include 24-hour dispute windows via <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-bold">disputeWindowEndsAt</code> and multi-vendor mapping.
        </p>
      </div>
      <CodeBlock code={schemaCode} language="prisma" />
    </div>
  );
}

function BusinessLogicView() {
  const logicCode = `export async function routeOrderFulfillment(orderId: string) {
  const order = await prisma.order.findUnique({ include: { items: { include: { product: true } } } });
  
  for (const item of order.items) {
    const { product, quantity } = item;

    // 1. Guardrail: Customer MOQ Check
    if (quantity < product.minCustomerMoq) throw new Error(\`MOQ not met\`);

    // 2. Dropship Routing: Find Cheapest Vendor meeting MOQ
    const vendors = await prisma.vendorCatalog.findMany({
      where: { productId: product.id, vendorMoq: { lte: quantity }, stock: { gte: quantity } },
      orderBy: { price: 'asc' } // Cheapest First
    });

    const selectedVendor = vendors[0];

    // 3. Maker-Checker Threshold Check
    const poTotal = selectedVendor.price * quantity;
    const requiresApproval = poTotal > process.env.PO_AUTO_APPROVE_THRESHOLD;

    await prisma.purchaseOrder.create({
      data: {
        vendorId: selectedVendor.vendorId,
        totalAmount: poTotal,
        requiresApproval,
        status: requiresApproval ? 'PENDING_APPROVAL' : 'SENT',
      }
    });
  }
}`;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 p-8 bg-white rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-purple-50 via-indigo-50/50 to-transparent rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <FileCode2 className="text-purple-600" /> Routing Engine
        </h2>
        <p className="text-slate-500 font-medium text-sm mt-3 max-w-2xl leading-relaxed">
          Server Actions handling multi-vendor bidding, auto-selection, and Maker-Checker protocols.
        </p>
      </div>
      <CodeBlock code={logicCode} language="typescript" />
    </div>
  );
}

function VendorMobilePortal() {
  const [poStatus, setPoStatus] = useState('PENDING'); 
  const [dispatchType, setDispatchType] = useState('PORTER');

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-12 flex flex-col lg:flex-row gap-12 lg:gap-20 items-center lg:items-start animate-in fade-in duration-700">
      <div className="flex-1 space-y-8 lg:sticky lg:top-10 text-center lg:text-left">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Vendor Mobile Portal</h2>
          <p className="text-slate-500 font-medium text-base leading-relaxed max-w-md mx-auto lg:mx-0">
            Vendors receive a passwordless magic link opening this view. Designed for zero-friction on mobile devices with large touch targets.
          </p>
        </div>
        
        <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-lg shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-gradient-to-tl from-indigo-50 to-transparent rounded-tl-full -z-10"></div>
          <h3 className="font-bold text-slate-900 flex items-center justify-center lg:justify-start gap-2 mb-6 text-sm uppercase tracking-widest">
            <Smartphone size={16} className="text-indigo-500" /> Workflow Highlights
          </h3>
          <ul className="space-y-6 text-sm text-slate-600 font-medium">
            <li className="flex items-start justify-center lg:justify-start gap-4 group">
              <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:shadow-md transition-all"><User size={18}/></div>
              <span className="mt-1.5 text-left"><strong>Passwordless Access:</strong> Click link, immediate entry.</span>
            </li>
            <li className="flex items-start justify-center lg:justify-start gap-4 group">
              <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:shadow-md transition-all"><CheckCircle2 size={18}/></div>
              <span className="mt-1.5 text-left"><strong>1-Click Action:</strong> Accept or Propose New Price.</span>
            </li>
            <li className="flex items-start justify-center lg:justify-start gap-4 group">
              <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white group-hover:shadow-md transition-all"><MapPin size={18}/></div>
              <span className="mt-1.5 text-left"><strong>Live Tracking:</strong> Porter / WhatsApp integration.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* iOS Style Mobile Mockup */}
      <div className="w-[375px] h-[812px] bg-slate-900 rounded-[3.5rem] p-3 shadow-2xl relative flex-shrink-0 border-[6px] border-slate-800 hidden sm:block mx-auto lg:mx-0">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-4 inset-x-0 h-7 bg-slate-900 rounded-full w-32 mx-auto z-20 flex items-center justify-between px-3">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-green-900/50"></div>
        </div>
        
        <div className="bg-slate-50 h-full w-full rounded-[2.8rem] overflow-hidden flex flex-col relative font-sans">
          
          {/* Mobile Header */}
          <div className="bg-white pt-14 pb-5 px-6 shadow-sm sticky top-0 z-10 flex justify-between items-end border-b border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">New Order Request</p>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">PO-2026-089</h2>
            </div>
            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              poStatus === 'PENDING' ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200' : 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border border-emerald-200'
            }`}>
              {poStatus}
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1 pb-10 custom-scrollbar">
            
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
              <div className="flex justify-between items-end border-b border-slate-100 pb-4 mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expected By</span>
                <span className="text-sm font-bold text-slate-800">Tomorrow, 10 AM</span>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <div className="flex gap-3 items-start">
                    <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">2x</span>
                    <span className="text-slate-700 font-bold leading-snug pt-0.5">Cisco Catalyst 9200L</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex gap-3 items-start">
                    <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md text-xs border border-indigo-100">5x</span>
                    <span className="text-slate-700 font-bold leading-snug pt-0.5">CAT6a Ethernet Roll</span>
                  </div>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-100 flex justify-between items-end bg-slate-50/50 -mx-6 -mb-6 px-6 pb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Value</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight">₹ 1,24,500</span>
              </div>
            </div>

            {poStatus === 'PENDING' && (
              <div className="space-y-4 mt-8 animate-in slide-in-from-bottom-2">
                <button 
                  onClick={() => setPoStatus('ACCEPTED')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] flex justify-center items-center gap-2 border border-indigo-500/50"
                >
                  <CheckCircle2 size={20} /> Accept Order
                </button>
                <button 
                  className="w-full bg-white border-2 border-slate-200 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Propose New Price
                </button>
              </div>
            )}

            {poStatus === 'ACCEPTED' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 mt-2">
                <h3 className="font-bold text-slate-800 text-sm mb-3 ml-2 flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" /> Dispatch Method
                </h3>
                
                <div className="bg-slate-200/70 rounded-2xl p-1.5 flex mb-6 shadow-inner">
                  <button onClick={() => setDispatchType('PORTER')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${dispatchType === 'PORTER' ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
                    3PL / Porter
                  </button>
                  <button onClick={() => setDispatchType('VENDOR')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${dispatchType === 'VENDOR' ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>
                    Own Vehicle
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">
                      Tracking Link
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <button className="w-full border-2 border-dashed border-slate-300 rounded-3xl py-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300 transition-colors group">
                    <Camera size={28} className="mb-3 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs font-bold">Upload E-Way Bill</span>
                  </button>

                  <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-sm mt-6">
                    Confirm Dispatch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GSTInvoiceEngine() {
  const [printMode, setPrintMode] = useState('A4'); 

  const invoice = {
    invoiceNo: "INV-26-0902",
    date: "25-Aug-2026",
    customer: { name: "Acme Corp Ltd.", address: "1st Block, Koramangala, Bengaluru", gstin: "29AABCU9603R1ZX" },
    items: [
      { desc: "Cisco Catalyst 9200L", hsn: "8517", qty: 2, rate: 55000, tax: 18 },
      { desc: "Server Rack 42U", hsn: "8473", qty: 1, rate: 12000, tax: 18 }
    ],
    totals: { base: 122000, cgst: 10980, sgst: 10980, grandTotal: 143960 }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 relative min-h-[800px] animate-in fade-in duration-500">
      
      <div className="print:hidden mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-bl from-teal-50 via-emerald-50/50 to-transparent rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <Printer className="text-emerald-600" /> Print Engine
            </h2>
            <p className="text-slate-500 font-medium text-sm mt-2">Native CSS @media print generation.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 shadow-inner">
              {['A4', 'A5', 'THERMAL'].map(mode => (
                <button 
                  key={mode} onClick={() => setPrintMode(mode)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${printMode === mode ? 'bg-white shadow-sm text-indigo-700 border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all text-sm active:scale-95"
            >
              <Printer size={16} /> Print Document
            </button>
          </div>
        </div>
      </div>

      {/* Global Print Styles embedded for demo purposes */}
      <style>{`
        @media print {
          @page { size: ${printMode === 'A4' ? 'A4 portrait' : printMode === 'A5' ? 'A5 landscape' : '80mm auto'}; margin: ${printMode === 'THERMAL' ? '0mm' : '10mm'}; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          aside, header { display: none !important; }
          #main-scroll-area { overflow: visible !important; }
        }
      `}</style>

      {/* Print Document Container */}
      <div className={`
        bg-white mx-auto shadow-xl print:shadow-none border border-slate-200 print:border-none transition-all duration-500 origin-top
        ${printMode === 'A4' ? 'max-w-4xl min-h-[900px] p-12 rounded-2xl print:rounded-none' : ''}
        ${printMode === 'A5' ? 'max-w-3xl min-h-[500px] p-10 rounded-2xl print:rounded-none' : ''}
        ${printMode === 'THERMAL' ? 'max-w-[300px] font-mono p-6 text-xs rounded-none border-x-0' : ''}
      `}>
        
        {printMode === 'THERMAL' && (
          <div className="text-black leading-tight">
            <div className="text-center mb-4">
              <h1 className="font-extrabold text-xl border-b-2 border-black border-dashed pb-2 mb-2">CHAINSYNC</h1>
              <p>GSTIN: 29XXXXXXXXXXXXX</p>
              <p className="mt-2 text-left font-bold">Inv: {invoice.invoiceNo}</p>
              <p className="text-left">Date: {invoice.date}</p>
            </div>
            <div className="border-t-2 border-dashed border-black py-2 mb-2">
              <p className="font-bold uppercase">Bill To:</p>
              <p>{invoice.customer.name}</p>
            </div>
            <table className="w-full text-left mb-4">
              <thead><tr className="border-b-2 border-black"><th className="pb-1 uppercase">Item</th><th className="text-right uppercase">Amt</th></tr></thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i}><td className="py-1">{item.desc.substring(0, 12)}.. x{item.qty}</td><td className="text-right">{(item.rate*item.qty/1000).toFixed(1)}k</td></tr>
                ))}
              </tbody>
            </table>
            <div className="border-t-2 border-black pt-2 font-bold flex justify-between text-sm">
              <p>TOTAL:</p><p>₹{invoice.totals.grandTotal}</p>
            </div>
            <p className="text-center mt-6 text-[10px]">Thank you for your business.</p>
          </div>
        )}

        {(printMode === 'A4' || printMode === 'A5') && (
          <div className="text-black font-sans">
            <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-8">
              <div>
                <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center font-bold text-xl rounded-lg mb-4">CS</div>
                <h1 className="text-3xl font-extrabold tracking-tight">CHAINSYNC LTD.</h1>
                <p className="text-sm mt-1 text-slate-600 font-medium">GSTIN: 29XYZB2B9999Z</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-extrabold uppercase tracking-widest text-slate-300">
                  {printMode === 'A4' ? 'Tax Invoice' : 'Packing Slip'}
                </h2>
                <p className="font-mono mt-2 text-xl font-bold text-slate-800">#{invoice.invoiceNo}</p>
                <p className="text-slate-500 font-medium mt-1">Date: {invoice.date}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 mb-10">
              <div className="p-5 border-2 border-slate-100 rounded-xl bg-slate-50/50">
                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-3">Billed To</h3>
                <p className="font-extrabold text-lg text-slate-900">{invoice.customer.name}</p>
                <p className="text-sm mt-1 text-slate-600 font-medium">{invoice.customer.address}</p>
                <p className="text-sm font-bold mt-3 text-slate-800 bg-white inline-block px-2 py-1 rounded border border-slate-200">GSTIN: {invoice.customer.gstin}</p>
              </div>
            </div>

            <table className="w-full text-sm text-left mb-10 border-collapse">
              <thead className="border-b-2 border-slate-900 bg-slate-50">
                <tr>
                  <th className="py-4 px-3 font-bold text-slate-800 uppercase tracking-wider text-xs rounded-tl-lg">Description</th>
                  <th className="py-4 px-3 font-bold text-slate-800 uppercase tracking-wider text-xs">HSN</th>
                  <th className="py-4 px-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right">Qty</th>
                  {printMode === 'A4' && <th className="py-4 px-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right">Rate</th>}
                  {printMode === 'A4' && <th className="py-4 px-3 font-bold text-slate-800 uppercase tracking-wider text-xs text-right rounded-tr-lg">Amount</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-5 px-3 font-semibold text-slate-900">{item.desc}</td>
                    <td className="py-5 px-3 font-mono text-slate-500">{item.hsn}</td>
                    <td className="py-5 px-3 text-right font-bold text-slate-900">{item.qty}</td>
                    {printMode === 'A4' && <td className="py-5 px-3 text-right font-medium text-slate-600">₹ {item.rate.toLocaleString('en-IN')}</td>}
                    {printMode === 'A4' && <td className="py-5 px-3 text-right font-bold text-slate-900">₹ {(item.qty * item.rate).toLocaleString('en-IN')}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {printMode === 'A4' && (
              <div className="flex justify-end">
                <div className="w-[350px] bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm">
                    <span className="font-medium text-slate-600">Taxable Amount</span><span className="font-bold text-slate-900">₹ {invoice.totals.base.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 text-sm">
                    <span className="font-medium text-slate-600">CGST + SGST (18%)</span><span className="font-bold text-slate-900">₹ {(invoice.totals.cgst + invoice.totals.sgst).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-4 pb-2 items-center mt-2">
                    <span className="text-lg font-extrabold text-slate-900 uppercase">Total</span>
                    <span className="text-2xl font-extrabold text-indigo-700">₹ {invoice.totals.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}