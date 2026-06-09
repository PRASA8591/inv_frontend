import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { printService } from '../utils/printService';
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  Filter, 
  DollarSign, 
  Package,
  Layers,
  ShieldCheck,
  Activity,
  RefreshCw,
  Download,
  AlertCircle,
  Users,
  Clock,
  Tag,
  Briefcase,
  FileText,
  TrendingDown,
  ArrowRight,
  ClipboardList,
  AlertTriangle,
  Lock,
  UserCheck,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  ChevronRight,
  PlusCircle,
  Printer
} from 'lucide-react';
import { 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const Reports = () => {
  const toast = useToast();
  const { user } = useAuth();
  const { formatCurrency, settings } = useSettings();

  // Active Report Tab: 'sales' | 'stock' | 'invoices' | 'shifts' | 'price' | 'adjustments' | 'direct'
  const [activeTab, setActiveTab] = useState('sales');

  // Unified Data State with safe fallbacks
  const [sales, setSales] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [shiftsList, setShiftsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Authorization / Error states
  const [adminClearanceError, setAdminClearanceError] = useState(false);

  // Filter States
  const [dateRange, setDateRange] = useState('30days'); // 'today' | '7days' | '30days' | 'lifetime' | 'custom'
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  
  // Search and Specific filters
  const [salesSearch, setSalesSearch] = useState('');
  const [salesPaymentMethod, setSalesPaymentMethod] = useState('all');
  
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockLevelFilter, setStockLevelFilter] = useState('all'); // 'all' | 'low' | 'out' | 'healthy'
  
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');

  const [shiftsSearch, setShiftsSearch] = useState('');
  const [priceSearch, setPriceSearch] = useState('');
  const [adjustmentsSearch, setAdjustmentsSearch] = useState('');
  const [adjustmentActionFilter, setAdjustmentActionFilter] = useState('all');
  const [directSearch, setDirectSearch] = useState('');

  const token = sessionStorage.getItem('token');
  const config = { headers: { Authorization: `Bearer ${token}` } };

  // Ensure arrays are processed safely
  const salesArray = Array.isArray(sales) ? sales : [];
  const itemsArray = Array.isArray(items) ? items : [];
  const invoicesArray = Array.isArray(invoices) ? invoices : [];
  const shiftsArray = Array.isArray(shiftsList) ? shiftsList : [];
  const auditLogsArray = Array.isArray(auditLogs) ? auditLogs : [];

  // Fetch Core Reports Data (Sales & Inventory) on mount
  useEffect(() => {
    fetchCoreData();
  }, []);

  // Fetch contextual tab data when tabs shift
  useEffect(() => {
    if (activeTab === 'shifts') {
      fetchShiftsData();
    } else if (activeTab === 'price' || activeTab === 'adjustments' || activeTab === 'direct') {
      fetchAuditLogsData();
    } else if (activeTab === 'invoices') {
      fetchInvoicesData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'price' && settings.useCostPrice === false) {
      setActiveTab('sales');
    }
  }, [activeTab, settings.useCostPrice]);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [salesRes, itemsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/sales', config).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/inventory', config).catch(() => ({ data: [] }))
      ]);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
    } catch (err) {
      toast.error("Failed to sync primary analytical data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoicesData = async () => {
    setLoadingInvoices(true);
    try {
      const res = await axios.get('http://localhost:5000/api/invoices', config);
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("B2B invoice records failed to synchronize.");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchShiftsData = async () => {
    setLoadingShifts(true);
    setLoadingUsers(true);
    try {
      const [shiftsRes, usersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/shifts', config).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/users', config).catch(() => ({ data: [] }))
      ]);
      setShiftsList(Array.isArray(shiftsRes.data) ? shiftsRes.data : []);
      setUsersList(Array.isArray(usersRes.data) ? usersRes.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Drawer shift histories failed to sync.");
    } finally {
      setLoadingShifts(false);
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogsData = async () => {
    setLoadingAudit(true);
    setAdminClearanceError(false);
    try {
      const res = await axios.get('http://localhost:5000/api/audit', config);
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setAdminClearanceError(true);
      } else {
        toast.error("Audit log database failed to synchronize.");
      }
    } finally {
      setLoadingAudit(false);
    }
  };

  // Helper date checker
  const isDateInRange = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr).getTime();
    if (isNaN(date)) return false;
    
    if (dateRange === 'today') {
      const todayStart = new Date().setHours(0,0,0,0);
      const todayEnd = new Date().setHours(23,59,59,999);
      return date >= todayStart && date <= todayEnd;
    }
    if (dateRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return date >= sevenDaysAgo.getTime();
    }
    if (dateRange === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo.getTime();
    }
    if (dateRange === 'custom') {
      const fromTime = customFromDate ? new Date(customFromDate).setHours(0,0,0,0) : null;
      const toTime = customToDate ? new Date(customToDate).setHours(23,59,59,999) : null;
      if (fromTime && date < fromTime) return false;
      if (toTime && date > toTime) return false;
      return true;
    }
    return true; // lifetime
  };

  // CSV Export utility
  const exportToCSV = (headers, rows, filename) => {
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val !== null && val !== undefined ? val : '').replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // SALES COMPUTATIONS & FILTERS
  // ==========================================
  const filteredSales = salesArray.filter(sale => {
    const matchesDate = isDateInRange(sale.createdAt);
    const matchesSearch = (sale.customerName || '').toLowerCase().includes(salesSearch.toLowerCase()) || 
                          (sale._id || '').toString().toLowerCase().includes(salesSearch.toLowerCase());
    const matchesMethod = salesPaymentMethod === 'all' || sale.paymentMethod === salesPaymentMethod;
    return matchesDate && matchesSearch && matchesMethod;
  });

  const totalSalesRevenue = filteredSales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const averageSalesTicket = filteredSales.length > 0 ? totalSalesRevenue / filteredSales.length : 0;

  const getSaleItemCost = (saleItem) => {
    const item = itemsArray.find(i => String(i._id) === String(saleItem.itemId));
    if (!item) return 0;
    if (saleItem.batchId && item.batches) {
      const batch = item.batches.find(b => String(b._id) === String(saleItem.batchId));
      if (batch && batch.costPrice !== undefined) {
        return batch.costPrice * (saleItem.quantity || 0);
      }
    }
    const unitCost = item.movingAverageCost || item.costPrice || 0;
    return unitCost * (saleItem.quantity || 0);
  };

  const getSaleCost = (sale) => {
    if (!sale.items || !Array.isArray(sale.items)) return 0;
    return sale.items.reduce((sum, item) => sum + getSaleItemCost(item), 0);
  };

  // Chart: Daily Sales Aggregations
  const getSalesChartData = () => {
    const map = {};
    filteredSales.forEach(s => {
      const day = new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (!map[day]) map[day] = { name: day, Sales: 0, Cost: 0, Profit: 0, Orders: 0 };
      const revenue = s.totalAmount || 0;
      const cost = getSaleCost(s);
      const profit = revenue - cost;
      map[day].Sales += revenue;
      map[day].Cost += cost;
      map[day].Profit += profit;
      map[day].Orders += 1;
    });
    return Object.values(map).reverse(); // sort chronologically roughly
  };

  // Aggregation: Top Selling Items
  const itemSalesMap = {};
  filteredSales.forEach(sale => {
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        if (item && item.name) {
          if (!itemSalesMap[item.name]) {
            itemSalesMap[item.name] = { name: item.name, quantity: 0, value: 0 };
          }
          itemSalesMap[item.name].quantity += item.quantity || 0;
          itemSalesMap[item.name].value += item.subtotal || 0;
        }
      });
    }
  });
  const bestSellersList = Object.values(itemSalesMap).sort((a, b) => b.value - a.value).slice(0, 8);

  // Aggregation: Cashier Performance
  const cashierMap = {};
  filteredSales.forEach(sale => {
    const username = sale.soldBy?.username || 'System';
    if (!cashierMap[username]) {
      cashierMap[username] = { name: username, Sales: 0, Orders: 0 };
    }
    cashierMap[username].Sales += sale.totalAmount || 0;
    cashierMap[username].Orders += 1;
  });
  const cashierPerformanceList = Object.values(cashierMap).sort((a, b) => b.Sales - a.Sales);

  const exportSalesCSV = () => {
    const headers = ['Sale ID', 'Customer Name', 'Payment Method', 'Total Amount', 'Created At'];
    const rows = filteredSales.map(s => [
      s._id,
      s.customerName || 'Walk-in Customer',
      (s.paymentMethod || 'CASH').toUpperCase(),
      s.totalAmount || 0,
      new Date(s.createdAt).toLocaleString()
    ]);
    exportToCSV(headers, rows, `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // STOCK COMPUTATIONS & FILTERS
  // ==========================================
  const filteredItems = itemsArray.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(stockSearch.toLowerCase()) || 
                          (item.sku || '').toLowerCase().includes(stockSearch.toLowerCase());
    const matchesCategory = stockCategoryFilter === 'all' || item.category === stockCategoryFilter;
    
    let matchesStockLevel = true;
    if (stockLevelFilter === 'low') {
      matchesStockLevel = item.quantity > 0 && item.quantity <= item.reorderPoint;
    } else if (stockLevelFilter === 'out') {
      matchesStockLevel = item.quantity <= 0;
    } else if (stockLevelFilter === 'healthy') {
      matchesStockLevel = item.quantity > item.reorderPoint;
    }

    return matchesSearch && matchesCategory && matchesStockLevel;
  });

  const totalSKUs = filteredItems.length;
  const totalStockUnits = filteredItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const retailValuation = filteredItems.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.price || 0)), 0);
  const costValuation = filteredItems.reduce((acc, curr) => acc + ((curr.quantity || 0) * (curr.movingAverageCost || curr.costPrice || 0)), 0);
  const potentialGrossMargin = retailValuation - costValuation;

  // Stock categories list for select dropdown
  const stockCategories = [...new Set(itemsArray.map(i => i.category).filter(Boolean))];

  // Chart: Category Allocation
  const categoryInventoryMap = {};
  filteredItems.forEach(item => {
    const cat = item.category || 'Uncategorized';
    if (!categoryInventoryMap[cat]) {
      categoryInventoryMap[cat] = { name: cat, value: 0 };
    }
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    categoryInventoryMap[cat].value += qty * price;
  });
  const categoryChartData = Object.values(categoryInventoryMap).sort((a, b) => b.value - a.value).slice(0, 6);

  // Aggregation: Batch Expiry Ledger
  const batchExpiryList = [];
  filteredItems.forEach(item => {
    if (Array.isArray(item.batches) && item.batches.length > 0) {
      item.batches.forEach(b => {
        batchExpiryList.push({
          _id: b._id,
          itemName: item.name,
          sku: item.sku,
          batchNumber: b.batchNumber,
          quantity: b.quantity || 0,
          costPrice: b.costPrice || 0,
          sellingPrice: b.sellingPrice || 0,
          expiryDate: b.expiryDate,
          status: b.status
        });
      });
    }
  });

  const getBatchExpiryDetails = (expiryDateStr) => {
    if (!expiryDateStr) return { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    const expiryDate = new Date(expiryDateStr);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: 'Expired', color: 'bg-rose-50 text-rose-700 border-rose-100' };
    } else if (diffDays <= 30) {
      return { label: `Expiring in ${diffDays}d`, color: 'bg-amber-50 text-amber-700 border-amber-100' };
    } else {
      return { label: 'Healthy', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    }
  };

  const exportStockCSV = () => {
    const headers = settings.useCostPrice !== false 
      ? ['Product Name', 'SKU', 'Category', 'Quantity', 'Selling Price', 'Avg. Cost', 'Total Cost Value', 'Total Retail Value']
      : ['Product Name', 'SKU', 'Category', 'Quantity', 'Selling Price', 'Total Retail Value'];
    
    const rows = filteredItems.map(i => {
      const baseRow = [
        i.name || '',
        i.sku || '',
        i.category || '',
        i.quantity || 0,
        i.price || 0
      ];
      if (settings.useCostPrice !== false) {
        baseRow.push(
          i.movingAverageCost || i.costPrice || 0,
          (i.quantity || 0) * (i.movingAverageCost || i.costPrice || 0),
          (i.quantity || 0) * (i.price || 0)
        );
      } else {
        baseRow.push((i.quantity || 0) * (i.price || 0));
      }
      return baseRow;
    });
    exportToCSV(headers, rows, `Inventory_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // INVOICE COMPUTATIONS & FILTERS
  // ==========================================
  const filteredInvoices = invoicesArray.filter(inv => {
    const matchesSearch = (inv.invoiceNumber || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || 
                          (inv.customerDetails?.name || '').toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus = invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter;
    const matchesDate = isDateInRange(inv.createdAt);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalInvoicedVal = filteredInvoices.reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const outstandingReceivableVal = filteredInvoices.filter(i => i.status === 'completed').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const paidInvoicesVal = filteredInvoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);
  const draftInvoicesVal = filteredInvoices.filter(i => i.status === 'draft').reduce((acc, curr) => acc + (curr.grandTotal || 0), 0);

  const exportInvoicesCSV = () => {
    const headers = ['Invoice Number', 'Customer Name', 'Status', 'Grand Total', 'Terms', 'Due Date', 'Created Date'];
    const rows = filteredInvoices.map(i => [
      i.invoiceNumber || '',
      i.customerDetails?.name || 'Anonymous',
      (i.status || 'DRAFT').toUpperCase(),
      i.grandTotal || 0,
      i.paymentTerms || '',
      new Date(i.dueDate).toLocaleDateString(),
      new Date(i.createdAt).toLocaleDateString()
    ]);
    exportToCSV(headers, rows, `B2B_Invoices_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // SHIFTS LEDGER COMPUTATIONS
  // ==========================================
  const filteredShifts = shiftsArray.filter(shift => {
    const operator = shift.userId?.username || 'System';
    const matchesSearch = (operator || '').toLowerCase().includes(shiftsSearch.toLowerCase()) ||
                          (shift.notes || '').toLowerCase().includes(shiftsSearch.toLowerCase());
    const matchesDate = isDateInRange(shift.createdAt);
    return matchesSearch && matchesDate;
  });

  const activeTerminalsCount = shiftsArray.filter(s => s.status === 'open').length;
  const totalShiftDiscrepancy = filteredShifts.reduce((acc, curr) => acc + (curr.difference || 0), 0);

  const exportShiftsCSV = () => {
    const headers = ['Operator', 'Start Time', 'End Time', 'Status', 'Start Float', 'Expected drawer', 'Actual drawer', 'Discrepancy', 'Notes'];
    const rows = filteredShifts.map(s => [
      s.userId?.username || 'System',
      new Date(s.startTime).toLocaleString(),
      s.endTime ? new Date(s.endTime).toLocaleString() : 'N/A',
      (s.status || 'OPEN').toUpperCase(),
      s.startFloat || 0,
      s.expectedDrawerAmount || 0,
      s.actualDrawerAmount !== undefined ? s.actualDrawerAmount : 'N/A',
      s.difference !== undefined ? s.difference : 'N/A',
      s.notes || ''
    ]);
    exportToCSV(headers, rows, `Drawer_Shifts_History_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // PRICE CHANGE LOGS
  // ==========================================
  const priceChangeLogs = auditLogsArray.filter(log => {
    const isPrice = log.action === 'PRICE_CHANGE' || log.module === 'PRICING';
    const matchesSearch = (log.details || '').toLowerCase().includes(priceSearch.toLowerCase()) || 
                          (log.username || '').toLowerCase().includes(priceSearch.toLowerCase());
    const matchesDate = isDateInRange(log.timestamp);
    return isPrice && matchesSearch && matchesDate;
  });

  const exportPriceCSV = () => {
    const headers = ['Timestamp', 'Operator', 'Action details'];
    const rows = priceChangeLogs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.username || 'System',
      l.details || ''
    ]);
    exportToCSV(headers, rows, `Price_Change_Logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // STOCK ADJUSTMENT LOGS
  // ==========================================
  // ==========================================
  // DIRECT STOCK ADDITION LOGS & FORMATTING HELPERS
  // ==========================================
  const parseDirectDetails = (details) => {
    try {
      if (details && details.startsWith('{')) {
        return JSON.parse(details);
      }
    } catch (e) {
      // Fallback
    }
    return null;
  };

  const formatAuditDetails = (log) => {
    if (log.action === 'DIRECT_STOCK_ADD') {
      const parsed = parseDirectDetails(log.details);
      if (parsed) {
        return `Direct Stock Added: +${parsed.qty} ${parsed.unitType} of "${parsed.itemName}" (SKU: ${parsed.sku}) into Batch ${parsed.batchNumber}${parsed.expiryDate ? ` (Exp: ${parsed.expiryDate})` : ''}.`;
      }
    }
    return log.details;
  };

  // ==========================================
  // STOCK ADJUSTMENT LOGS
  // ==========================================
  const stockAdjustmentLogs = auditLogsArray.filter(log => {
    const isStock = log.action === 'STOCK_ADJUSTMENT' || 
                    log.action === 'STOCK_GRN_RECEIPT' || 
                    log.action === 'SUPPLIER_RETURN' ||
                    log.action === 'DIRECT_STOCK_ADD' ||
                    log.module === 'SUPPLY_CHAIN';
    const matchesSearch = (log.details || '').toLowerCase().includes(adjustmentsSearch.toLowerCase()) || 
                          (log.username || '').toLowerCase().includes(adjustmentsSearch.toLowerCase());
    const matchesAction = adjustmentActionFilter === 'all' || log.action === adjustmentActionFilter;
    const matchesDate = isDateInRange(log.timestamp);
    return isStock && matchesSearch && matchesAction && matchesDate;
  });

  const exportAdjustmentsCSV = () => {
    const headers = ['Timestamp', 'Log Level / Action', 'Operator', 'Details'];
    const rows = stockAdjustmentLogs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.action || '',
      l.username || 'System',
      formatAuditDetails(l)
    ]);
    exportToCSV(headers, rows, `Stock_Adjustments_Logs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ==========================================
  // DIRECT STOCK ADDITIONS CALCULATIONS & EXPORTS
  // ==========================================
  const directStockLogs = auditLogsArray.filter(log => {
    const isDirect = log.action === 'DIRECT_STOCK_ADD';
    const matchesSearch = (log.details || '').toLowerCase().includes(directSearch.toLowerCase()) || 
                          (log.username || '').toLowerCase().includes(directSearch.toLowerCase());
    const matchesDate = isDateInRange(log.timestamp);
    return isDirect && matchesSearch && matchesDate;
  });

  const totalDirectIntakes = directStockLogs.length;

  const totalDirectQty = directStockLogs.reduce((sum, log) => {
    const parsed = parseDirectDetails(log.details);
    return sum + (parsed ? parseFloat(parsed.qty) || 0 : 0);
  }, 0);

  const directOperators = [...new Set(directStockLogs.map(log => log.username))].length;

  const exportDirectCSV = () => {
    const headers = ['Timestamp', 'Operator', 'Product Name', 'SKU', 'Quantity Added', 'Unit Type', 'Batch Code', 'Expiry Date'];
    const rows = directStockLogs.map(l => {
      const parsed = parseDirectDetails(l.details);
      if (parsed) {
        return [
          new Date(l.timestamp).toLocaleString(),
          l.username || 'System',
          parsed.itemName || '',
          parsed.sku || '',
          parsed.qty || 0,
          parsed.unitType || 'pieces',
          parsed.batchNumber || '',
          parsed.expiryDate || 'None'
        ];
      } else {
        return [
          new Date(l.timestamp).toLocaleString(),
          l.username || 'System',
          l.details || '',
          '',
          '',
          '',
          '',
          ''
        ];
      }
    });
    exportToCSV(headers, rows, `Direct_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const printSalesReport = () => {
    printService.a4Document({
      title: 'Sales Analysis Report',
      docNumber: `REP-SLS-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Date Range: ${dateRange.toUpperCase()}`
      },
      items: filteredSales.map((s, index) => ({
        name: s.customerName || 'Walk-in Customer',
        sku: `ID: ${(s._id || '').slice(-8).toUpperCase()}`,
        qty: s.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        price: s.totalAmount || 0,
        total: s.totalAmount || 0,
        batch: s.paymentMethod?.toUpperCase(),
        expiry: new Date(s.createdAt).toLocaleDateString()
      })),
      summaryFields: [
        { label: 'Transactions Count', value: filteredSales.length },
        { label: 'Avg Ticket Value', value: averageSalesTicket },
        { label: 'TOTAL REVENUE', value: totalSalesRevenue, isGrand: true }
      ],
      notes: `Sales Report summary generated for time horizon: ${dateRange}. Total items sold: ${Object.values(itemSalesMap).reduce((sum, item) => sum + item.quantity, 0)}.`,
      settings
    });
  };

  const printStockReport = () => {
    printService.a4Document({
      title: 'Inventory & Valuation Report',
      docNumber: `REP-STK-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Category: ${stockCategoryFilter.toUpperCase()}`
      },
      items: filteredItems.map((i) => ({
        name: i.name || 'Product',
        sku: i.sku || 'No SKU',
        qty: i.quantity || 0,
        price: i.price || 0,
        total: (i.quantity || 0) * (i.price || 0),
        costPrice: i.movingAverageCost || i.costPrice || 0,
        batch: i.category?.toUpperCase()
      })),
      summaryFields: [
        { label: 'Total SKUs', value: totalSKUs },
        { label: 'Total Stock Qty', value: totalStockUnits },
        { label: 'Cost Valuation', value: costValuation },
        { label: 'Retail Valuation', value: retailValuation, isGrand: true }
      ],
      notes: `Inventory valuation report based on current stock levels. Reorder threshold warnings: ${filteredItems.filter(i => i.quantity <= i.reorderPoint).length} items.`,
      settings
    });
  };

  const printInvoiceReport = () => {
    printService.a4Document({
      title: 'B2B Invoice Ledger Report',
      docNumber: `REP-INV-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Invoice Status Filter: ${invoiceStatusFilter.toUpperCase()}`
      },
      items: filteredInvoices.map((inv) => ({
        name: inv.customerDetails?.name || 'Walk-in Customer',
        sku: `Invoice: #${inv.invoiceNumber}`,
        qty: inv.items?.length || 0,
        price: inv.grandTotal || 0,
        total: inv.grandTotal || 0,
        batch: inv.status?.toUpperCase(),
        expiry: new Date(inv.dueDate).toLocaleDateString()
      })),
      summaryFields: [
        { label: 'Outstanding Receivables', value: outstandingReceivableVal },
        { label: 'Paid Invoices Value', value: paidInvoicesVal },
        { label: 'TOTAL INVOICED', value: totalInvoicedVal, isGrand: true }
      ],
      notes: `Commercial invoice ledger report summary for dates matching filter criteria. Open/Completed invoices total: ${filteredInvoices.length} entries.`,
      settings
    });
  };

  const printShiftsReport = () => {
    printService.a4Document({
      title: 'User Shift Drawer Report',
      docNumber: `REP-SHF-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Cashier',
        email: user?.role || 'Staff',
        phone: `Active shifts: ${activeTerminalsCount}`
      },
      items: filteredShifts.map((s) => ({
        name: s.userId?.username || 'System Cashier',
        sku: s.status?.toUpperCase(),
        qty: s.salesCount || 0,
        price: s.salesTotal || 0,
        total: s.salesTotal || 0,
        batch: `Float: ${settings.currencySymbol}${s.startFloat || 0}`,
        expiry: s.endTime ? new Date(s.endTime).toLocaleDateString() : 'Active'
      })),
      summaryFields: [
        { label: 'Active shifts', value: activeTerminalsCount },
        { label: 'Total Cash Variance', value: totalShiftDiscrepancy, isGrand: true }
      ],
      notes: `Drawer shift floats log report. Expected drawer amount checks verify cash portion transactions.`,
      settings
    });
  };

  const printPriceReport = () => {
    printService.a4Document({
      title: 'Price Modification Audit Ledger',
      docNumber: `REP-PRC-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Records matched: ${priceChangeLogs.length}`
      },
      items: priceChangeLogs.map((log) => ({
        name: log.details || 'Price Change Details',
        sku: log.username || 'System',
        qty: 1,
        price: 0,
        total: 0,
        batch: 'PRICE_AUDIT',
        expiry: new Date(log.timestamp).toLocaleString()
      })),
      summaryFields: [
        { label: 'Total Log Entries', value: priceChangeLogs.length, isGrand: true }
      ],
      notes: `Audit report tracking catalog pricing updates and average cost adjustments.`,
      settings
    });
  };

  const printStockAuditReport = () => {
    printService.a4Document({
      title: 'Inventory Transaction Audit Ledger',
      docNumber: `REP-AUD-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Filter: ${adjustmentActionFilter.toUpperCase()}`
      },
      items: stockAdjustmentLogs.map((log) => ({
        name: log.details || 'Log Details',
        sku: log.username || 'Operator',
        qty: 1,
        price: 0,
        total: 0,
        batch: log.action || 'ADJUSTMENT',
        expiry: new Date(log.timestamp).toLocaleString()
      })),
      summaryFields: [
        { label: 'Audit Log Count', value: stockAdjustmentLogs.length, isGrand: true }
      ],
      notes: `Stock adjustments audit trail. Reflects manual overrides, transfer operations, and reconciliation movements.`,
      settings
    });
  };

  const printDirectStockReport = () => {
    printService.a4Document({
      title: 'Direct Stock Additions Ledger',
      docNumber: `REP-DIR-${new Date().toISOString().slice(0,10)}`,
      date: new Date().toLocaleDateString(),
      partyLabel: 'REPORT GENERATED BY',
      partyDetails: {
        name: user?.username || 'System Operator',
        email: user?.role || 'Staff',
        phone: `Total direct logs: ${directStockLogs.length}`
      },
      items: directStockLogs.map((log) => ({
        name: log.details || 'Additions details',
        sku: log.username || 'Operator',
        qty: 1,
        price: 0,
        total: 0,
        batch: 'DIRECT_ADD',
        expiry: new Date(log.timestamp).toLocaleString()
      })),
      summaryFields: [
        { label: 'Direct Entry Count', value: directStockLogs.length, isGrand: true }
      ],
      notes: `Logs reporting direct manual batch entries into product inventory outside of standard B2B GRN imports.`,
      settings
    });
  };

  const printActiveReport = () => {
    switch (activeTab) {
      case 'sales':
        printSalesReport();
        break;
      case 'stock':
        printStockReport();
        break;
      case 'invoices':
        printInvoiceReport();
        break;
      case 'shifts':
        printShiftsReport();
        break;
      case 'price':
        printPriceReport();
        break;
      case 'adjustments':
        printStockAuditReport();
        break;
      case 'direct':
        printDirectStockReport();
        break;
      default:
        toast.info("Print format not supported for this report tab.");
    }
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500 rounded-full opacity-20 blur-[60px] translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-white border border-white/20 shadow-xl">
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Advanced Reports</h1>
              <p className="text-slate-300 font-medium mt-1">Unified analytics ledger, audits, stock and invoicing modules.</p>
            </div>
          </div>
          
          {/* Universal Date Filter Controls */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-white">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock className="w-3 h-3"/> Time Horizon</span>
              <select 
                value={dateRange} 
                onChange={e => setDateRange(e.target.value)} 
                className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="lifetime">Lifetime</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">From</span>
                  <input 
                    type="date" 
                    value={customFromDate} 
                    onChange={e => setCustomFromDate(e.target.value)} 
                    className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">To</span>
                  <input 
                    type="date" 
                    value={customToDate} 
                    onChange={e => setCustomToDate(e.target.value)} 
                    className="bg-slate-800 text-white text-xs font-bold border border-slate-700 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <button 
              onClick={() => {
                fetchCoreData();
                if (activeTab === 'shifts') fetchShiftsData();
                if (activeTab === 'price' || activeTab === 'adjustments' || activeTab === 'direct') fetchAuditLogsData();
                if (activeTab === 'invoices') fetchInvoicesData();
              }}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-colors mt-auto"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modern Multi-Tab Selection Strip */}
      <div className="flex border-b border-slate-200 overflow-x-auto space-x-3 sm:space-x-6 custom-scrollbar pb-1.5 scroll-smooth">
        <button 
          onClick={() => setActiveTab('sales')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'sales' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Sales Report
        </button>
        <button 
          onClick={() => setActiveTab('stock')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'stock' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Stock & Expiry
        </button>
        <button 
          onClick={() => setActiveTab('invoices')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'invoices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Invoice Report
        </button>
        <button 
          onClick={() => setActiveTab('shifts')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'shifts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Users & Shifts
        </button>
        {settings.useCostPrice !== false && (
          <button 
            onClick={() => setActiveTab('price')} 
            className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'price' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Price Audit
          </button>
        )}
        <button 
          onClick={() => setActiveTab('adjustments')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'adjustments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Stock Audit Logs
        </button>
        <button 
          onClick={() => setActiveTab('direct')} 
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${activeTab === 'direct' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Direct Stock
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SALES ANALYSIS VIEW                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-8">
          {/* Sales Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Sales Revenue" value={formatCurrency(totalSalesRevenue)} icon={<DollarSign className="w-5 h-5"/>} color="blue" subtitle="Total gross revenue" />
            <MetricCard title="Transactions Count" value={filteredSales.length} icon={<Layers className="w-5 h-5"/>} color="indigo" subtitle="Volume of orders" />
            <MetricCard title="Avg. Order Value" value={formatCurrency(averageSalesTicket)} icon={<Activity className="w-5 h-5"/>} color="emerald" subtitle="Ticket size average" />
            <MetricCard title="Items Sold Count" value={Object.values(itemSalesMap).reduce((sum, item) => sum + item.quantity, 0)} icon={<Package className="w-5 h-5"/>} color="rose" subtitle="Units loaded out" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6">
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Profit Margin & P&L Analysis</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getSalesChartData()}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{fill: '#64748b', fontWeight: 600}} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" name="Revenue" dataKey="Sales" stroke="#2563eb" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                    <Area type="monotone" name="Cost" dataKey="Cost" stroke="#64748b" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
                    <Area type="monotone" name="Profit Margin" dataKey="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Top Sellers</h3>
                <div className="space-y-4">
                  {bestSellersList.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.quantity} units sold</p>
                      </div>
                      <span className="font-black text-blue-600 pl-4">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  {bestSellersList.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-12">No product performance registered yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cashier performance & sales ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Ledger */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search sales..." 
                    value={salesSearch} 
                    onChange={e => setSalesSearch(e.target.value)} 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    value={salesPaymentMethod} 
                    onChange={e => setSalesPaymentMethod(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                  >
                    <option value="all">All Payments</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>

                  <button 
                    onClick={printActiveReport} 
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                  <button 
                    onClick={exportSalesCSV} 
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Method</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                      <th className="px-6 py-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredSales.map(s => (
                      <tr key={s._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">#{(s._id || '').slice(-8).toUpperCase()}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{s.customerName || 'Walk-in Customer'}</td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{s.paymentMethod}</span></td>
                        <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(s.totalAmount)}</td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium">{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold">No sales records meet criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cashier performance list */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col">
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Cashier Metrics</h3>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                {cashierPerformanceList.map((cashier, idx) => (
                  <div key={idx} className="py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {(cashier.name || 'SY').substring(0,2)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{cashier.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{cashier.Orders} transactions done</p>
                      </div>
                    </div>
                    <span className="font-black text-slate-800">{formatCurrency(cashier.Sales)}</span>
                  </div>
                ))}
                {cashierPerformanceList.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-12">No cashier performance captured.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STOCK & VALUATION VIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-8">
          {/* Stock Metrics */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${settings.useCostPrice !== false ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-3'} gap-4`}>
            <MetricCard title="Stock SKUs" value={totalSKUs} icon={<Package className="w-5 h-5"/>} color="blue" subtitle="Total unique products" />
            <MetricCard title="Cum. Stock Volume" value={totalStockUnits} icon={<Layers className="w-5 h-5"/>} color="indigo" subtitle="Sum of item quantities" />
            {settings.useCostPrice !== false && (
              <MetricCard title="Cost Valuation" value={formatCurrency(costValuation)} icon={<DollarSign className="w-5 h-5"/>} color="amber" subtitle="Buying capital locked" />
            )}
            <MetricCard title="Retail Valuation" value={formatCurrency(retailValuation)} icon={<DollarSign className="w-5 h-5"/>} color="emerald" subtitle="Selling revenue pipeline" />
            {settings.useCostPrice !== false && (
              <MetricCard title="Potential Margin" value={formatCurrency(potentialGrossMargin)} icon={<TrendingUp className="w-5 h-5"/>} color="rose" subtitle="Est. profits yield" />
            )}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Low Stock Alerts</h3>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-black rounded-lg uppercase">
                  {filteredItems.filter(i => i.quantity <= i.reorderPoint).length} Items Warning
                </span>
              </div>
              
              <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-2xl flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-4">Item</th>
                      <th className="px-6 py-4">SKU</th>
                      <th className="px-6 py-4 text-center">Remaining</th>
                      <th className="px-6 py-4 text-center">Reorder Lvl</th>
                      <th className="px-6 py-4">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                    {filteredItems.filter(i => i.quantity <= i.reorderPoint).map((item, idx) => (
                      <tr key={idx} className={item.quantity === 0 ? 'bg-red-50/50' : 'hover:bg-slate-50/30'}>
                        <td className="px-6 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-6 py-3 font-mono">{item.sku}</td>
                        <td className="px-6 py-3 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.quantity} Units</span></td>
                        <td className="px-6 py-3 text-center">{item.reorderPoint}</td>
                        <td className="px-6 py-3 text-slate-500">{item.supplier || 'Not Specified'}</td>
                      </tr>
                    ))}
                    {filteredItems.filter(i => i.quantity <= i.reorderPoint).length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">All inventory items are in healthy thresholds.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Chart */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Stock Allocation Value</h3>
                <div className="h-48 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        cornerRadius={5}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                {categoryChartData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-800">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Stock Ledger & Batch Expiry Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stock Valuation Register */}
            <div className={settings.useExpirationDates !== false ? "lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col" : "lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col"}>
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search stock..." 
                    value={stockSearch} 
                    onChange={e => setStockSearch(e.target.value)} 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <select 
                    value={stockCategoryFilter} 
                    onChange={e => setStockCategoryFilter(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                  >
                    <option value="all">All Categories</option>
                    {stockCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select 
                    value={stockLevelFilter} 
                    onChange={e => setStockLevelFilter(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                  >
                    <option value="all">All Levels</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                    <option value="healthy">Healthy</option>
                  </select>

                  <button 
                    onClick={printActiveReport} 
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                  <button 
                    onClick={exportStockCSV} 
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Item Details</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-center">Remaining</th>
                      {settings.useCostPrice !== false && (
                        <>
                          <th className="px-6 py-4 text-right">Avg Cost</th>
                          <th className="px-6 py-4 text-right">Cost Value</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredItems.map(item => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{item.category}</td>
                        <td className="px-6 py-4 text-center"><span className="font-black text-slate-700">{item.quantity} units</span></td>
                        {settings.useCostPrice !== false && (
                          <>
                            <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(item.movingAverageCost || item.costPrice || 0)}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency((item.quantity || 0) * (item.movingAverageCost || item.costPrice || 0))}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Batch Expiry Ledger */}
            {settings.useExpirationDates !== false && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col">
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Batch Expiry Ledger</h3>
                <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100">
                  {batchExpiryList.map((batch, idx) => {
                    const status = getBatchExpiryDetails(batch.expiryDate);
                    return (
                      <div key={idx} className="py-3 flex justify-between items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 text-xs truncate">{batch.itemName}</p>
                          <p className="text-[9px] text-slate-400 font-mono">Batch: {batch.batchNumber} | Qty: {batch.quantity}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Exp: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase text-center ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                  {batchExpiryList.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-12">No active product batches recorded.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVOICE REPORTS VIEW                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-8">
          {/* Invoice stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Invoiced" value={formatCurrency(totalInvoicedVal)} icon={<DollarSign className="w-5 h-5"/>} color="blue" subtitle="Gross invoice pipeline" />
            <MetricCard title="Outstanding Receivables" value={formatCurrency(outstandingReceivableVal)} icon={<AlertCircle className="w-5 h-5"/>} color="amber" subtitle="Awaiting client payment" />
            <MetricCard title="Paid Invoiced Receipts" value={formatCurrency(paidInvoicesVal)} icon={<CheckCircle className="w-5 h-5"/>} color="emerald" subtitle="Cleared corporate assets" />
            <MetricCard title="Draft Stage Invoices" value={formatCurrency(draftInvoicesVal)} icon={<FileText className="w-5 h-5"/>} color="indigo" subtitle="Incomplete documentation" />
          </div>

          {/* Invoice register table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search invoice number or customer..." 
                  value={invoiceSearch} 
                  onChange={e => setInvoiceSearch(e.target.value)} 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  value={invoiceStatusFilter} 
                  onChange={e => setInvoiceStatusFilter(e.target.value)} 
                  className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                >
                  <option value="all">All Invoices</option>
                  <option value="draft">Drafts</option>
                  <option value="completed">Completed / Awaiting Payment</option>
                  <option value="paid">Paid</option>
                </select>

                <button 
                  onClick={printActiveReport} 
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button 
                  onClick={exportInvoicesCSV} 
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Register
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loadingInvoices ? (
                <div className="py-24 text-center text-slate-400 animate-pulse">Synchronizing invoices...</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Invoice Number</th>
                      <th className="px-6 py-4">Client Details</th>
                      <th className="px-6 py-4 text-right">Grand Total</th>
                      <th className="px-6 py-4">Payment Terms</th>
                      <th className="px-6 py-4">Due Date</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredInvoices.map(inv => {
                      const isOverdue = inv.status === 'completed' && new Date(inv.dueDate) < new Date();
                      return (
                        <tr key={inv._id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">#{inv.invoiceNumber}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800">{inv.customerDetails?.name || 'Walk-in'}</p>
                            <p className="text-[10px] text-slate-400">{inv.customerDetails?.email || ''}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                          <td className="px-6 py-4 text-slate-500 font-medium text-xs">{inv.paymentTerms || 'Due on Receipt'}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600">
                            {new Date(inv.dueDate).toLocaleDateString()}
                            {isOverdue && <span className="block text-[9px] text-rose-500 font-black uppercase">Overdue</span>}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              inv.status === 'completed' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-bold">No invoice logs registered.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. USERS & SHIFTS AUDIT VIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-8">
          {/* Shifts stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Registered Operators" value={usersList.length} icon={<Users className="w-5 h-5"/>} color="indigo" subtitle="Accounts in database" />
            <MetricCard title="Active Cashier Terminals" value={activeTerminalsCount} icon={<CheckCircle className="w-5 h-5"/>} color="green" subtitle="Currently open shifts" />
            <MetricCard title="Total Cash Variance" value={formatCurrency(totalShiftDiscrepancy)} icon={totalShiftDiscrepancy === 0 ? <ShieldCheck className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>} color={totalShiftDiscrepancy === 0 ? "green" : "rose"} subtitle="Drawer expected vs actual float" />
            <MetricCard title="Total Shift Sales" value={formatCurrency(filteredShifts.reduce((acc, curr) => acc + (curr.salesTotal || 0), 0))} icon={<DollarSign className="w-5 h-5"/>} color="blue" subtitle="Revenue generated in shifts" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shifts History Log */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Shift Drawer Ledgers</h3>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search operator..." 
                      value={shiftsSearch} 
                      onChange={e => setShiftsSearch(e.target.value)} 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button 
                    onClick={printActiveReport} 
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                  <button 
                    onClick={exportShiftsCSV} 
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto flex-1 max-h-[400px]">
                {loadingShifts ? (
                  <div className="py-24 text-center text-slate-400 animate-pulse">Syncing drawer floats...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Cashier</th>
                        <th className="px-6 py-4">Start float</th>
                        <th className="px-6 py-4 text-right">Expected Drawer</th>
                        <th className="px-6 py-4 text-right">Actual Drawer</th>
                        <th className="px-6 py-4 text-center">Variance</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {filteredShifts.map(s => {
                        const operator = s.userId?.username || 'System';
                        return (
                          <tr key={s._id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{operator}</p>
                              <p className="text-[9px] text-slate-400">Opened: {new Date(s.startTime).toLocaleString()}</p>
                              {s.endTime && <p className="text-[9px] text-slate-400">Closed: {new Date(s.endTime).toLocaleString()}</p>}
                            </td>
                            <td className="px-6 py-4">{formatCurrency(s.startFloat)}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(s.expectedDrawerAmount)}</td>
                            <td className="px-6 py-4 text-right text-slate-900 font-black">{s.actualDrawerAmount !== undefined ? formatCurrency(s.actualDrawerAmount) : 'Pending'}</td>
                            <td className="px-6 py-4 text-center">
                              {s.status === 'closed' ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  s.difference === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {s.difference > 0 ? '+' : ''}{s.difference}
                                </span>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                s.status === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredShifts.length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-400">No drawer shifts logged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Operator registry list */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col">
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">User Accounts Registry</h3>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
                {loadingUsers ? (
                  <p className="text-slate-400 py-12 text-center">Syncing user data...</p>
                ) : (
                  usersList.map((usr, idx) => (
                    <div key={idx} className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                            {(usr.username || 'OP').substring(0,2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{usr.username}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{usr.role}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase tracking-widest border border-blue-100">
                          {usr.role === 'admin' ? 'Root access' : 'POS Cashier'}
                        </span>
                      </div>
                      
                      {/* Access clearances flags representation */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {usr.access && Object.entries(usr.access).map(([key, val]) => (
                          val === true && (
                            <span key={key} className="text-[8px] bg-slate-50 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-100 capitalize">
                              {key}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRICE AUDIT VIEWS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'price' && (
        <div className="space-y-8">
          {adminClearanceError ? (
            <AdminErrorPlaceholder />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Price Changes Ledger</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Audit log of cost and selling price modifications</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search details..." 
                      value={priceSearch} 
                      onChange={e => setPriceSearch(e.target.value)} 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button 
                    onClick={printActiveReport} 
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                  <button 
                    onClick={exportPriceCSV} 
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loadingAudit ? (
                  <div className="py-24 text-center text-slate-400 animate-pulse">Syncing Price Change Logs...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Operator</th>
                        <th className="px-6 py-4">Action Type</th>
                        <th className="px-6 py-4">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {priceChangeLogs.map(log => (
                        <tr key={log._id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{log.username}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 text-[9px] font-black uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{log.details}</td>
                        </tr>
                      ))}
                      {priceChangeLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold">No price changes audited.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. STOCK ADJUSTMENT VIEWS                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'adjustments' && (
        <div className="space-y-8">
          {adminClearanceError ? (
            <AdminErrorPlaceholder />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Stock Adjustments History</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Audit log of GRN intake, Supplier returns, and direct stock adjustments</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search details..." 
                      value={adjustmentsSearch} 
                      onChange={e => setAdjustmentsSearch(e.target.value)} 
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select 
                    value={adjustmentActionFilter} 
                    onChange={e => setAdjustmentActionFilter(e.target.value)} 
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none"
                  >
                    <option value="all">All Audits</option>
                    <option value="STOCK_GRN_RECEIPT">GRN Receipts</option>
                    <option value="SUPPLIER_RETURN">Supplier Returns</option>
                    <option value="STOCK_ADJUSTMENT">Stock Adjustments</option>
                    <option value="DIRECT_STOCK_ADD">Direct Stock Intakes</option>
                  </select>

                  <button 
                    onClick={printActiveReport} 
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Report
                  </button>
                  <button 
                    onClick={exportAdjustmentsCSV} 
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loadingAudit ? (
                  <div className="py-24 text-center text-slate-400 animate-pulse">Syncing Stock Adjustment Logs...</div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Operator</th>
                        <th className="px-6 py-4">Action Level</th>
                        <th className="px-6 py-4">Audit Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {stockAdjustmentLogs.map(log => (
                        <tr key={log._id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{log.username}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${
                              log.action === 'STOCK_GRN_RECEIPT' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              log.action === 'SUPPLIER_RETURN' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              log.action === 'DIRECT_STOCK_ADD' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{formatAuditDetails(log)}</td>
                        </tr>
                      ))}
                      {stockAdjustmentLogs.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold">No stock audits registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DIRECT STOCK ADDITIONS REPORT VIEW                                      */}
      {/* ========================================================================= */}
      {activeTab === 'direct' && (
        <div className="space-y-8">
          {adminClearanceError ? (
            <AdminErrorPlaceholder />
          ) : (
            <>
              {/* Direct Stock Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard 
                  title="Direct Intakes" 
                  value={totalDirectIntakes} 
                  icon={<ClipboardList className="w-5 h-5"/>} 
                  color="blue" 
                  subtitle="Total intake events logged" 
                />
                <MetricCard 
                  title="Total Units Added" 
                  value={totalDirectQty} 
                  icon={<Package className="w-5 h-5"/>} 
                  color="green" 
                  subtitle="Sum of items loaded directly" 
                />
                <MetricCard 
                  title="Active Operators" 
                  value={directOperators} 
                  icon={<Users className="w-5 h-5"/>} 
                  color="indigo" 
                  subtitle="Distinct personnel logged" 
                />
              </div>

              {/* Direct Stock Data Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Direct Stock Intake Ledger</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Report of inventory loads performed without PO or GRN overhead</p>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 inset-y-0 my-auto h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search items, SKU or operator..." 
                        value={directSearch} 
                        onChange={e => setDirectSearch(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button 
                      onClick={printActiveReport} 
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Report
                    </button>
                    <button 
                      onClick={exportDirectCSV} 
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl shadow-md text-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Report
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loadingAudit ? (
                    <div className="py-24 text-center text-slate-400 animate-pulse">Syncing Direct Stock Logs...</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Timestamp</th>
                          <th className="px-6 py-4">Operator</th>
                          <th className="px-6 py-4">Product Name / SKU</th>
                          <th className="px-6 py-4 text-center">Added Quantity</th>
                          <th className="px-6 py-4">Batch Code</th>
                          <th className="px-6 py-4">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {directStockLogs.map(log => {
                          const parsed = parseDirectDetails(log.details);
                          if (parsed) {
                            return (
                              <tr key={log._id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{log.username}</td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{parsed.itemName}</p>
                                  <p className="text-[10px] font-mono text-slate-400">SKU: {parsed.sku}</p>
                                </td>
                                <td className="px-6 py-4 text-center font-black text-slate-900">
                                  +{parsed.qty} <span className="text-[10px] text-slate-400 font-bold uppercase">{parsed.unitType}</span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-blue-600 font-bold">
                                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100">{parsed.batchNumber}</span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                  {parsed.expiryDate ? parsed.expiryDate : <span className="text-slate-400 font-normal">No Expiry</span>}
                                </td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={log._id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{log.username}</td>
                                <td colSpan="4" className="px-6 py-4 text-slate-600 font-medium">{log.details}</td>
                              </tr>
                            );
                          }
                        })}
                        {directStockLogs.length === 0 && (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-bold">No direct stock intakes registered for the selected date range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};

const MetricCard = ({ title, value, icon, color, subtitle }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-500/5",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-500/5",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-500/5",
    rose: "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-500/5",
    amber: "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-500/5"
  };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-lg shadow-slate-100/40 flex items-center gap-3 hover:-translate-y-1 transition-all duration-350 select-none">
      <div className={`p-2 rounded-xl border ${colors[color]} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</p>
        <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5 tracking-tight truncate" title={value}>{value}</p>
        {subtitle && <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

const AdminErrorPlaceholder = () => (
  <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-slate-200 text-center shadow-md">
    <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 border border-red-150">
      <Lock className="w-8 h-8" />
    </div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">Administrative Privilege Required</h2>
    <p className="text-slate-500 max-w-md text-sm">
      This reporting submodule contains sensitive, immutable audit ledgers and is restricted to administrators.
    </p>
  </div>
);

export default Reports;
