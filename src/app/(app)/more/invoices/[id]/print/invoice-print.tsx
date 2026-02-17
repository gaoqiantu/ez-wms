'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@/db/schema';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  paymentInfo: string;
}

interface InvoicePrintProps {
  invoice: Invoice & { items: InvoiceItem[] };
  companyInfo: CompanyInfo;
}

export function InvoicePrint({ invoice, companyInfo }: InvoicePrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const sortedItems = [...invoice.items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const emptyRowCount = Math.max(0, 11 - sortedItems.length);

  const paymentLines = (companyInfo.paymentInfo || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const termsLines = [
    '1. All invoices are to be paid C.O.D.',
    '2. It is customer\'s obligation to check ordered products while driver is on site. Once unloaded, CitiQuartz Atlanta is not responsible for defected or damaged slab.',
    '3. It is customer\'s obligation to check ordered products before fabricate/cut. Once fabricated, CitiQuartz Atlanta is not responsible for defected or damaged slab.',
    '4. Returns will only be accepted within 15 days from the date of delivery. Store credit will be issued to the relevant account, absolutely no refund.',
    '5. All on sale and discount orders are final, no return and no refund.',
    '6. Actual slab may vary in color from the sample, CitiQuartz Atlanta reserves all rights of final explanation.',
  ];

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-6 z-50 print:hidden sm:bottom-6">
        <Button
          onClick={handlePrint}
          className="h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700"
          size="icon"
        >
          <Printer className="h-6 w-6" />
        </Button>
      </div>

      <div className="print-invoice mx-auto max-w-[8.5in] bg-white p-5 text-black text-[12px] leading-tight">
        <div className="mb-3 grid grid-cols-[1.4fr_0.9fr] gap-4">
          <div className="grid grid-cols-[88px_1fr] gap-3">
            <div className="flex flex-col items-center justify-center border border-gray-300 p-2 text-center">
              <div className="text-[18px] font-bold leading-none">CQ</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider">CitiQuartz</div>
            </div>
            <div>
              <div className="text-[34px] font-semibold leading-none">{companyInfo.name}</div>
              {companyInfo.address && <div className="mt-1 text-[12px]">{companyInfo.address}</div>}
              {companyInfo.phone && <div className="text-[12px]">Tel: {companyInfo.phone}</div>}
              {companyInfo.email && <div className="text-[12px]">Email: {companyInfo.email}</div>}
            </div>
          </div>
          <div>
            <div className="mb-2 text-right text-[48px] font-semibold leading-none">Invoice</div>
            <table className="w-full border-collapse border border-gray-500 text-center text-[12px]">
              <thead>
                <tr>
                  <th className="border border-gray-500 py-1 font-medium">Date</th>
                  <th className="border border-gray-500 py-1 font-medium">Invoice #</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="h-9 border border-gray-500 px-1">{formatDate(invoice.date)}</td>
                  <td className="h-9 border border-gray-500 px-1">{invoice.invoiceNo}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-4">
          <div className="border border-gray-500">
            <div className="border-b border-gray-500 px-2 py-1 text-[12px] font-medium">Bill To</div>
            <div className="min-h-[108px] space-y-1 p-2 text-[11px]">
              <div className="font-semibold">{invoice.billToName || ''}</div>
              {invoice.billToContact && <div>{invoice.billToContact}</div>}
              {invoice.billToAddress && <div>{invoice.billToAddress}</div>}
              {invoice.billToPhone && <div>{invoice.billToPhone}</div>}
              {invoice.billToEmail && <div>{invoice.billToEmail}</div>}
            </div>
          </div>
          <div className="border border-gray-500">
            <div className="border-b border-gray-500 px-2 py-1 text-[12px] font-medium">Ship To</div>
            <div className="min-h-[108px] space-y-1 p-2 text-[11px]">
              <div className="font-semibold">{invoice.shipToName || ''}</div>
              {invoice.shipToContact && <div>{invoice.shipToContact}</div>}
              {invoice.shipToAddress && <div>{invoice.shipToAddress}</div>}
              {invoice.shipToPhone && <div>{invoice.shipToPhone}</div>}
              {invoice.shipToEmail && <div>{invoice.shipToEmail}</div>}
            </div>
          </div>
        </div>

        <table className="mb-2 w-full border-collapse border border-gray-500 text-[12px]">
          <thead>
            <tr>
              <th className="border border-gray-500 px-2 py-1 font-medium">P.O. Number</th>
              <th className="border border-gray-500 px-2 py-1 font-medium">Terms</th>
              <th className="border border-gray-500 px-2 py-1 font-medium">Rep</th>
              <th className="border border-gray-500 px-2 py-1 font-medium">Via</th>
              <th className="border border-gray-500 px-2 py-1 font-medium">Ship</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="h-9 border border-gray-500 px-2">{invoice.poNumber || ''}</td>
              <td className="h-9 border border-gray-500 px-2">{invoice.terms || ''}</td>
              <td className="h-9 border border-gray-500 px-2">{invoice.rep || ''}</td>
              <td className="h-9 border border-gray-500 px-2">{invoice.via || ''}</td>
              <td className="h-9 border border-gray-500 px-2">{invoice.ship || ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full border-collapse border border-gray-500 text-[12px]">
          <thead>
            <tr>
              <th className="w-[11%] border border-gray-500 px-2 py-1 text-left font-medium">Quantity</th>
              <th className="w-[16%] border border-gray-500 px-2 py-1 text-left font-medium">Item Code</th>
              <th className="w-[43%] border border-gray-500 px-2 py-1 text-left font-medium">Description</th>
              <th className="w-[15%] border border-gray-500 px-2 py-1 text-left font-medium">Price Each</th>
              <th className="w-[15%] border border-gray-500 px-2 py-1 text-left font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-500 px-2 py-1 align-top">{item.quantity}</td>
                <td className="border border-gray-500 px-2 py-1 align-top font-mono">{item.itemCode}</td>
                <td className="border border-gray-500 px-2 py-1 align-top">{item.description || ''}</td>
                <td className="border border-gray-500 px-2 py-1 align-top">${item.priceEach.toFixed(2)}</td>
                <td className="border border-gray-500 px-2 py-1 align-top">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRowCount }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="h-8 border border-gray-500 px-2 py-1">&nbsp;</td>
                <td className="border border-gray-500 px-2 py-1"></td>
                <td className="border border-gray-500 px-2 py-1"></td>
                <td className="border border-gray-500 px-2 py-1"></td>
                <td className="border border-gray-500 px-2 py-1"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-gray-500 px-2 py-1"></td>
              <td className="border border-gray-500 px-2 py-1"></td>
              <td className="border border-gray-500 px-2 py-1"></td>
              <td className="border border-gray-500 px-2 py-1 font-semibold">Total</td>
              <td className="border border-gray-500 px-2 py-1 font-semibold">${(invoice.total || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-2 grid grid-cols-[1fr_0.45fr] gap-6">
          <div>
            {paymentLines.length > 0 && (
              <div className="mb-2 space-y-1 text-[11px]">
                {paymentLines.map((line, i) => (
                  <p key={i} className="font-semibold">{line}</p>
                ))}
              </div>
            )}
            <div className="text-[11px]">
              <p className="mb-1 text-[12px] font-semibold">Terms &amp; Condition:</p>
              {termsLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="mt-1 font-semibold">
                REMOVE THE PLASTIC AND INSPECT THIS MATERIAL BEFORE YOU CUT.
              </p>
            </div>
          </div>
          <div className="pt-10 text-[12px]">
            <p className="mb-2 text-[12px]">Received By:</p>
            <p className="mb-4">Print: ________________________</p>
            <p className="mb-4">Signature: ________________________</p>
            <p>Date: ________________________</p>
          </div>
        </div>

        {invoice.remark && (
          <div className="mt-3 border-t border-gray-300 pt-2 text-[11px]">
            <span className="font-semibold">Remark:</span> {invoice.remark}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.35in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
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
          nav,
          header,
          footer,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
