'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';

interface BarcodePrintButtonProps {
    barcodeValue: string;
    itemName: string;
}

export default function BarcodePrintButton({ barcodeValue, itemName }: BarcodePrintButtonProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = () => {
        // Prompt user for quantity
        const quantityStr = prompt('How many labels would you like to print?', '6');
        if (!quantityStr) return;

        const quantity = parseInt(quantityStr, 10);
        if (isNaN(quantity) || quantity <= 0) {
            alert('Please enter a valid positive number.');
            return;
        }

        setIsPrinting(true);

        try {
            // Create PDF (US Letter: 8.5" x 11" = 216mm x 279mm)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter',
            });

            // Label dimensions (3 columns layout for standard label sheets)
            const pageWidth = 216;
            const pageHeight = 279;
            const margin = 10;
            const labelWidth = (pageWidth - 4 * margin) / 3; // 3 columns
            const labelHeight = 50;
            const labelsPerRow = 3;

            // Generate barcode as SVG
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, barcodeValue, {
                format: 'CODE128',
                width: 2,
                height: 60,
                displayValue: true,
                fontSize: 14,
                margin: 5,
            });
            const barcodeImage = canvas.toDataURL('image/png');

            let currentPage = 0;
            for (let i = 0; i < quantity; i++) {
                const col = i % labelsPerRow;
                const row = Math.floor((i % (labelsPerRow * Math.floor((pageHeight - 2 * margin) / labelHeight))) / labelsPerRow);

                // Add new page if needed
                if (i > 0 && i % (labelsPerRow * Math.floor((pageHeight - 2 * margin) / labelHeight)) === 0) {
                    pdf.addPage();
                    currentPage++;
                }

                const x = margin + col * (labelWidth + margin);
                const y = margin + row * labelHeight;

                // Add label border (optional)
                pdf.setDrawColor(200, 200, 200);
                pdf.rect(x, y, labelWidth, labelHeight);

                // Add item name
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text(itemName, x + labelWidth / 2, y + 8, { align: 'center', maxWidth: labelWidth - 4 });

                // Add barcode image
                const barcodeWidth = labelWidth - 10;
                const barcodeHeight = 25;
                pdf.addImage(barcodeImage, 'PNG', x + 5, y + 15, barcodeWidth, barcodeHeight);
            }

            // Save PDF
            const date = new Date().toISOString().split('T')[0];
            const filename = `Labels_${itemName.replace(/[^a-z0-9]/gi, '_')}_${date}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsPrinting(false);
        }
    };

    if (!barcodeValue) {
        return null;
    }

    return (
        <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Printer size={18} />
            {isPrinting ? 'Generating PDF...' : 'Print Labels'}
        </button>
    );
}
