import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import React from 'react'

/**
 * Common Date Formatter
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return '—'
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return '—'
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
    <div id="invoice-preview" className="bg-white text-slate-900 rounded-xl p-8 shadow-2xl border border-slate-200">
      {/* Row 1: Document Header (Left Aligned) */}
      <div className="mb-8">
        <h2 className="text-center text-black text-3xl font-extrabold tracking-wider mb-6">
          Invoice
        </h2>
        {/* Seller Info Header (Identity + Regulatory) */}
        <div className="flex justify-between items-start">
          <div className="space-y-1 text-sm font-medium text-slate-800 text-left">
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Business Name</span><span>:</span><span className="font-bold text-slate-950">{invoice.seller?.shopName || invoice.seller?.name}</span>
            </div>

            {(invoice.seller?.phoneNo || invoice.seller?.email) && (
              <div className="grid grid-cols-[120px_10px_1fr]">
                <span>Contact</span><span>:</span><span className="font-semibold text-slate-950  text-[13px]">{invoice.seller?.phoneNo || invoice.seller?.email}</span>
              </div>
            )}

            {invoice.seller?.email && invoice.seller?.phoneNo && (
              <div className="grid grid-cols-[120px_10px_1fr]">
                <span>Email</span><span>:</span><span className="font-semibold text-slate-950 text-[13px]">{invoice.seller.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 text-sm font-medium text-slate-800 text-left min-w-[300px]">
            {invoice.seller?.gstNo && (
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="text-slate-500">GSTIN</span><span className="text-slate-400">:</span><span className="font-bold text-slate-950">{invoice.seller.gstNo}</span>
              </div>
            )}
            {(invoice.seller?.doorNo || invoice.seller?.streetName || invoice.seller?.landmark || invoice.seller?.area || invoice.seller?.city || invoice.seller?.state) && (
              <div className="grid grid-cols-[100px_10px_1fr]">
                <span className="text-slate-500">Address</span><span className="text-slate-400">:</span>
                <div>
                  <span className="font-semibold text-slate-950 leading-tight text-[13px] block">
                    {[
                      invoice.seller?.doorNo,
                      invoice.seller?.landmark,
                      invoice.seller?.streetName,
                      invoice.seller?.area
                    ].filter(Boolean).join(', ')}
                  </span>
                  <span className="font-bold text-slate-950 leading-tight text-[13px] block">
                    {[
                      invoice.seller?.city,
                      invoice.seller?.state ? `${invoice.seller.state} - ${invoice.seller.pincode || ''}` : null
                    ].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Bill To + Invoice Meta */}
      <div className="flex justify-between items-start mb-10 pr-12">
        <div className="space-y-4 text-left">
          <h3 className="text-sm font-bold text-slate-950 mb-2">Bill To:</h3>
          <div className="space-y-1 text-sm font-medium text-slate-800">
            <div className="grid grid-cols-[120px_10px_1fr]">
              <span>Customer Name</span><span>:</span><span className="font-bold text-slate-950 font-mono text-[13px]">{isB2B ? (invoice.customer?.company || invoice.customer?.name) : (invoice.customer?.name || 'Walk-in Customer')}</span>
            </div>
            {(invoice.customer?.taxId || invoice.customer?.gstNo) && (
              <div className="grid grid-cols-[120px_10px_1fr]">
                <span>Customer GSTIN</span><span>:</span><span className="font-bold text-slate-950 font-mono text-[13px]">{invoice.customer.taxId || invoice.customer.gstNo}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 ml-auto text-left min-w-[200px]">
          <h3 className="text-sm font-bold text-slate-950 mb-2">Invoice Details:</h3>
          <div className="space-y-1 text-sm font-medium text-slate-800">
            <div className="grid grid-cols-[100px_10px_1fr]">
              <span className="text-slate-500">Invoice No</span><span className="text-slate-400">:</span><span className="font-bold text-slate-950 font-mono text-[13px]">{invoice.invoiceNumber}</span>
            </div>
            <div className="grid grid-cols-[100px_10px_1fr]">
              <span className="text-slate-500">Invoice Date</span><span className="text-slate-400">:</span><span className="font-bold text-slate-950 font-mono text-[13px]">{formattedDate}</span>
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
          <h3 className="text-xs font-bold text-slate-950 uppercase mb-4">Tax Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">CGST </span>
              <span className="font-semibold text-slate-950">Rs.{(Number(invoice.totalGST || 0) / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">SGST </span>
              <span className="font-semibold text-slate-950">Rs.{(Number(invoice.totalGST || 0) / 2).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-950 uppercase mb-4">Total Breakdown</h3>
          <div className="space-y-4">
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span className="font-bold uppercase text-[10px]">Discount ({invoice.discountPercent}%)</span>
                <span className="font-bold">- Rs.{(invoice.discountAmount || 0).toFixed(2)}</span>
              </div>
            )}
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
      </div>

      {/* Footer */}
      <div className="mt-32 flex flex-col items-center">
        <div className="w-64 h-px bg-slate-200 mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Authorized Signatory</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Thank you for your Business. Visit again.</p>
        <p className="text-xs italic text-slate-300 mt-6 tracking-wide underline underline-offset-8">Invoice generated via INVOIZ Platform</p>
      </div>
    </div>
  )
}

/**
 * Shared PDF Generation Logic
 */
export const generateInvoicePDF = async (invoice) => {
  if (!invoice) return;

  // 1. Create a temporary hidden container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px'; // Consistent width for PDF
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // 2. Render the Preview component into the hidden div
    root.render(<InvoicePreview invoice={invoice} />);

    // 3. Wait for render and styles (essential for accurate capture)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Capture with html2canvas (target the specific element INSIDE the container)
    const element = container.querySelector('#invoice-preview');
    if (!element) throw new Error('Rendered element not found');

    // Remove UI-specific styles for a clean "Paper" look in the PDF
    const originalShadow = element.style.boxShadow;
    const originalBorder = element.style.border;
    const originalRadius = element.style.borderRadius;

    element.style.boxShadow = 'none';
    element.style.border = 'none';
    element.style.borderRadius = '0';
    element.style.padding = '40px'; // Consistent padding for PDF edges

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // 5. Build the PDF with DYNAMIC height
    const imgData = canvas.toDataURL('image/png');

    // Convert canvas pixels to mm (25.4mm = 96px normally, using scale 2 it's 192px)
    const pxToMm = 25.4 / 96;
    const pdfWidth = 210; // Standard A4 width
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Dynamic Height

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_${invoice.invoiceNumber}.pdf`);

  } catch (err) {
    console.error('PDF Generation Error:', err);
  } finally {
    // 6. Cleanup
    root.unmount();
    document.body.removeChild(container);
  }
}
