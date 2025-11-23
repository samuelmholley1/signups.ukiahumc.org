'use client';

import { useState } from 'react';

// Helper function to determine stock level
function getStockLevel(quantity: number): 'critical' | 'low' | 'adequate' {
  if (quantity <= 5) return 'critical';
  if (quantity <= 10) return 'low';
  return 'adequate';
}

// Helper function to get stock color classes
function getStockColorClass(quantity: number): string {
  const level = getStockLevel(quantity);
  if (level === 'critical') return 'bg-red-50 border-l-4 border-red-500 print:!bg-red-100 print:!border-red-500';
  if (level === 'low') return 'bg-yellow-50 border-l-4 border-yellow-500 print:!bg-yellow-100 print:!border-yellow-500';
  if (quantity > 20) return 'bg-green-50 border-l-4 border-green-500 print:!bg-green-100 print:!border-green-500';
  return '';
}

// Inventory data structures
const runningTotals = {
  'Beans & Grains': [
    { item: 'Pinto beans', unit: 'cans', quantity: 45, notes: '' },
    { item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 49, notes: '' },
    { item: 'Lentils', unit: 'bags', quantity: 55, notes: '' },
    { item: 'Split peas', unit: 'bags', quantity: 35, notes: '' },
    { item: 'Rice', unit: 'bags', quantity: 3, notes: '' },
  ],
  'Nuts': [
    { item: 'Almonds', unit: 'bags', quantity: 10, notes: '' },
    { item: 'Walnuts', unit: 'bags', quantity: 1, notes: '' },
  ],
  'Dried Fruit': [
    { item: 'Raisins', unit: 'bags', quantity: 20, notes: '' },
  ],
  'Shelf-Stable / Canned Items': [
    { item: 'Applesauce', unit: 'cans/cups', quantity: 24, notes: '' },
    { item: 'Fruit mix', unit: 'cans', quantity: 4, notes: '' },
    { item: 'Carrots', unit: 'cans', quantity: 1, notes: '' },
    { item: 'Cream of chicken soup', unit: 'cans', quantity: 2, notes: '' },
    { item: 'Salmon', unit: 'cans', quantity: 2, notes: '' },
  ],
  'Baby Food & Pasta': [
    { item: 'Baby food mini jars', unit: 'jars', quantity: 7, notes: '' },
    { item: 'Rotini dry pasta', unit: 'boxes', quantity: 1, notes: '' },
  ],
  'Other Pantry / Non-Food': [
    { item: 'Chex cereal', unit: 'boxes', quantity: 1, notes: '' },
    { item: 'Toothpaste', unit: 'tubes', quantity: 4, notes: '' },
    { item: 'Overdose rescue kit', unit: 'kits', quantity: 1, notes: '' },
    { item: 'Military can openers', unit: 'each', quantity: 5, notes: '' },
  ],
};

