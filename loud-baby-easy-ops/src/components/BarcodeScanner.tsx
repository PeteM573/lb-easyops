'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (barcode: string) => void;
    title?: string;
    subtitle?: string;
}

type ScanState = 'idle' | 'initializing' | 'scanning' | 'success' | 'error';

export default function BarcodeScanner({
    isOpen,
    onClose,
    onScanSuccess,
    title = 'Scan Barcode',
    subtitle = 'Point your camera at a barcode or QR code',
}: BarcodeScannerProps) {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [scannedCode, setScannedCode] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const readerIdRef = useRef<string>('barcode-reader');

    // Initialize scanner when modal opens
    useEffect(() => {
        let mounted = true;
        let scanner: Html5Qrcode | null = null;

        if (!isOpen) {
            return;
        }

        // Reset state when opening
        setScanState('idle');
        setErrorMessage('');
        setScannedCode('');

        const cleanup = async () => {
            if (scanner) {
                try {
                    if (scanner.isScanning) {
                        await scanner.stop();
                    }
                    scanner.clear();
                } catch (err) {
                    console.warn('Cleanup error:', err);
                }
            }
        };

        // Initialize scanner
        const startScanner = async () => {
            // Wait a bit for the DOM element to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!mounted) return;
            setScanState('initializing');

            try {
                scanner = new Html5Qrcode(readerIdRef.current);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        if (!mounted) return;

                        // Success callback
                        setScanState('success');
                        setScannedCode(decodedText);

                        // Stop scanner immediately on success
                        cleanup().then(() => {
                            scannerRef.current = null;
                        });

                        // Delay callback to show success animation
                        setTimeout(() => {
                            if (mounted) onScanSuccess(decodedText);
                        }, 800);
                    },
                    (errorMessage) => {
                        // Error callback (fires frequently, ignore)
                    }
                );

                if (mounted) setScanState('scanning');
            } catch (err: any) {
                console.error('Scanner initialization error:', err);
                if (mounted) {
                    setScanState('error');
                    if (err.name === 'NotAllowedError') {
                        setErrorMessage('Camera access denied. Please enable camera permissions in your browser settings.');
                    } else if (err.name === 'NotFoundError') {
                        setErrorMessage('No camera found on this device. Please use a device with a camera.');
                    } else {
                        setErrorMessage('Failed to start camera. Please try again.');
                    }
                }
            }
        };

        startScanner();

        // Cleanup on unmount or when dependencies change
        return () => {
            mounted = false;
            cleanup();
        };
    }, [isOpen, onScanSuccess]);

    // Handle ESC key to close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-primary/10 p-6 flex justify-between items-start border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Camera className="text-primary" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">{title}</h2>
                            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors text-gray-600 hover:text-foreground"
                        aria-label="Close scanner"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="p-6">

                    {/* Camera Preview */}
                    <div className="relative bg-gray-900 rounded-xl overflow-hidden border-2 border-border min-h-[320px] flex items-center justify-center">
                        <div id={readerIdRef.current} className="w-full" />

                        {/* Overlay States */}
                        {scanState === 'initializing' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white">
                                <Loader2 className="animate-spin mb-3" size={40} />
                                <p className="text-sm">Starting camera...</p>
                            </div>
                        )}

                        {scanState === 'success' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/90 text-white animate-in zoom-in duration-300">
                                <CheckCircle2 size={64} className="mb-3" />
                                <p className="text-lg font-bold">Scan Successful!</p>
                                <p className="text-sm mt-1 font-mono">{scannedCode}</p>
                            </div>
                        )}

                        {scanState === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/90 text-white p-6 text-center">
                                <XCircle size={48} className="mb-3" />
                                <p className="text-lg font-bold mb-2">Camera Error</p>
                                <p className="text-sm">{errorMessage}</p>
                            </div>
                        )}
                    </div>

                    {/* Instructions */}
                    {scanState === 'scanning' && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Position the barcode in the center</p>
                                <p className="text-xs mt-1">The scanner will automatically detect and read the code</p>
                            </div>
                        </div>
                    )}

                    {/* Error Actions */}
                    {scanState === 'error' && (
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 h-12 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setScanState('idle');
                                    setErrorMessage('');
                                    // Re-trigger scanner initialization
                                    const event = new Event('retry');
                                    window.dispatchEvent(event);
                                }}
                                className="flex-1 h-12 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Close Button (when scanning) */}
                    {scanState === 'scanning' && (
                        <button
                            onClick={onClose}
                            className="w-full mt-4 h-12 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
