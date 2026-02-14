'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@/db/schema';

interface InvoicePrintProps {
  invoice: Invoice & { items: InvoiceItem[] };
}

export function InvoicePrint({ invoice }: InvoicePrintProps) {
  useEffect(() => {
    // Auto-trigger print on load (optional, user can also click button)
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden">
        <Button
          onClick={handlePrint}
          className="h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700"
          size="icon"
        >
          <Printer className="h-6 w-6" />
        </Button>
      </div>

      {/* Print-optimized invoice layout */}
      <div className="print-invoice mx-auto max-w-[8.5in] bg-white p-8 text-black text-[13px] leading-tight">

        {/* Company Header */}
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h1 className="text-2xl font-bold tracking-wide">CitiQuartz Atlanta INC</h1>
          <p className="text-sm">6654 Jimmy Carter Blvd STE B, Peachtree Corners, GA 30071</p>
          <p className="text-sm">Tel: 770-560-5858 / 770-618-9889</p>
          <p className="text-sm">Email: citiquartzatlanta@gmail.com</p>
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">INVOICE</h2>
        </div>

        {/* Invoice Info Row */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="space-y-1">
            <div><strong>Date:</strong> {formatDate(invoice.date)}</div>
            <div><strong>P.O. Number:</strong> {invoice.poNumber || '\u2014'}</div>
          </div>
          <div className="space-y-1 text-right">
            <div><strong>Invoice #:</strong> {invoice.invoiceNo}</div>
            <div><strong>Terms:</strong> {invoice.terms || '\u2014'}</div>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-4 mb-4 border border-black">
          <div className="p-3 border-r border-black">
            <p className="font-bold text-xs uppercase mb-1">Bill To:</p>
            <p className="font-semibold">{invoice.billToName || ''}</p>
            {invoice.billToContact && <p>{invoice.billToContact}</p>}
            {invoice.billToAddress && <p>{invoice.billToAddress}</p>}
            {invoice.billToPhone && <p>Tel: {invoice.billToPhone}</p>}
            {invoice.billToEmail && <p>{invoice.billToEmail}</p>}
          </div>
          <div className="p-3">
            <p className="font-bold text-xs uppercase mb-1">Ship To:</p>
            <p className="font-semibold">{invoice.shipToName || ''}</p>
            {invoice.shipToContact && <p>{invoice.shipToContact}</p>}
            {invoice.shipToAddress && <p>{invoice.shipToAddress}</p>}
            {invoice.shipToPhone && <p>Tel: {invoice.shipToPhone}</p>}
            {invoice.shipToEmail && <p>{invoice.shipToEmail}</p>}
          </div>
        </div>

        {/* Header fields row */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-sm border border-black p-2">
          <div><strong>Rep:</strong> {invoice.rep || ''}</div>
          <div><strong>Via:</strong> {invoice.via || ''}</div>
          <div><strong>Ship:</strong> {invoice.ship || ''}</div>
        </div>

        {/* Line Items Table */}
        <table className="w-full border-collapse border border-black mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left w-16">Qty</th>
              <th className="border border-black p-2 text-left w-28">Item Code</th>
              <th className="border border-black p-2 text-left">Description</th>
              <th className="border border-black p-2 text-right w-24">Price Each</th>
              <th className="border border-black p-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items
              .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((item) => (
              <tr key={item.id}>
                <td className="border border-black p-2">{item.quantity}</td>
                <td className="border border-black p-2 font-mono text-xs">{item.itemCode}</td>
                <td className="border border-black p-2">{item.description || ''}</td>
                <td className="border border-black p-2 text-right">${item.priceEach.toFixed(2)}</td>
                <td className="border border-black p-2 text-right font-semibold">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
            {/* Empty rows to fill space if less than ~10 items */}
            {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-2">&nbsp;</td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
                <td className="border border-black p-2"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={4} className="border border-black p-2 text-right">TOTAL:</td>
              <td className="border border-black p-2 text-right text-lg">${(invoice.total || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Remark */}
        {invoice.remark && (
          <div className="mb-4 text-sm">
            <strong>Remark:</strong> {invoice.remark}
          </div>
        )}

        {/* Payment Instructions */}
        <div className="border border-black p-3 mb-4">
          <p className="font-bold mb-1">Payment Instructions:</p>
          <p>Checks Payable To: <strong>CitiQuartz Atlanta INC</strong></p>
          <p>Zelle Payment: <strong>770-560-5858</strong></p>
        </div>

        {/* Terms & Conditions */}
        <div className="border border-black p-3 mb-4 text-xs">
          <p className="font-bold mb-2">Terms &amp; Conditions:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>All invoices are to be paid C.O.D. (Cash on Delivery).</li>
            <li>The customer must check ordered products while the driver is on-site. The company is not responsible for defects/damage once unloaded.</li>
            <li>The customer must check products before fabricating/cutting. The company is not responsible for defects/damage once fabricated.</li>
            <li>Returns are accepted within 15 days of delivery for Store Credit only (no refunds).</li>
            <li>All sale and discount orders are final (no returns/refunds).</li>
            <li>Actual slab color may vary from samples; the company reserves the right of final explanation.</li>
          </ol>
          <div className="mt-3 p-2 border-2 border-black bg-yellow-50 text-center font-bold text-sm">
            REMOVE THE PLASTIC AND INSPECT THIS MATERIAL BEFORE YOU CUT.
          </div>
        </div>

        {/* Received By */}
        <div className="border border-black p-3">
          <p className="font-bold mb-3">Received By:</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-6">Signature: ______________________________</p>
              <p>Print: ______________________________</p>
            </div>
            <div>
              <p className="mb-6">Date: ______________________________</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.4in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide everything except the invoice content */
          body * {
            visibility: hidden;
          }
          .print-invoice,
          .print-invoice * {
            visibility: visible;
          }
          .print-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            max-width: 100% !important;
          }
          nav, header, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
