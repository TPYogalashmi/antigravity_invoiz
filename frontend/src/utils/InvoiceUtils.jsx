import { FileText, Download, CheckCircle2, XCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'

/**
 * Common Date Formatter
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

/**
 * Shared Invoice Display Component
 */
export const InvoicePreview = ({ invoice }) => {
  if (!invoice) return null;
  const formattedDate = formatDate(invoice.issueDate || new Date());
  const isB2B = !!(invoice.customer?.taxId);

  return (
    <div id="professional-invoice" className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl border border-slate-200">
      {/* Row 1: Seller + Status Pill */}
      <div className="flex justify-between items-start mb-6">
        {/* Seller Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-950 mb-2">Seller Details:</h3>
          <div className="space-y-1 text-sm font-medium text-slate-800 text-left">
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Business Name</span><span>:</span><span className="font-bold text-slate-950">INVOIZ MART</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>GSTIN</span><span>:</span><span className="font-bold text-slate-950">33ABCDE1234F1Z5</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Address</span><span>:</span><span>Chennai, Tamil Nadu</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Phone</span><span>:</span><span>+91-9876543210</span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-block px-5 py-2 rounded-full bg-slate-950 text-white text-[11px] font-black uppercase tracking-[0.25em] shadow-lg">
          Tax Invoice (GST)
        </div>
      </div>

      {/* Row 2: Bill To + Invoice Meta */}
      <div className="flex justify-between items-start mb-10 pr-12">
        <div className="space-y-4 text-left">
          <h3 className="text-sm font-bold text-slate-950 mb-2">Bill To:</h3>
          <div className="space-y-1 text-sm font-medium text-slate-800">
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Customer Name</span><span>:</span><span className="font-bold text-slate-950">{isB2B ? (invoice.customer?.company || invoice.customer?.name) : (invoice.customer?.name || 'Walk-in Customer')}</span>
            </div>
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Customer GSTIN</span><span>:</span><span className="font-bold text-slate-950">{invoice.customer?.taxId || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 ml-auto text-left">
          <h3 className="text-sm font-bold text-slate-950 mb-2">Invoice Details:</h3>
          <div className="space-y-1 text-sm font-medium text-slate-800">
            <div className="grid grid-cols-[100px_10px_1fr]">
              <span>Invoice No</span><span>:</span><span className="font-bold text-slate-950 font-mono text-[13px]">{invoice.invoiceNumber}</span>
            </div>
            <div className="grid grid-cols-[100px_10px_1fr]">
              <span>Invoice Date</span><span>:</span><span className="font-bold text-slate-950">{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <div className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-12 text-slate-500">No</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((item, idx) => (
                <tr key={idx} className="text-slate-700">
                  <td className="px-4 py-3 text-left font-mono text-xs text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3 text-left font-semibold">{item.description}</td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-500 uppercase text-[10px]">{item.unit || '1PC'}</td>
                  <td className="px-4 py-3 text-right">Rs.{(item.price || item.unitPrice || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{item.gstPercentage || 0}%</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">Rs.{(item.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-2 gap-12 items-start pt-8 border-t border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tax Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">CGST (9%)</span>
              <span className="font-semibold text-slate-950">Rs.{(Number(invoice.totalGST || 0) / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">SGST (9%)</span>
              <span className="font-semibold text-slate-950">Rs.{(Number(invoice.totalGST || 0) / 2).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-950">Rs.{(invoice.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total GST</span>
            <span className="font-semibold text-slate-950">Rs.{(invoice.totalGST || 0).toFixed(2)}</span>
          </div>
          <div className="pt-4 border-t border-slate-900 flex justify-between items-center">
            <span className="text-base font-bold text-slate-950 uppercase">Grand Total</span>
            <span className="text-2xl font-black text-slate-950">Rs.{(invoice.finalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 flex flex-col items-center">
        <div className="w-64 h-px bg-slate-200 mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorized Signatory</p>
        <p className="text-xs italic text-slate-300 mt-6 tracking-wide underline underline-offset-8">Invoice generated via INVOIZ Platform</p>
      </div>
    </div>
  )
}

/**
 * Shared PDF Generation Logic
 */
export const generateInvoicePDF = (invoice) => {
  if (!invoice) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42]; // slate-900

  // 1. Header (Seller Details)
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TAX INVOICE", 105, 10, { align: "center" });

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(14);
  doc.text("INVOIZ MART", 20, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("33ABCDE1234F1Z5", 20, 35);
  doc.text("Chennai, Tamil Nadu", 20, 40);
  doc.text("+91-9876543210", 20, 45);

  // 2. Invoice Meta (Right side)
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DETAILS", 140, 30);
  doc.setFont("helvetica", "normal");
  doc.text(`Number: ${invoice.invoiceNumber}`, 140, 35);
  doc.text(`Date: ${formatDate(invoice.issueDate || new Date())}`, 140, 40);

  // 3. Bill To
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 55, 190, 55);

  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 20, 65);
  doc.setFont("helvetica", "normal");
  const isB2B = !!(invoice.customer?.taxId);
  const customerName = isB2B ? (invoice.customer?.company || invoice.customer?.name) : (invoice.customer?.name || "Walk-in Customer");
  doc.text(customerName, 20, 70);
  doc.text(`GST: ${invoice.customer?.taxId || "N/A"}`, 20, 75);

  // 4. Items Table
  let currentY = 90;
  doc.setFillColor(245, 245, 245);
  doc.rect(20, currentY, 170, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", 22, currentY + 5);
  doc.text("QTY", 100, currentY + 5);
  doc.text("RATE", 130, currentY + 5);
  doc.text("AMOUNT", 160, currentY + 5);

  currentY += 12;
  doc.setFont("helvetica", "normal");

  (invoice.items || []).forEach((item, idx) => {
    doc.text(item.description || "N/A", 22, currentY);
    doc.text(`${item.quantity} ${item.unit || "PC"}`, 100, currentY);
    doc.text(`${(item.price || item.unitPrice || 0).toFixed(2)}`, 130, currentY);
    doc.text(`${(item.total || 0).toFixed(2)}`, 160, currentY);
    currentY += 8;
  });

  // 5. Summary
  currentY += 10;
  doc.line(120, currentY, 190, currentY);
  currentY += 8;
  doc.text("Subtotal:", 130, currentY);
  doc.text(`${(invoice.totalAmount || 0).toFixed(2)}`, 160, currentY);

  currentY += 6;
  doc.text("Total GST:", 130, currentY);
  doc.text(`${(invoice.totalGST || 0).toFixed(2)}`, 160, currentY);

  currentY += 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL:", 130, currentY);
  doc.text(`Rs. ${(invoice.finalAmount || 0).toFixed(2)}`, 160, currentY);

  // 6. Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer-generated invoice.", 105, pageHeight - 15, { align: "center" });

  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}
