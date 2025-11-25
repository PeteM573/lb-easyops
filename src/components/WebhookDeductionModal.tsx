// src/components/WebhookDeductionModal.tsx
'use client'; // This marks the component as a Client Component

import React from 'react';

// Define the shape of the data this component expects
interface OrderItem {
  name: string;
  quantity: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  items: OrderItem[];
}

export default function WebhookDeductionModal({ isOpen, onClose, orderNumber, items }: ModalProps) {
  // If the modal isn't supposed to be open, render nothing
  if (!isOpen) {
    return null;
  }

  return (
    // Main container with a semi-transparent background
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      {/* The actual modal panel */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sale Completed!</h2>
        <p className="text-gray-600 mb-4">
          Square Order #{orderNumber}. Please confirm the deduction of non-POS items.
        </p>
        
        {/* List of items from the order */}
        <div className="space-y-3 border-t border-b border-gray-200 py-4 my-4">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-700">{item.name} x {item.quantity}</span>
              <div className="flex space-x-2">
                <button className="px-4 py-1 text-sm font-semibold bg-green-500 text-white rounded-md hover:bg-green-600">
                  Confirm
                </button>
                <button className="px-4 py-1 text-sm font-semibold bg-red-500 text-white rounded-md hover:bg-red-600">
                  Error
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}