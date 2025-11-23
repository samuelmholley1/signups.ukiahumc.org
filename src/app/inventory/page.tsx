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
  if (level === 'critical') return 'bg-red-50 border-l-4 border-red-500';
  if (level === 'low') return 'bg-yellow-50 border-l-4 border-yellow-500';
  return '';
}

// Inventory data structures
const runningTotals = {
  'Beans & Grains': [
    { item: 'Canned pinto beans', unit: 'cans', quantity: 45, notes: '' },
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
    { item: 'Applesauce (cups)', unit: 'cups', quantity: 19, notes: '' },
    { item: 'Applesauce (canned)', unit: 'cans', quantity: 5, notes: '' },
    { item: 'Fruit mix (canned)', unit: 'cans', quantity: 4, notes: '' },
    { item: 'Carrots (canned)', unit: 'cans', quantity: 1, notes: '' },
    { item: 'Cream of chicken soup', unit: 'cans', quantity: 2, notes: '' },
    { item: 'Salmon (canned)', unit: 'cans', quantity: 2, notes: '' },
  ],
  'Baby Food & Pasta': [
    { item: 'Baby food mini jars', unit: 'jars', quantity: 7, notes: '' },
    { item: 'Rotini (dry pasta)', unit: 'boxes', quantity: 1, notes: '' },
  ],
  'Other Pantry / Non-Food': [
    { item: 'Chex cereal', unit: 'boxes', quantity: 1, notes: '' },
    { item: 'Toothpaste', unit: 'tubes', quantity: 4, notes: '' },
    { item: 'Overdose rescue kit', unit: 'kits', quantity: 1, notes: '' },
    { item: 'Military can openers', unit: 'each', quantity: 5, notes: '' },
  ],
};

