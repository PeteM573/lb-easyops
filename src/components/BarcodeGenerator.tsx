'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
    value: string;
}

export default function BarcodeGenerator({ value }: BarcodeGeneratorProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: 'CODE128',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 14,
                    margin: 10,
                });
            } catch (error) {
                console.error('Error generating barcode:', error);
            }
        }
    }, [value]);

    if (!value) {
        return (
            <div className="text-sm text-gray-500 italic">
                No barcode number set
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center bg-white p-4 rounded-lg border border-gray-200">
            <svg ref={svgRef} />
        </div>
    );
}
