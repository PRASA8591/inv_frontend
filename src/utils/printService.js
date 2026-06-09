/**
 * Premium Print Spool Utility for PrasaTek Enterprise Framework.
 * Supports targeted document generation for POS Receipts, B2B Invoices, POs, and GRNs.
 */

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    color: #1e293b;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
  table { width: 100%; border-collapse: collapse; }
  th { background-color: #f1f5f9 !important; color: #475569; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; padding: 10px; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: bold; }
  .font-black { font-weight: 900; }
  .text-xs { font-size: 10px; }
  .mt-4 { margin-top: 16px; }
  .mb-4 { margin-bottom: 16px; }
  .badge { display: inline-block; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
`;

// Internal execution mechanism
const executeIframePrint = (htmlContent) => {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();
  
  const images = doc.getElementsByTagName('img');
  let loadedCount = 0;
  const totalImages = images.length;
  
  const doPrint = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    
    // Remove the iframe from the DOM after printing completes or is closed
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };

  if (totalImages === 0) {
    setTimeout(doPrint, 500);
  } else {
    let triggered = false;
    const triggerPrint = () => {
      if (!triggered) {
        triggered = true;
        doPrint();
      }
    };

    for (let i = 0; i < totalImages; i++) {
      if (images[i].complete) {
        loadedCount++;
        if (loadedCount === totalImages) {
          setTimeout(triggerPrint, 300);
        }
      } else {
        images[i].onload = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            setTimeout(triggerPrint, 300);
          }
        };
        images[i].onerror = () => {
          loadedCount++;
          if (loadedCount === totalImages) {
            setTimeout(triggerPrint, 300);
          }
        };
      }
    }
    // Safety timeout in case load listener fails or hangs
    setTimeout(triggerPrint, 2500);
  }
};

export const printService = {
  /**
   * POS Receipt - 80mm Thermal Style
   */
  posReceipt: (bill, settings = { companyName: 'PRASATEK RETAIL', currencySymbol: 'Rs.', address: '', mobile: '', email: '' }) => {
    const billSerial = bill.billSerial || bill.serial || (bill._id && bill._id.substring(0, 10)) || 'N/A';
    const html = `
      <html>
      <head>
        <style>
          ${baseStyles}
          body {
            width: 80mm;
            padding: 5mm;
            margin: 0 auto;
            font-size: 11px;
          }
          .header-title { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          td, th { padding: 4px 0; font-size: 11px; border: 0; }
          th { background: none !important; text-align: left; border-bottom: 1px solid #000; }
        </style>
      </head>
      <body>
        <div class="text-center">
          ${settings.shopLogo ? `<img src="${settings.shopLogo}" style="max-width: 40mm; max-height: 15mm; object-fit: contain; margin-bottom: 6px;" /><br/>` : ''}
          <div class="header-title">${settings.companyName || 'PRASATEK'}</div>
          <div class="text-xs font-bold">${settings.address || 'RETAIL OUTLET'}</div>
          ${settings.mobile ? `<div class="text-xs">Tel: ${settings.mobile}</div>` : ''}
          ${settings.email ? `<div class="text-xs">${settings.email}</div>` : ''}
          <div class="text-xs font-mono mt-4">#${billSerial}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="font-mono text-xs">
          <div>DATE: ${new Date(bill.createdAt || Date.now()).toLocaleString()}</div>
          <div>CUST: ${bill.customerName || bill.customer || 'WALK-IN'}</div>
          <div>CASHIER: ${bill.soldBy?.username || bill.cashier || 'SYSTEM'}</div>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th class="text-center">QTY</th>
              <th class="text-right">RATE</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody class="font-mono">
            ${(bill.items || []).map(item => {
              const qty = item.cartQuantity || item.quantity || 0;
              const price = item.price || 0;
              const subtotal = item.subtotal || (price * qty);
              return `
                <tr>
                  <td style="max-width: 35mm; word-wrap: break-word;">${item.name || 'Item'}</td>
                  <td class="text-center">${qty}</td>
                  <td class="text-right">${parseFloat(price).toFixed(2)}</td>
                  <td class="text-right">${parseFloat(subtotal).toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="font-mono" style="font-size: 12px; font-weight: bold;">
          <div style="display:flex; justify-content:space-between;"><span>SUBTOTAL:</span><span>${settings.currencySymbol} ${parseFloat(bill.subtotal || bill.totalAmount || 0).toFixed(2)}</span></div>
          ${bill.tax > 0 ? `<div style="display:flex; justify-content:space-between;"><span>TAXES:</span><span>${settings.currencySymbol} ${parseFloat(bill.tax).toFixed(2)}</span></div>` : ''}
          ${bill.discount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>DISCOUNTS:</span><span>-${settings.currencySymbol} ${parseFloat(bill.discount).toFixed(2)}</span></div>` : ''}
          <div style="display:flex; justify-content:space-between; font-size: 14px; border-top: 1px double #000; padding-top: 4px;" class="font-black">
            <span>GRAND TOTAL:</span>
            <span>${settings.currencySymbol} ${parseFloat(bill.grandTotal || bill.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        <div class="text-center mt-4" style="font-size: 9px; font-family: 'Inter'; font-weight: 600;">
          THANK YOU FOR SHOPPING WITH US<br/>
          POS TERMINAL
        </div>
      </body>
      </html>
    `;
    executeIframePrint(html);
  },

  /**
   * A4 Layout for Formal Documents (Invoice, PO, GRN)
   */
  a4Document: ({
    title = 'DOCUMENT',
    docNumber = 'N/A',
    date = new Date().toLocaleDateString(),
    partyLabel = 'TO',
    partyDetails = {},
    items = [],
    summaryFields = [],
    notes = '',
    badge = null,
    badgeColor = 'bg-slate-100 text-slate-800',
    settings = { currencySymbol: 'Rs.', companyName: 'PRASATEK CORE', address: '', mobile: '', email: '' }
  }) => {
    const html = `
      <html>
      <head>
        <style>
          ${baseStyles}
          body { padding: 20mm; font-size: 12px; }
          .header-table td { border: 0; padding: 0; vertical-align: top; }
          .logo-area { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #2563eb; }
          .doc-title { font-size: 20px; font-weight: 800; text-align: right; text-transform: uppercase; color: #0f172a; }
          .card { background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px; }
          .summary-box { background-color: #0f172a; color: white; padding: 15px; border-radius: 8px; }
          .summary-box table td { border: 0; color: rgba(255, 255, 255, 0.7); }
          .summary-box .grand-total { font-size: 18px; color: white; font-weight: 900; border-top: 1px dashed rgba(255,255,255,0.2); padding-top: 10px; margin-top: 10px; }
          .badge-print { padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <!-- Top Bar -->
        <table class="header-table mb-4">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                ${settings.shopLogo ? `
                  <img src="${settings.shopLogo}" style="max-height: 55px; max-width: 200px; object-fit: contain;" />
                ` : ''}
                <div class="logo-area">${settings.companyName?.split(' ')[0] || 'PRASATEK'}<span style="color:#0f172a">${settings.companyName?.split(' ').slice(1).join(' ') || 'CORE'}</span></div>
              </div>
              <div class="text-xs mt-4 font-bold text-slate-500">ENTERPRISE INTELLIGENCE SUITE</div>
              <div class="text-xs font-mono">OPERATIONS CENTER</div>
            </td>
            <td class="text-right">
              <div class="doc-title">${title}</div>
              <div class="font-mono font-bold mt-4" style="font-size:14px;">REF #: ${docNumber}</div>
              <div class="text-slate-500 font-medium mt-4">Date: ${date}</div>
              ${badge ? `<div class="mt-4"><span class="badge-print">${badge}</span></div>` : ''}
            </td>
          </tr>
        </table>
        
        <hr style="border:0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        
        <!-- Party block -->
        <table class="header-table mb-4" style="margin-bottom: 30px;">
          <tr>
            <td style="width: 50%;">
              <div class="card">
                <div class="font-black uppercase tracking-wide text-slate-400 text-xs" style="margin-bottom: 8px;">${partyLabel}</div>
                <div class="font-bold text-slate-800" style="font-size: 14px;">${partyDetails.name || '--'}</div>
                ${partyDetails.email ? `<div style="margin-top:4px;">Email: ${partyDetails.email}</div>` : ''}
                ${partyDetails.phone ? `<div style="margin-top:4px;">Phone: ${partyDetails.phone}</div>` : ''}
                ${partyDetails.address ? `<div style="margin-top:4px;">Address: ${partyDetails.address}</div>` : ''}
              </div>
            </td>
            <td style="width: 50%; text-align: right; padding-left: 20px;">
              <div class="text-slate-500 font-semibold uppercase">${settings.companyName || 'PRASATEK'}</div>
              <div>${settings.address || ''}</div>
              ${settings.mobile ? `<div>Tel: ${settings.mobile}</div>` : ''}
              ${settings.email ? `<div>Email: ${settings.email}</div>` : ''}
            </td>
          </tr>
        </table>
        
        <!-- Items grid -->
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item Description</th>
              <th class="text-center">Qty / Units</th>
              <th class="text-right">Rate</th>
              ${items.some(i => i.tax !== undefined) ? '<th class="text-right">Tax %</th>' : ''}
              <th class="text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, index) => `
              <tr>
                <td class="font-mono text-slate-400">${index + 1}</td>
                <td>
                  <div class="font-bold text-slate-800">${item.name}</div>
                  ${item.sku ? `<div class="text-xs text-slate-400 font-mono">SKU: ${item.sku}</div>` : ''}
                  ${item.batch ? `<div class="text-xs text-slate-400 font-mono">BATCH: ${item.batch} ${item.expiry ? `| EXP: ${item.expiry}` : ''}</div>` : ''}
                  ${item.costPrice ? `<div class="text-xs text-slate-500 font-mono">Cost Price: ${settings.currencySymbol || 'Rs.'}${parseFloat(item.costPrice).toFixed(2)}</div>` : ''}
                </td>
                <td class="text-center font-bold font-mono">${item.qty}</td>
                <td class="text-right font-mono">${(item.price).toFixed(2)}</td>
                ${item.tax !== undefined ? `<td class="text-right font-mono">${item.tax}%</td>` : ''}
                <td class="text-right font-black font-mono">${(item.total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Rollup summary and notes -->
        <table class="header-table mt-4" style="margin-top: 40px;">
          <tr>
            <td style="width: 60%; padding-right: 30px;">
              ${notes ? `
                <div class="font-bold text-slate-400 uppercase text-xs mb-4">Important Terms / Remarks</div>
                <div class="card text-slate-600" style="font-size: 11px; line-height: 1.5;">${notes}</div>
              ` : ''}
            </td>
            <td style="width: 40%;">
              <div class="summary-box">
                <table style="width:100%;">
                  ${summaryFields.map(f => `
                    <tr class="${f.isGrand ? 'grand-total' : ''}">
                      <td style="${f.isGrand ? 'color:white; font-weight:900;' : ''}">${f.label}</td>
                      <td class="text-right" style="font-family:'JetBrains Mono'; ${f.isGrand ? 'color:white; font-weight:900;' : ''}">${settings.currencySymbol} ${parseFloat(f.value || 0).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Authorization signatures -->
        <table class="header-table" style="margin-top: 60px; border:0;">
          <tr>
            <td style="text-align: center; padding: 10px; width: 33%;">
              <div style="border-bottom: 1px dashed #cbd5e1; height: 30px; width: 70%; margin: 0 auto;"></div>
              <div class="text-xs font-bold text-slate-500 uppercase mt-4">Prepared By</div>
            </td>
            <td style="text-align: center; padding: 10px; width: 33%;">
              <div style="border-bottom: 1px dashed #cbd5e1; height: 30px; width: 70%; margin: 0 auto;"></div>
              <div class="text-xs font-bold text-slate-500 uppercase mt-4">Verified Security</div>
            </td>
            <td style="text-align: center; padding: 10px; width: 33%;">
              <div style="border-bottom: 1px dashed #cbd5e1; height: 30px; width: 70%; margin: 0 auto;"></div>
              <div class="text-xs font-bold text-slate-500 uppercase mt-4">Executive Approval</div>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <div class="text-center text-xs text-slate-400 font-mono mt-4" style="position: fixed; bottom: 10mm; left: 0; width: 100%;">
          GENERATED SECURELY VIA PRASATEK ERP CORE • IP SECURE COMPLIANCE AUDITED
        </div>
      </body>
      </html>
    `;
    executeIframePrint(html);
  }
};
