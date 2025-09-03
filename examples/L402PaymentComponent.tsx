// examples/L402PaymentComponent.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Fixed import statement

interface L402PaymentProps {
  apiEndpoint: string;
  onSuccess: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * React component for handling L402 payments
 * This demonstrates how a client would handle the payment flow
 */
export function L402Payment({
  apiEndpoint,
  onSuccess,
  onError,
}: L402PaymentProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // First attempt to access the resource
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Try to access the protected endpoint
        const response = await fetch(apiEndpoint);

        if (response.status === 402) {
          // Payment required
          const wwwAuthenticate = response.headers.get('WWW-Authenticate');

          if (wwwAuthenticate && wwwAuthenticate.startsWith('L402')) {
            // Parse challenge headers
            const invoiceMatch = wwwAuthenticate.match(/invoice="([^"]*)"/);
            const paymentHashMatch = wwwAuthenticate.match(
              /paymentHash="([^"]*)"/
            );

            if (invoiceMatch && paymentHashMatch) {
              // Store invoice and payment hash
              setInvoice(invoiceMatch[1]);
              setPaymentHash(paymentHashMatch[1]);
              setError('Payment required to access this content');
            } else {
              setError('Invalid payment challenge format');
            }
          } else {
            setError('Invalid authentication challenge');
          }
        } else if (response.ok) {
          // Already authenticated
          const data = await response.json();
          onSuccess(data);
        } else {
          setError(`Error: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        setError('Failed to fetch data');
        onError?.(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiEndpoint]);

  // Function to check if payment has been made
  const checkPaymentStatus = async () => {
    if (!paymentHash) return;

    try {
      setCheckingPayment(true);

      // In a real app, you would:
      // 1. Get the preimage from your lightning wallet after payment
      // 2. Create a token with the preimage
      // 3. Include the token in a new request

      // Here we're just checking a status endpoint
      const response = await fetch(`/api/invoice/status?id=${paymentHash}`);

      if (response.ok) {
        const { paid } = await response.json();

        if (paid) {
          // Payment confirmed, now try to access again
          // In a real app, you would construct a proper L402 token
          const dataResponse = await fetch(apiEndpoint);

          if (dataResponse.ok) {
            const data = await dataResponse.json();
            onSuccess(data);
          } else {
            setError('Payment verified but content access failed');
          }
        } else {
          setError('Payment not detected yet. Please try again after paying.');
        }
      } else {
        setError('Failed to verify payment status');
      }
    } catch (err) {
      setError('Error checking payment status');
    } finally {
      setCheckingPayment(false);
    }
  };

  // Render loading state
  if (loading) {
    return <div className="flex justify-center p-6">Loading...</div>;
  }

  // Render payment required state
  if (invoice) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 my-8">
        <h2 className="text-xl font-semibold mb-4">Payment Required</h2>
        <p className="mb-4">{error}</p>

        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <div className="mb-4 flex justify-center">
            {/* Display QR code for the invoice */}
            <QRCodeSVG value={`lightning:${invoice}`} size={200} />
          </div>

          <div className="overflow-x-auto">
            <p className="text-xs break-all font-mono bg-gray-200 p-2 rounded">
              {invoice}
            </p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => window.open(`lightning:${invoice}`)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Open Wallet
          </button>

          <button
            onClick={checkPaymentStatus}
            disabled={checkingPayment}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
          >
            {checkingPayment ? 'Checking...' : 'I Paid'}
          </button>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 my-8">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  // Should not reach here normally
  return null;
}

// Example usage in a page component:
export function ProtectedContentPage() {
  const [content, setContent] = useState<any>(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Protected Content</h1>

      {content ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">{content.message}</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      ) : (
        <L402Payment
          apiEndpoint="/api/protected/premium"
          onSuccess={setContent}
          onError={console.error}
        />
      )}
    </div>
  );
}
