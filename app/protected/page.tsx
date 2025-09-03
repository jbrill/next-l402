'use client';

import { useState, useEffect } from 'react';

export default function ProtectedPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to fetch protected data
    const fetchData = async () => {
      try {
        const response = await fetch('/api/protected/example');

        if (response.status === 402) {
          // Extract payment information from the WWW-Authenticate header
          const wwwAuthenticate = response.headers.get('WWW-Authenticate');

          if (wwwAuthenticate && wwwAuthenticate.startsWith('L402')) {
            // Parse the invoice from the header
            const invoiceMatch = wwwAuthenticate.match(/invoice="([^"]*)"/);

            if (invoiceMatch && invoiceMatch[1]) {
              setInvoice(invoiceMatch[1]);
              setError('Payment required to access this page');
            } else {
              setError('Invalid payment challenge');
            }
          } else {
            setError('Invalid authentication challenge');
          }
        } else if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setError(`Error: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            Access Required
          </h1>
          <p className="mb-4">{error}</p>

          {invoice && (
            <div className="mb-6 mt-6">
              <h2 className="text-lg font-semibold mb-2">Lightning Invoice</h2>
              <div className="bg-gray-100 p-4 rounded overflow-hidden">
                <code className="text-sm break-all">{invoice}</code>
              </div>
              <p className="mt-4 text-sm">
                Pay this invoice with your Lightning wallet, then refresh the
                page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Refresh after payment
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4 text-green-600">
            Protected Content
          </h1>
          <p className="mb-4">
            You've successfully accessed the protected page using Lightning
            Network L402 authentication!
          </p>
          <p className="text-gray-700">
            This page is protected by a Lightning Network payment requirement.
            Your access token is valid for 24 hours before another payment is
            required.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