const boxContents = [
  { box: 1, date: '11/22/25', item: 'Canned pinto beans', unit: 'cans', quantity: 24, notes: '' },
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
  { box: 11, date: '11/22/25', item: 'Applesauce (canned)', unit: 'cans', quantity: 5, notes: '' },
  { box: 11, date: '11/22/25', item: 'Fruit mix (canned)', unit: 'cans', quantity: 4, notes: '' },
  { box: 11, date: '11/22/25', item: 'Carrots (canned)', unit: 'cans', quantity: 1, notes: '' },
  { box: 11, date: '11/22/25', item: 'Baby food mini jars', unit: 'jars', quantity: 7, notes: '' },
  { box: 11, date: '11/22/25', item: 'Rotini (dry pasta)', unit: 'boxes', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Canned pinto beans', unit: 'cans', quantity: 14, notes: '' },
  { box: 12, date: '11/22/25', item: 'Chex cereal', unit: 'boxes', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Overdose rescue kit', unit: 'kits', quantity: 1, notes: '' },
  { box: 12, date: '11/22/25', item: 'Military can openers', unit: 'each', quantity: 5, notes: '' },
  { box: 13, date: '11/22/25', item: 'Rice', unit: 'bags', quantity: 3, notes: '' },
  { box: 13, date: '11/22/25', item: 'Split peas', unit: 'bags', quantity: 10, notes: '' },
  { box: 13, date: '11/22/25', item: 'Chickpeas (garbanzo beans)', unit: 'bags', quantity: 3, notes: '' },
  { box: 14, date: '11/22/25', item: 'Canned pinto beans', unit: 'cans', quantity: 7, notes: '' },
  { box: 14, date: '11/22/25', item: 'Cream of chicken soup', unit: 'cans', quantity: 2, notes: '' },
  { box: 14, date: '11/22/25', item: 'Salmon (canned)', unit: 'cans', quantity: 2, notes: '' },
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
  // Get box locations for items
  const getBoxLocations = (itemName: string): number[] => {
    const normalized = itemName.toLowerCase().replace(/\s+/g, ' ').trim();
    const boxes = boxContents
      .filter(box => {
        const boxItemNormalized = box.item.toLowerCase().replace(/\s+/g, ' ').trim();
        return boxItemNormalized.includes(normalized) || normalized.includes(boxItemNormalized);
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
    <div className="min-h-screen bg-gray-50">
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
                📄 Print / Save as PDF
              </button>
              <button
                onClick={() => {
                  downloadCSV('running-totals.csv', generateRunningTotalsCSV());
                  downloadCSV('box-contents.csv', generateBoxContentsCSV());
                  downloadCSV('miscellaneous.csv', generateMiscellaneousCSV());
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📊 Download All CSVs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:px-0 print:py-0">
        {/* Print Header */}
        <div className="hidden print:block text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Center for Hope Pantry Inventory</h1>
          <p className="text-xl text-gray-700 mb-1">Food Left Over After 11/22/25 Distribution</p>
          <p className="text-lg text-gray-600">Ukiah United Methodist Church – Center for Hope</p>
        </div>

        {/* Section 1: All Items with Box Locations */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 print:shadow-none print:mb-6 print:break-after-page">
          <div className="flex justify-between items-center mb-4 print:mb-3">
            <h2 className="text-2xl font-bold text-gray-900 print:text-xl">Inventory (Sorted by Quantity: Low to High)</h2>
            <button
              onClick={() => downloadCSV('running-totals.csv', generateRunningTotalsCSV())}
              className="print:hidden px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Download CSV
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded print:text-xs">
            <p className="text-sm text-gray-700">
              <strong>Stock Level Guide:</strong> 
              <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded">Low: 1-5</span>
              <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded">Moderate: 6-10</span>
              <span className="ml-2 px-2 py-1 bg-white text-gray-800 rounded border border-gray-300">Adequate: 11+</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Category</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold print:px-2 print:py-1 print:text-xs">Quantity</th>
                  <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold print:px-2 print:py-1 print:text-xs">Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Box Location(s)</th>
                </tr>
              </thead>
              <tbody>
                {allItemsSorted.map((item, idx) => {
                  const boxes = getBoxLocations(item.item);
                  const stockColorClass = getStockColorClass(item.quantity);
                  return (
                    <tr key={idx} className={`${stockColorClass} hover:bg-gray-50 print:hover:bg-transparent`}>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">{item.category}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">{item.item}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-base font-bold print:px-2 print:py-1 print:text-sm">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm print:px-2 print:py-1 print:text-xs">{item.unit}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">
                        {boxes.length > 0 ? (
                          <span className="inline-flex gap-1 flex-wrap">
                            {boxes.map(boxNum => (
                              <span key={boxNum} className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs">
                                Box {boxNum}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">See misc.</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Box-by-Box Contents */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 print:shadow-none print:mb-6 print:break-after-page">
          <div className="flex justify-between items-center mb-4 print:mb-3">
            <h2 className="text-2xl font-bold text-gray-900 print:text-xl">Box-by-Box Contents</h2>
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
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Box #</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Unit</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Quantity</th>
                  <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold print:px-2 print:py-1 print:text-xs">Notes</th>
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
                    const bgColor = isEvenBox ? 'bg-gray-50' : 'bg-white';
                    
                    return items.map((item, itemIdx) => (
                      <tr key={`${boxNum}-${itemIdx}`} className={`${bgColor} hover:opacity-80 print:hover:opacity-100`}>
                        {itemIdx === 0 ? (
                          <>
                            <td 
                              rowSpan={items.length}
                              className="border border-gray-300 px-4 py-2 text-sm font-bold print:px-2 print:py-1 print:text-xs align-top"
                            >
                              {boxNum}
                            </td>
                            <td 
                              rowSpan={items.length}
                              className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs align-top"
                            >
                              {item.date}
                            </td>
                          </>
                        ) : null}
                        <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">{item.item}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">{item.unit}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm font-medium print:px-2 print:py-1 print:text-xs">{item.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm print:px-2 print:py-1 print:text-xs">{item.notes}</td>
                      </tr>
                    ));
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Miscellaneous & Perishables */}
        <div className="bg-white rounded-lg shadow-md p-6 print:shadow-none">
          <div className="flex justify-between items-center mb-4 print:mb-3">
            <h2 className="text-2xl font-bold text-gray-900 print:text-xl">3. Miscellaneous & Perishables</h2>
            <button
              onClick={() => downloadCSV('miscellaneous.csv', generateMiscellaneousCSV())}
              className="print:hidden px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              📊 CSV
            </button>
          </div>

          <div className="mb-6 print:mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 print:text-base">Perishable Produce</h3>
            <p className="text-sm text-gray-600 italic mb-3 print:text-xs">(May be used by Center for Hope during the week)</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {miscellaneous.perishables.map((item, idx) => (
                <li key={idx} className="text-sm print:text-xs">{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 print:text-base">Other Miscellaneous Items</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {miscellaneous.other.map((item, idx) => (
                <li key={idx} className="text-sm print:text-xs">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-center text-sm text-gray-600 mt-8 pb-4">
        <p>Generated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