const boxContents = [
  { box: 1, date: '11/22/25', item: 'Pinto beans', unit: 'cans', quantity: 24, notes: '' },
  { box: 2, date: '11/22/25', item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 19, notes: '' },
  { box: 3, date: '11/22/25', item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 21, notes: '' },
  { box: 4, date: '11/22/25', item: 'Lentils', unit: 'bags', quantity: 15, notes: '' },
  { box: 5, date: '11/22/25', item: 'Split peas', unit: 'bags', quantity: 15, notes: '' },
  { box: 6, date: '11/22/25', item: 'Raisins', unit: 'bags', quantity: 20, notes: '' },
  { box: 7, date: '11/22/25', item: 'Almonds', unit: 'bags', quantity: 9, notes: '' },
  { box: 8, date: '11/22/25', item: 'Lentils', unit: 'bags', quantity: 14, notes: '' },
  { box: 9, date: '11/22/25', item: 'Lentils', unit: 'bags', quantity: 26, notes: '' },
  { box: 10, date: '11/22/25', item: 'Split peas', unit: 'bags', quantity: 10, notes: '' },
  { box: 10, date: '11/22/25', item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 6, notes: '' },
  { box: 11, date: '11/22/25', item: 'Applesauce cups', unit: 'cups', quantity: 19, notes: '' },
  { box: 11, date: '11/22/25', item: 'Applesauce', unit: 'cans', quantity: 5, notes: '' },
  { box: 11, date: '11/22/25', item: 'Fruit mix', unit: 'cans', quantity: 4, notes: '' },
  { box: 11, date: '11/22/25', item: 'Carrots', unit: 'cans', quantity: 1, notes: '' },
  { box: 11, date: '11/22/25', item: 'Baby food mini jars', unit: 'jars', quantity: 7, notes: '' },
  { box: 11, date: '11/22/25', item: 'Rotini dry pasta', unit: 'boxes', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Pinto beans', unit: 'cans', quantity: 14, notes: '' },
  { box: 12, date: '11/22/25', item: 'Chex cereal', unit: 'boxes', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Overdose rescue kit', unit: 'kits', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Military can openers', unit: 'each', quantity: 5, notes: '' },
  { box: 13, date: '11/22/25', item: 'Rice', unit: 'bags', quantity: 3, notes: '' },
  { box: 13, date: '11/22/25', item: 'Split peas', unit: 'bags', quantity: 10, notes: '' },
  { box: 13, date: '11/22/25', item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 3, notes: '' },
  { box: 14, date: '11/22/25', item: 'Pinto beans', unit: 'cans', quantity: 7, notes: '' },
  { box: 14, date: '11/22/25', item: 'Cream of chicken soup', unit: 'cans', quantity: 2, notes: '' },
  { box: 14, date: '11/22/25', item: 'Salmon', unit: 'cans', quantity: 2, notes: '' },
  { box: 14, date: '11/22/25', item: 'Toothpaste', unit: 'tubes', quantity: 4, notes: '' },
  { box: 14, date: '11/22/25', item: 'Almonds', unit: 'bags', quantity: 1, notes: '' },
  { box: 14, date: '11/22/25', item: 'Walnuts', unit: 'bags', quantity: 1, notes: '' },
];

const miscellaneous = {
  perishables: [
    'Crate of green apples',
    'Bag of carrots',
    'Shopping bag of oranges',
    'Shopping bag of red pears',
    'Large bag of red onions',
  ],
  other: [
    'Open box of dog biscuits (bone-shaped treats)',
    'Large "rice" sack filled with assorted Ziploc bags of beans (contents not yet inventoried)',
  ],
};

// CSV generation functions
function generateRunningTotalsCSV() {
  let csv = 'Category,Item,Unit,Quantity,Notes\n';
  Object.entries(runningTotals).forEach(([category, items]) => {
    items.forEach(item => {
      csv += `"${category}","${item.item}","${item.unit}",${item.quantity},"${item.notes}"\n`;
    });
  });
  return csv;
}

function generateBoxContentsCSV() {
  let csv = 'Box #,Date,Item,Unit,Quantity,Notes\n';
  boxContents.forEach(box => {
    csv += `${box.box},"${box.date}","${box.item}","${box.unit}",${box.quantity},"${box.notes}"\n`;
  });
  return csv;
}

function generateMiscellaneousCSV() {
  let csv = 'Category,Item\n';
  miscellaneous.perishables.forEach(item => {
    csv += `"Perishable Produce","${item}"\n`;
  });
  miscellaneous.other.forEach(item => {
    csv += `"Other Miscellaneous","${item}"\n`;
  });
  return csv;
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function InventoryPage() {
  // Debug logging
  console.log('[Inventory] Page component mounted')
  console.log('[Inventory] Location:', typeof window !== 'undefined' ? window.location.pathname : 'SSR')
  
  // Get box locations for items
  const getBoxLocations = (itemName: string): number[] => {
    // Remove parentheses and normalize for better matching
    const normalized = itemName.toLowerCase()
      .replace(/\(.*?\)/g, '') // Remove anything in parentheses
      .replace(/\s+/g, ' ')
      .trim();
    
    const boxes = boxContents
      .filter(box => {
        const boxItemNormalized = box.item.toLowerCase()
          .replace(/\(.*?\)/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Special case: "Applesauce" should match both "Applesauce" and "Applesauce cups"
        if (normalized === 'applesauce' && boxItemNormalized.includes('applesauce')) {
          return true;
        }
        
        // Match if either contains the other, or if they're very similar
        return boxItemNormalized === normalized || 
               boxItemNormalized.includes(normalized) || 
               normalized.includes(boxItemNormalized);
      })
      .map(box => box.box);
    return Array.from(new Set(boxes)).sort((a, b) => a - b);
  };

  // Flatten all items and sort by quantity (lowest to highest)
  const allItemsSorted = Object.entries(runningTotals)
    .flatMap(([category, items]) => 
      items.map(item => ({ ...item, category }))
    )
    .sort((a, b) => a.quantity - b.quantity);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}} />
      <div className="min-h-screen bg-gray-50 print:bg-white">
        {/* Header - hidden when printing */}
        <div className="print:hidden bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Pantry Inventory</h1>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Print / Save as PDF
              </button>
              <button
                onClick={() => {
                  downloadCSV('running-totals.csv', generateRunningTotalsCSV());
                  downloadCSV('box-contents.csv', generateBoxContentsCSV());
                  downloadCSV('miscellaneous.csv', generateMiscellaneousCSV());
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Download All CSVs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:max-w-full print:px-4 print:py-2">
        {/* Print Header */}
        <div className="hidden print:block mb-3">
          <div className="flex items-center justify-between">
            <img 
              src="/logo-for-church-larger.jpg" 
              alt="UUMC Logo" 
              className="h-16 w-auto object-contain"
            />
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-gray-900 mb-1">Center for Hope Pantry Inventory</h1>
              <p className="text-sm text-gray-700 mb-0.5">Food Left Over After 11/22/25 Distribution</p>
              <p className="text-sm text-gray-600">Ukiah United Methodist Church – Center for Hope</p>
            </div>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Section 1: All Items with Box Locations */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 print:shadow-none print:mb-3 print:p-2">
          <div className="flex justify-between items-center mb-4 print:mb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-base">Inventory (Sorted by Quantity: Low to High)</h2>
            <button
              onClick={() => downloadCSV('running-totals.csv', generateRunningTotalsCSV())}
              className="print:hidden px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Box Location(s)</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Category</th>
                </tr>
              </thead>
              <tbody>
                {allItemsSorted.map((item, idx) => {
                  const boxes = getBoxLocations(item.item);
                  const stockColorClass = getStockColorClass(item.quantity);
                  const itemWithUnit = `${item.item} (${item.unit})`;
                  return (
                    <tr key={idx} className={`${stockColorClass} hover:bg-gray-50 print:hover:bg-transparent`}>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px] print:leading-tight">{itemWithUnit}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-base font-bold print:px-1 print:py-0.5 print:text-[10px]">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px] print:leading-tight">
                        {boxes.length > 0 ? (
                          <span className="inline-flex gap-1 flex-wrap">
                            {boxes.map(boxNum => (
                              <span key={boxNum} className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs print:px-1 print:py-0 print:text-[8px]">
                                Box {boxNum}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs print:text-[8px]">See misc.</span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px] print:leading-tight">{item.category}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Miscellaneous & Perishables */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 print:shadow-none print:mb-3 print:p-2 print:break-after-page">
          <div className="flex justify-between items-center mb-4 print:mb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-base">Miscellaneous & Perishables</h2>
            <button
              onClick={() => downloadCSV('miscellaneous.csv', generateMiscellaneousCSV())}
              className="print:hidden px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download CSV
            </button>
          </div>

          <div className="mb-4 print:mb-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 print:text-sm">Perishable Produce</h3>
            <p className="text-sm text-gray-600 italic mb-2 print:text-[9px] print:mb-1">(May be used by Center for Hope during the week)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 print:space-y-0">
              {miscellaneous.perishables.map((item, idx) => (
                <li key={idx} className="text-sm print:text-[9px] print:leading-tight">{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2 print:text-sm">Other Miscellaneous Items</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700 print:space-y-0">
              {miscellaneous.other.map((item, idx) => (
                <li key={idx} className="text-sm print:text-[9px] print:leading-tight">{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 3: Box-by-Box Contents */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 print:shadow-none print:mb-3 print:p-2">
          <div className="flex justify-between items-center mb-4 print:mb-2">
            <h2 className="text-2xl font-bold text-gray-900 print:text-base">Box-by-Box Contents</h2>
            <button
              onClick={() => downloadCSV('box-contents.csv', generateBoxContentsCSV())}
              className="print:hidden px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Box #</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-1 print:py-0.5 print:text-[10px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Group items by box number
                  const boxGroups = boxContents.reduce((acc, item) => {
                    if (!acc[item.box]) acc[item.box] = [];
                    acc[item.box].push(item);
                    return acc;
                  }, {} as Record<number, typeof boxContents>);

                  const sortedBoxNumbers = Object.keys(boxGroups).map(Number).sort((a, b) => a - b);
                  
                  return sortedBoxNumbers.map((boxNum, boxIdx) => {
                    const items = boxGroups[boxNum];
                    const isEvenBox = boxIdx % 2 === 0;
                    const bgColor = isEvenBox ? 'bg-gray-200 print:!bg-gray-200' : 'bg-white print:!bg-white';
                    
                    return items.map((item, itemIdx) => (
                      <tr key={`${boxNum}-${itemIdx}`} className={`${bgColor} hover:opacity-80 print:hover:opacity-100`}>
                        {itemIdx === 0 ? (
                          <>
                            <td 
                              rowSpan={items.length}
                              className="border border-gray-300 px-4 py-2 text-sm font-bold print:px-1 print:py-0.5 print:text-[10px] align-top"
                            >
                              {boxNum}
                            </td>
                            <td 
                              rowSpan={items.length}
                              className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px] align-top"
                            >
                              {item.date}
                            </td>
                          </>
                        ) : null}
                        <td className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px] print:leading-tight">{item.item} ({item.unit})</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm font-medium print:px-1 print:py-0.5 print:text-[10px]">{item.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm print:px-1 print:py-0.5 print:text-[9px]">{item.notes}</td>
                      </tr>
                    ));
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>
    </>
  );
}
